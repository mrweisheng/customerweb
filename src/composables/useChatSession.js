// 智能导入对话会话状态（模块级单例，与 useToast 风格一致）
// 设计：纯前端 reactive state + localStorage 持久化，便于页面刷新后恢复
// 关键点：assistant 的 tool_calls 用 OpenAI 原生结构存储（id / type / function）
//        tool 角色的消息也独立追加，确保下一轮发给后端时仍是合法 messages 序列
import { reactive, computed, watch } from 'vue'
const STORAGE_KEY = 'ai_import_chat_session_v1'
const MAX_MESSAGES = 200
// 会话空闲过期时长：从最后一次活动（发消息/收到回复/识别结果）起算，
// 过期后数据清理、屏幕内容保留（刷新即消失），确认卡片点导入会被拦截提示
export const IDLE_EXPIRE_MS = 10 * 60 * 1000
// ── 消息工厂 ────────────────────────────────────────────
let msgId = 0
function nextId() {
  msgId += 1
  return `m_${Date.now()}_${msgId}`
}
function makeMessage(role, content, extra = {}) {
  return { id: nextId(), role, content, ts: Date.now(), ...extra }
}
// ── 初始状态（从 localStorage 恢复）────────────────────────
function loadInitial() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return null
    return {
      messages: Array.isArray(parsed.messages) ? parsed.messages.slice(-MAX_MESSAGES) : [],
      pendingImport: null, // 不恢复待确认（确认态不能跨刷新）
      lastUserText: typeof parsed.lastUserText === 'string' ? parsed.lastUserText : '',
      lastActivityAt: Number(parsed.lastActivityAt) || 0,
    }
  } catch (_) {
    return null
  }
}
const initial = loadInitial()
const state = reactive({
  messages: initial?.messages || [],
  pendingImport: null, // { contacts: [...], ts } — 待用户点击确认的列表
  busy: false, // 正在等后端 SSE 流
  error: null,
  lastUserText: initial?.lastUserText || '',
  // 最后一次会话活动时间戳（持久化），用于空闲过期判定
  lastActivityAt: initial?.lastActivityAt || 0,
  // 空闲过期已触发：数据已清理、不再持久化（刷新即消失），
  // 屏幕消息和确认卡片保留，点导入会被拦截提示
  expired: false,
  // 导入成功后上下文即清理：contextStart 之前的消息不再发给后端，
  // contextCleared = true 后不再持久化（刷新页面即全部消失）
  contextStart: 0,
  contextCleared: false,
})
// ── 持久化（只持久化文本消息 + 用户输入框文字）──────────────
watch(
  () => [state.messages, state.lastUserText],
  () => {
    // 过期或导入完成后会话已终结，不再持久化——刷新即清空
    if (state.expired || state.contextCleared) return
    try {
      const persistable = {
        messages: state.messages
          .slice(state.contextStart)
          .filter((m) => m.role === 'user' || m.role === 'assistant')
          .filter((m) => typeof m.content === 'string')
          .slice(-MAX_MESSAGES),
        lastUserText: state.lastUserText,
        lastActivityAt: state.lastActivityAt,
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(persistable))
    } catch (_) {}
  },
  { deep: true },
)
// ── 操作 ────────────────────────────────────────────────
// 每次会话活动刷新空闲计时起点
function touchActivity() {
  state.lastActivityAt = Date.now()
}
function appendUserMessage(text, imagePreviews = []) {
  touchActivity()
  const previews = Array.isArray(imagePreviews)
    ? imagePreviews.filter(Boolean)
    : imagePreviews ? [imagePreviews] : []
  const m = makeMessage('user', text || '', { images: previews })
  state.messages.push(m)
  return m
}
function ensureAssistantMessage() {
  // 找出最后一条 assistant 消息（若 busy 且没结束则复用，否则新建）
  const last = state.messages[state.messages.length - 1]
  if (last && last.role === 'assistant' && last.streaming) return last
  const msg = makeMessage('assistant', '', { streaming: true, tool_calls: [] })
  state.messages.push(msg)
  return msg
}
function appendAssistantDelta(delta) {
  touchActivity()
  const msg = ensureAssistantMessage()
  msg.content = (msg.content || '') + delta
}
// 结束一条 assistant 消息：仅在「既无文本又无 tool_calls」时移除，
// 否则即使只有 tool_calls 也保留下来（多轮对话必需）。
function finishAssistant() {
  const last = state.messages[state.messages.length - 1]
  if (last && last.role === 'assistant') {
    last.streaming = false
    const hasContent = typeof last.content === 'string' && last.content.length > 0
    const hasToolCalls = Array.isArray(last.tool_calls) && last.tool_calls.length > 0
    if (!hasContent && !hasToolCalls) {
      state.messages.pop()
    }
  }
}
function setBusy(v) {
  state.busy = !!v
}
function setError(e) {
  state.error = e
}
function setPendingImport(contacts) {
  touchActivity()
  state.pendingImport = contacts && contacts.length > 0
    ? { contacts, ts: Date.now() }
    : null
}
function clearPendingImport() {
  state.pendingImport = null
}
// 记录一条工具调用：以 OpenAI 原生结构存进 assistant 消息，
// 同时生成对应的 tool 消息（占位，待 tool_result 到达时填充）。
function recordToolCall({ id, name, args }) {
  const msg = ensureAssistantMessage()
  msg.tool_calls = msg.tool_calls || []
  msg.tool_calls.push({
    id,
    type: 'function',
    function: { name, arguments: typeof args === 'string' ? args : JSON.stringify(args || {}) },
  })
  // 占位的 tool 消息马上追加，保证下一轮 messages 序列连续
  state.messages.push(makeMessage('tool', '', { tool_call_id: id, _pending: true }))
}
// 把 tool_result 回填到刚才的占位 tool 消息
function recordToolResult(toolCallId, content) {
  // 反向查找最近的占位 tool 消息并填充
  for (let i = state.messages.length - 1; i >= 0; i--) {
    const m = state.messages[i]
    if (m.role === 'tool' && m.tool_call_id === toolCallId && m._pending) {
      m.content = typeof content === 'string' ? content : JSON.stringify(content)
      m._pending = false
      return
    }
  }
}
function clearSession() {
  state.messages = []
  state.pendingImport = null
  state.error = null
  state.lastUserText = ''
  state.lastActivityAt = 0
  state.expired = false
  state.contextStart = 0
  state.contextCleared = false
  try { localStorage.removeItem(STORAGE_KEY) } catch (_) {}
}
// 导入成功后终结会话：屏幕上消息保留（刷新即消失），
// 后续对话不带历史上下文，也不再写 localStorage
function finalizeSession() {
  state.contextStart = state.messages.length
  state.contextCleared = true
  state.pendingImport = null
  try { localStorage.removeItem(STORAGE_KEY) } catch (_) {}
}
// 会话是否已空闲超时（lastActivityAt 距今超过 IDLE_EXPIRE_MS）
function isSessionExpired() {
  return !state.expired
    && state.lastActivityAt > 0
    && Date.now() - state.lastActivityAt > IDLE_EXPIRE_MS
}
// 空闲过期：识别数据/输入草稿清理，屏幕消息保留（刷新即消失）。
// pendingImport 卡片保留在屏幕上（点导入会被拦截提示），contextStart
// 同步前移，过期后发新消息不会带上旧上下文，且只有新消息会重新持久化
function expireSession() {
  if (state.expired) return
  state.expired = true
  state.contextStart = state.messages.length
  state.lastUserText = ''
  state.error = null
  try { localStorage.removeItem(STORAGE_KEY) } catch (_) {}
}
// 过期后用户重新发消息：开启新一轮（旧消息只在屏幕上，不再进上下文）
function resumeAfterExpire() {
  state.expired = false
  touchActivity()
}
const hasMessages = computed(() => state.messages.length > 0)
export function useChatSession() {
  return {
    state,
    hasMessages,
    appendUserMessage,
    appendAssistantDelta,
    finishAssistant,
    setBusy,
    setError,
    setPendingImport,
    clearPendingImport,
    recordToolCall,
    recordToolResult,
    clearSession,
    finalizeSession,
    isSessionExpired,
    expireSession,
    resumeAfterExpire,
  }
}
