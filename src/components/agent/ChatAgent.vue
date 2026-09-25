<template>
  <div class="chat-agent bloom-chat">
    <div ref="scrollRef" class="chat-scroll">
      <div v-if="!hasMessages" class="chat-empty">
        <div class="chat-empty-avatar">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="10"></circle><path d="M8 14s1.5 2 4 2 4-2 4-2"></path><line x1="9" y1="9" x2="9.01" y2="9"></line><line x1="15" y1="9" x2="15.01" y2="9"></line></svg>
        </div>
        <div class="chat-empty-title">嗨，我是客资助手</div>
        <div class="chat-empty-desc">
          发我一张微信截图，我来识别联系人并准备导入。<br/>
          支持 <span class="kbd">Ctrl</span> + <span class="kbd">V</span> 粘贴或直接拖拽到输入栏。
        </div>
      </div>
      <MessageBubble
        v-for="msg in state.messages"
        :key="msg.id"
        :message="msg"
      />
      <div v-if="state.busy" class="chat-typing">
        <span class="dot"></span><span class="dot"></span><span class="dot"></span>
        <span class="chat-typing-text">{{ toolRunning ? '正在识别截图中的联系人…' : '客资助手正在思考…' }}</span>
      </div>
      <div v-if="state.error" class="chat-error">
        ⚠️ {{ state.error }}
      </div>
    </div>

    <div v-if="finalizedCountdown !== null" class="finalize-banner" role="status" aria-live="polite">
      <span class="finalize-check" aria-hidden="true">✓</span>
      <div class="finalize-text">
        <div class="finalize-title">本次任务已完成</div>
        <div class="finalize-sub">{{ finalizedCountdown }} 秒后自动清理本次对话</div>
      </div>
      <button class="finalize-btn" type="button" @click="onKeep">保留对话</button>
      <button class="finalize-btn primary" type="button" @click="onClearNow">立即清理</button>
    </div>

    <ConfirmCard
      v-if="state.pendingImport && !state.busy"
      :contacts="state.pendingImport.contacts"
      :committing="committing"
      @confirm="onConfirm"
      @cancel="onCancelImport"
      @end="onEndConversation"
    />
    <Composer
      :busy="state.busy"
      :initial-text="state.lastUserText"
      @send="onSend"
      @update-text="(t) => (state.lastUserText = t)"
    />
  </div>
</template>
<script setup>
import { ref, nextTick, onMounted, onBeforeUnmount, watch } from 'vue'
import MessageBubble from './MessageBubble.vue'
import Composer from './Composer.vue'
import ConfirmCard from './ConfirmCard.vue'
import { useChatSession } from '../../composables/useChatSession'
import { streamAgentChat, buildRequestMessages, prepareAgentImage } from '../../utils/agentStream'
import { takePendingImportFiles, setPendingImportFiles } from '../../utils/pendingImportFiles'
import api from '../../utils/api'
const {
  state, hasMessages,
  appendUserMessage, appendAssistantDelta, finishAssistant,
  setBusy, setError, setPendingImport, clearPendingImport,
  recordToolCall, recordToolResult, finalizeSession, clearSession,
  isSessionExpired, expireSession, resumeAfterExpire,
} = useChatSession()
const scrollRef = ref(null)
const committing = ref(false)
const toolRunning = ref(false)
let idleTimer = null

const FINALIZE_COUNTDOWN_SEC = 5
const finalizedCountdown = ref(null)
let countdownTimer = null
function cancelCountdown() {
  if (countdownTimer) { clearInterval(countdownTimer); countdownTimer = null }
  finalizedCountdown.value = null
}
function startFinalizeCountdown() {
  cancelCountdown()
  finalizedCountdown.value = FINALIZE_COUNTDOWN_SEC
  countdownTimer = setInterval(() => {
    if (finalizedCountdown.value === null) return
    finalizedCountdown.value -= 1
    if (finalizedCountdown.value <= 0) {
      cancelCountdown()
      clearSession()
    }
  }, 1000)
}
function onKeep() { cancelCountdown() }
function onClearNow() { cancelCountdown(); clearSession() }
function onIdleCheck() {
  if (state.busy || !hasMessages.value || !isSessionExpired()) return
  expireSession()
  setPendingImportFiles([])
  appendAssistantDelta('本次会话已超过 10 分钟未操作，识别数据已自动清理。请重新发送截图开始新一轮识别。')
  finishAssistant()
  scrollToBottom()
}
function scrollToBottom() {
  nextTick(() => {
    if (scrollRef.value) scrollRef.value.scrollTop = scrollRef.value.scrollHeight
  })
}
onMounted(() => {
  scrollToBottom()
  sendNextPendingFile()
  if (hasMessages.value && isSessionExpired()) expireSession()
  idleTimer = setInterval(onIdleCheck, 20 * 1000)
  document.addEventListener('paste', onDocPaste)
})
watch(() => state.messages.length, scrollToBottom)
watch(() => state.busy, scrollToBottom)
watch(
  () => [state.messages.length, state.lastUserText],
  ([len, text], [prevLen, prevText]) => {
    if (finalizedCountdown.value === null) return
    if (text && text !== prevText) cancelCountdown()
  },
)
function onDocPaste(e) {
  const t = e.target
  if (t && typeof t.closest === 'function' && t.closest('textarea, input')) return
  const files = e.clipboardData?.files
  if (files && files.length > 0) {
    e.preventDefault()
    void sendImageFiles(files)
  }
}
async function sendImageFiles(fileList) {
  const incoming = Array.from(fileList || []).filter((f) => f?.type?.startsWith('image/'))
  if (incoming.length === 0) return
  cancelCountdown()
  if (state.busy) {
    setPendingImportFiles([...takePendingImportFiles(), ...incoming])
    return
  }
  const queuedBefore = takePendingImportFiles()
  const all = [...incoming, ...queuedBefore]
  try {
    const images = []
    for (const file of all) {
      images.push(await prepareAgentImage(file))
    }
    const hint = images.length > 1 ? `请识别这些截图（共 ${images.length} 张）` : '请识别这张截图'
    await onSend({ text: hint, images })
  } catch (e) {
    setError(e.message || '图片处理失败')
  }
}
function sendNextPendingFile() {
  return sendImageFiles(takePendingImportFiles())
}

