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
 * @param {string} [params.imageBase64] 待识别的图片 base64（不含 data: 前缀）
 * @param {Object} callbacks
 * @param {(delta: string) => void} [callbacks.onTextDelta]
 * @param {(toolCalls: Array) => void} [callbacks.onToolCall]
 * @param {(contacts: Array) => void} [callbacks.onPendingImport]
 * @param {(name: string, content: any) => void} [callbacks.onToolResult]
 * @param {(reason?: string) => void} [callbacks.onDone]
 * @param {(message: string) => void} [callbacks.onError]
 * @returns {Promise<void>}
 */
export async function streamAgentChat({ messages, imageBase64 }, callbacks = {}) {
  const token = getToken()
  const res = await fetch(`${API_BASE}/customers/agent/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      messages,
      ...(imageBase64 ? { image_base64: imageBase64 } : {}),
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
 */
export function buildRequestMessages(messages) {
  return messages
    .filter((m) => ['user', 'assistant', 'tool'].includes(m.role))
    .map((m) => {
      if (m.role === 'tool') {
        return { role: 'tool', tool_call_id: m.tool_call_id, content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content) }
      }
      if (m.role === 'assistant' && Array.isArray(m.tool_calls) && m.tool_calls.length > 0) {
        return {
          role: 'assistant',
          content: m.content || null,
          tool_calls: m.tool_calls.map((tc) => ({
            id: tc.id,
            type: 'function',
            function: { name: tc.name, arguments: typeof tc.arguments === 'string' ? tc.arguments : JSON.stringify(tc.arguments || {}) },
          })),
        }
      }
      return { role: m.role, content: typeof m.content === 'string' ? m.content : '' }
    })
}
