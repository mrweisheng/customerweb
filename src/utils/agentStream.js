// 智能导入 agent 的 SSE 客户端
// 调用 /customerapi/customers/agent/chat，解析 SSE 事件流
// 事件类型：text_delta / tool_call / pending_import / tool_result / done / error
import { getToken, clearAuth } from './auth'
import router from '../router'
import { compressImage } from './imageCompress'
const API_BASE = `${import.meta.env.VITE_API_BASE}/customerapi`
/**
 * 把用户选择/粘贴的图片文件转成 agent 需要的 { base64, preview }。
 * 后端限制 5MB，这里压到 4MB 以内兜底。preview 为 objectURL，用完需 revoke。
 */
export async function prepareAgentImage(file) {
  const { blob } = await compressImage(file, { maxSizeMB: 4, maxWidthOrHeight: 2048 })
  const base64 = await new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = String(reader.result || '')
      const idx = result.indexOf(',')
      resolve(idx >= 0 ? result.slice(idx + 1) : result)
    }
    reader.onerror = () => reject(new Error('图片读取失败'))
    reader.readAsDataURL(blob)
  })
  return { base64, preview: URL.createObjectURL(blob) }
}
/**
 * @param {Object} params
 * @param {Array}  params.messages      OpenAI 格式历史消息（不含系统提示词）
 * @param {string[]} [params.imagesBase64] 待识别的图片 base64 数组（不含 data: 前缀）
 * @param {Object} callbacks
 * @param {(delta: string) => void} [callbacks.onTextDelta]
 * @param {(toolCalls: Array) => void} [callbacks.onToolCall]
 * @param {(contacts: Array) => void} [callbacks.onPendingImport]
 * @param {(name: string, content: any) => void} [callbacks.onToolResult]
 * @param {(reason?: string) => void} [callbacks.onDone]
 * @param {(message: string) => void} [callbacks.onError]
 * @returns {Promise<void>}
 */
export async function streamAgentChat({ messages, imagesBase64 }, callbacks = {}) {
  const token = getToken()
  const images = (Array.isArray(imagesBase64) ? imagesBase64 : imagesBase64 ? [imagesBase64] : [])
    .filter((b) => typeof b === 'string' && b.length > 0)
  const res = await fetch(`${API_BASE}/customers/agent/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      messages,
      ...(images.length > 0 ? { images_base64: images } : {}),
    }),
  })
  if (!res.ok) {
    if (res.status === 401) {
      clearAuth()
      const current = router.currentRoute.value
      if (current.path !== '/login') {
        router.push({ path: '/login', query: { redirect: current.fullPath } })
      }
      throw new Error('登录已过期，请重新登录')
    }
    let msg = `请求失败 (${res.status})`
    try {
      const body = await res.json()
      if (body?.detail) msg = body.detail
    } catch (_) {}
    throw new Error(msg)
  }
  if (!res.body) throw new Error('无法读取 SSE 流')
  const reader = res.body.getReader()
  const decoder = new TextDecoder('utf-8')
  let buffer = ''
  function handleEvent(evt) {
    if (!evt || typeof evt !== 'object') return
    switch (evt.type) {
      case 'text_delta':
        callbacks.onTextDelta?.(evt.delta || '')
        break
      case 'tool_call':
        callbacks.onToolCall?.(evt.tool_calls || [])
        break
      case 'pending_import':
        callbacks.onPendingImport?.(evt.contacts || [])
        break
      case 'tool_result':
        callbacks.onToolResult?.(evt.name, evt.content)
        break
      case 'done':
        callbacks.onDone?.(evt.reason)
        break
      case 'error':
        callbacks.onError?.(evt.message || '处理失败')
        break
      default:
        // ignore
        break
    }
  }
  function flush(raw) {
    const events = raw.split('\n\n')
    for (const ev of events) {
      const line = ev.trim()
      if (!line || !line.startsWith('data:')) continue
      const payload = line.slice(5).trim()
      if (!payload) continue
      try {
        handleEvent(JSON.parse(payload))
      } catch (_) {
        // ignore malformed event
      }
    }
  }
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const parts = buffer.split('\n\n')
    buffer = parts.pop() || ''
    if (parts.length > 0) flush(parts.join('\n\n'))
  }
  buffer += decoder.decode()
  if (buffer.trim()) flush(buffer)
}
/**
 * 把用户当前累积的消息序列（含 user/assistant/tool）转换成发给后端的 messages 数组。
 * 后端会自己追加系统提示词，所以这里不需要 system 角色。
 * 注意：
 *  - recordToolCall 存的是 OpenAI 原生嵌套结构 { id, function: { name, arguments } }，
 *    这里统一从 tc.function 取值（并兼容扁平旧结构），否则 name/arguments 会丢
 *  - 只有存在对应 tool 响应的 tool_calls 才下发：刷新恢复后的历史只有 assistant
 *    消息（tool 消息不持久化），悬空的 tool_calls 会被 LLM 直接拒绝
 */
export function buildRequestMessages(messages) {
  const answered = new Set(
    messages.filter((m) => m.role === 'tool' && m.tool_call_id).map((m) => m.tool_call_id),
  )
  const out = []
  for (const m of messages) {
    if (!['user', 'assistant', 'tool'].includes(m.role)) continue
    if (m.role === 'tool') {
      out.push({ role: 'tool', tool_call_id: m.tool_call_id, content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content) })
      continue
    }
    if (m.role === 'assistant' && Array.isArray(m.tool_calls) && m.tool_calls.length > 0) {
      const toolCalls = m.tool_calls
        .filter((tc) => answered.has(tc.id))
        .map((tc) => {
          const fn = tc.function || {}
          const raw = fn.arguments ?? tc.arguments
          return {
            id: tc.id,
            type: 'function',
            function: {
              name: fn.name || tc.name,
              arguments: typeof raw === 'string' ? raw : JSON.stringify(raw || {}),
            },
          }
        })
      const content = typeof m.content === 'string' ? m.content : ''
      if (toolCalls.length === 0) {
        // tool_calls 全部悬空：降级为纯文本 assistant 消息（无文本则整条丢弃）
        if (content) out.push({ role: 'assistant', content })
        continue
      }
      out.push({ role: 'assistant', content: content || null, tool_calls: toolCalls })
      continue
    }
    out.push({ role: m.role, content: typeof m.content === 'string' ? m.content : '' })
  }
  return out
}