defineExpose({ sendImageFiles })
async function onSend({ text, images }) {
  if (state.busy) return
  if (images && images.length > 0) clearPendingImport()
  if (state.expired) resumeAfterExpire()
  setError(null)
  appendUserMessage(text, (images || []).map((img) => img.preview))
  state.lastUserText = ''
  setBusy(true)
  toolRunning.value = false
  try {
    const reqMessages = buildRequestMessages(state.messages.slice(state.contextStart))
    await streamAgentChat(
      { messages: reqMessages, imagesBase64: (images || []).map((img) => img.base64) },
      {
        onTextDelta: (delta) => { appendAssistantDelta(delta); scrollToBottom() },
        onToolCall: (calls) => {
          if (calls.length > 0) toolRunning.value = true
          for (const tc of calls) {
            if (tc?.name) recordToolCall({ id: tc.id, name: tc.name, args: tc.args })
          }
          scrollToBottom()
        },
        onPendingImport: (contacts) => {
          setPendingImport(contacts)
          scrollToBottom()
        },
        onToolResult: (name, content) => {
          const placeholder = state.messages.find((m) => m.role === 'tool' && m._pending)
          if (placeholder?.tool_call_id) recordToolResult(placeholder.tool_call_id, content)
          scrollToBottom()
        },
        onDone: () => { finishAssistant() },
        onError: (msg) => { setError(msg) },
      },
    )
  } catch (e) {
    setError(e.message || '请求失败')
  } finally {
    finishAssistant()
    toolRunning.value = false
    setBusy(false)
    scrollToBottom()
    onIdleCheck()
  }
}
async function onConfirm() {
  if (!state.pendingImport || committing.value) return
  if (state.expired) {
    clearPendingImport()
    setError('本次会话已超过 10 分钟未操作，识别数据已清理，请重新发送截图识别。')
    scrollToBottom()
    return
  }
  committing.value = true
  setError(null)
  const contacts = state.pendingImport.contacts.map((c) => ({
    date: c.date,
    name: c.name,
    remark: c.remark || null,
  }))
  try {
    const result = await api.post('/customers/batch-import', { contacts })
    clearPendingImport()
    const parts = []
    if (result.added) parts.push(`新增 ${result.added} 位`)
    if (result.updated) parts.push(`更新 ${result.updated} 位`)
    if (result.skipped) parts.push(`跳过 ${result.skipped} 位已存在`)
    appendAssistantDelta(parts.length > 0 ? `已导入：${parts.join('，')}。` : '已导入完成。')
    finishAssistant()
    finalizeSession()
    startFinalizeCountdown()
    sendNextPendingFile()
  } catch (e) {
    setError(e.message || '导入失败')
  } finally {
    committing.value = false
  }
}
function onCancelImport() {
  clearPendingImport()
  sendNextPendingFile()
}
function onEndConversation() {
  if (!state.pendingImport) return
  clearPendingImport()
  appendAssistantDelta('本轮识别的联系人均已存在，无需导入。对话已结束，发新截图可开始新一轮识别。')
  finishAssistant()
  finalizeSession()
  startFinalizeCountdown()
  setPendingImportFiles([])
  scrollToBottom()
}
onBeforeUnmount(() => {
  setPendingImportFiles([])
  if (idleTimer) clearInterval(idleTimer)
  cancelCountdown()
  document.removeEventListener('paste', onDocPaste)
})
</script>

