import { getToken, clearAuth } from './auth'
import router from '../router'

const API_BASE_URL = `${import.meta.env.VITE_API_BASE}/customerapi`

// 去掉 data:image/xxx;base64, 前缀
export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('文件读取失败'))
    reader.onload = () => {
      const result = reader.result
      const idx = typeof result === 'string' ? result.indexOf(',') : -1
      resolve(idx >= 0 ? result.slice(idx + 1) : '')
    }
    reader.readAsDataURL(file)
  })
}

// AI 识别（对齐后端 SSE 流式契约）
export async function recognizeImage(file, signal) {
  const base64 = await fileToBase64(file)
  if (signal?.aborted) throw new Error('aborted')

  const res = await fetch(`${API_BASE_URL}/customers/analyze-image`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getToken() || ''}`,
    },
    body: JSON.stringify({ image_base64: base64 }),
    signal,
  })

  if (!res.ok) {
    // fetch 不走 axios 拦截器：401 手动对齐「清 token + 跳登录」的处理
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
      const errBody = await res.json()
      if (errBody?.detail) msg = errBody.detail
    } catch (_) {}
    throw new Error(msg)
  }
  if (!res.body) throw new Error('无法读取识别结果流')

  const reader = res.body.getReader()
  const decoder = new TextDecoder('utf-8')
  let buffer = ''
  let resultContacts = []

  // SSE 解析（按 \n\n 切事件，data: {...}）
  const flushEvents = (raw) => {
    const events = raw.split('\n\n')
    for (const ev of events) {
      const line = ev.trim()
      if (!line.startsWith('data:')) continue
      const payload = line.slice(5).trim()
      if (!payload) continue
      try {
        const evt = JSON.parse(payload)
        if (evt.step === 'complete' && Array.isArray(evt.contacts)) {
          resultContacts = evt.contacts
        } else if (evt.step === 'empty') {
          resultContacts = []
        } else if (evt.step === 'error') {
          throw new Error(evt.message || '识别失败')
        }
        // 其他 step (vl_ocr / text_structuring / …) 暂不展示，留作扩展
      } catch (e) {
        if (e instanceof Error && /识别失败|失败/.test(e.message)) throw e
      }
    }
  }

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const parts = buffer.split('\n\n')
    buffer = parts.pop() || ''
    if (parts.length > 0) flushEvents(parts.join('\n\n'))
  }
  buffer += decoder.decode()
  if (buffer.trim()) flushEvents(buffer)

  return resultContacts
}