<style scoped>
.chat-agent {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  background: var(--bloom-canvas);
  border: 1px solid var(--bloom-rule);
  border-radius: var(--bloom-r-4);
  overflow: hidden;
}
.chat-scroll {
  flex: 1;
  overflow-y: auto;
  padding: 22px 16px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.chat-empty {
  margin: 36px auto 12px;
  text-align: center;
  max-width: 360px;
  color: var(--bloom-ink-2);
}
.chat-empty-avatar {
  width: 56px; height: 56px;
  margin: 0 auto 14px;
  border-radius: 16px;
  background: conic-gradient(from 0deg, var(--bloom-coral), var(--bloom-lavender), var(--bloom-mint), var(--bloom-coral));
  color: var(--bloom-ink-on-accent);
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 8px 20px -10px rgba(255, 107, 71, 0.45);
}
.chat-empty-avatar svg { width: 28px; height: 28px; }
.chat-empty-title {
  font-family: "DM Serif Display", "Noto Serif SC", Georgia, serif;
  font-size: 22px; font-weight: 400;
  color: var(--bloom-ink); margin-bottom: 10px;
  letter-spacing: -0.01em;
}
.chat-empty-desc { font-size: 13px; line-height: 1.7; color: var(--bloom-ink-2); }
.kbd {
  display: inline-block;
  padding: 1px 6px; border-radius: 5px;
  border: 1px solid var(--bloom-rule);
  background: var(--bloom-surface-tinted);
  font-family: "JetBrains Mono", ui-monospace, monospace;
  font-size: 11px; color: var(--bloom-ink-2);
}
.chat-typing {
  align-self: flex-start;
  display: inline-flex; align-items: center; gap: 8px;
  padding: 10px 14px;
  background: var(--bloom-surface);
  border-radius: 18px;
  border: 1px solid var(--bloom-rule);
  color: var(--bloom-ink-2);
  font-size: 13px;
  border-bottom-left-radius: 4px;
}
.chat-typing .dot {
  width: 6px; height: 6px; border-radius: 50%;
  background: var(--bloom-coral);
  animation: dotPulse 1.2s ease-in-out infinite;
}
.chat-typing .dot:nth-child(2) { animation-delay: 0.15s; background: var(--bloom-sun); }
.chat-typing .dot:nth-child(3) { animation-delay: 0.3s; background: var(--bloom-mint); }
@keyframes dotPulse {
  0%, 60%, 100% { opacity: 0.3; transform: translateY(0); }
  30% { opacity: 1; transform: translateY(-2px); }
}
.chat-error {
  align-self: stretch;
  background: var(--bloom-coral-soft);
  color: var(--bloom-coral-ink);
  border: 1px solid var(--bloom-coral);
  border-radius: 12px;
  padding: 10px 14px;
  font-size: 13px;
}

.finalize-banner {
  position: sticky;
  bottom: 0;
  z-index: 5;
  display: flex; align-items: center; gap: 12px;
  margin: 6px 12px -6px;
  padding: 11px 14px;
  background: linear-gradient(135deg, var(--bloom-mint-soft), color-mix(in srgb, var(--bloom-mint) 8%, transparent));
  border: 1px solid var(--bloom-mint);
  border-radius: 14px;
  color: var(--bloom-ink);
  font-size: 13px;
  animation: finalize-in 0.28s ease-out;
}
.finalize-check {
  flex-shrink: 0;
  width: 28px; height: 28px;
  border-radius: 50%;
  background: var(--bloom-mint);
  color: var(--bloom-ink-on-accent);
  display: flex; align-items: center; justify-content: center;
  font-size: 15px; font-weight: 800;
  box-shadow: 0 4px 10px rgba(43, 176, 127, 0.35);
}
.finalize-text { flex: 1; min-width: 0; line-height: 1.4; }
.finalize-title { font-size: 13.5px; font-weight: 700; color: var(--bloom-mint-ink); }
.finalize-sub { font-size: 12px; color: var(--bloom-ink-2); margin-top: 1px; }
.finalize-btn {
  flex-shrink: 0;
  padding: 7px 13px;
  border-radius: 999px;
  background: var(--bloom-surface);
  color: var(--bloom-ink);
  border: 1px solid var(--bloom-rule);
  font-family: inherit;
  font-size: 12.5px; font-weight: 600;
  cursor: pointer;
  transition: background var(--bloom-t-fast) var(--bloom-ease-out);
}
.finalize-btn:active { transform: scale(0.96); }
.finalize-btn.primary {
  background: var(--bloom-mint);
  border-color: var(--bloom-mint);
  color: var(--bloom-ink-on-accent);
}
.finalize-btn.primary:active { filter: brightness(0.95); }
@keyframes finalize-in {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}
@media (min-width: 1024px) {
  .chat-scroll { padding: 24px 28px; gap: 16px; }
  .chat-agent { border-radius: 20px; }
}
</style>
