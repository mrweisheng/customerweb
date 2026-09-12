<template>
  <div class="chat-agent">
    <div ref="scrollRef" class="chat-scroll">
      <div v-if="!hasMessages" class="chat-empty">
        <div class="chat-empty-avatar">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="10"></circle><path d="M8 14s1.5 2 4 2 4-2 4-2"></path><line x1="9" y1="9" x2="9.01" id="9.01" y2="9"></line><line x1="15" y1="9" x2="15.01" y2="9"></line></svg>
        </div>
        <div class="chat-empty-title">嗨，我是客资助手</div>
        <div class="chat-empty-desc">
          发我一张微信截图，我来识别联系人并准备导入。<br/>
          支持 <span class="kbd">Ctrl</span> + <span class="kbd">V</span> 粘贴或直接拖拽到输入栏。
        </div>
        <div class="chat-empty-hints">
          <button class="hint-chip" @click="onHint('请识别这张截图')">📷 我有截图要识别</button>
          <button class="hint-chip" @click="onHint('怎么用？')">❓ 怎么用</button>
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
  recordToolCall, recordToolResult, finalizeSession,
} = useChatSession()
const scrollRef = ref(null)
const committing = ref(false)
const toolRunning = ref(false)
function scrollToBottom() {
  nextTick(() => {
    if (scrollRef.value) scrollRef.value.scrollTop = scrollRef.value.scrollHeight
  })
}
onMounted(() => {
  scrollToBottom()
  // 工作台「+ 选图」会把 File 暂存到 pendingImportFiles 再跳到本页：
  // 挂载时自动发出第一张，其余排队，每次导入确认后接着发下一张
  sendNextPendingFile()
})
watch(() => state.messages.length, scrollToBottom)
watch(() => state.busy, scrollToBottom)
// 从工作台队列里取出下一张图自动发送；没有则什么都不做
async function sendNextPendingFile() {
  const files = takePendingImportFiles()
  if (!files.length || state.busy) {
    if (files.length) setPendingImportFiles(files)
    return
  }
  const [next, ...rest] = files
  setPendingImportFiles(rest)
  try {
    const image = await prepareAgentImage(next)
    const hint = rest.length > 0 ? `请识别这张截图（还有 ${rest.length} 张排队中）` : '请识别这张截图'
    await onSend({ text: hint, image })
  } catch (e) {
    setError(e.message || '图片处理失败')
  }
}
// 点击开场白芯片：把文本同步到 Composer 输入框（Composer 监听 initial-text 变化）
function onHint(text) {
  state.lastUserText = text
}
async function onSend({ text, image }) {
  if (state.busy) return
  // 只在发新截图时清掉上一轮确认卡片，避免用户打字误清
  if (image) clearPendingImport()
  setError(null)
  appendUserMessage(text, image ? image.preview : null)
  state.lastUserText = ''
  setBusy(true)
  toolRunning.value = false
  try {
    // 导入完成后上下文已终结，只发送 contextStart 之后的新消息
    const reqMessages = buildRequestMessages(state.messages.slice(state.contextStart))
    await streamAgentChat(
      { messages: reqMessages, imageBase64: image?.base64 },
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
          // 工具结果按调用顺序到达，占位 tool 消息也是按调用顺序追加的：
          // 取最早的未填充占位回填，多工具调用时才不会错配 id
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
    // 流异常中断时 onDone 不会触发，这里兜底清掉 streaming 标志，
    // 防止下一轮回复被追加进卡死的旧消息
    finishAssistant()
    toolRunning.value = false
    setBusy(false)
    scrollToBottom()
  }
}
async function onConfirm() {
  if (!state.pendingImport || committing.value) return
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
    // 拼成中文短句加进会话，让用户看到结果；不走 LLM
    const parts = []
    if (result.added) parts.push(`新增 ${result.added} 位`)
    if (result.updated) parts.push(`更新 ${result.updated} 位`)
    if (result.skipped) parts.push(`跳过 ${result.skipped} 位已存在`)
    appendAssistantDelta(parts.length > 0 ? `已导入：${parts.join('，')}。` : '已导入完成。')
    finishAssistant()
    // 需求 2：导入完成后上下文自动终结——消息只留在屏幕上（刷新即消失），
    // 不会进入下一轮对话
    finalizeSession()
    // 工作台一次选了多张图：接着自动识别下一张
    sendNextPendingFile()
  } catch (e) {
    setError(e.message || '导入失败')
  } finally {
    committing.value = false
  }
}
function onCancelImport() {
  clearPendingImport()
  // 用户放弃这张，队列里若还有图继续下一张
  sendNextPendingFile()
}
// 全部重复：无需导入，用户选择结束当前对话——
// 与导入完成同款收尾（finalizeSession）：消息留在屏幕上，刷新即清空，
// 后续消息不再携带本轮上下文；排队中的截图一并丢弃
function onEndConversation() {
  if (!state.pendingImport) return
  clearPendingImport()
  appendAssistantDelta('本轮识别的联系人均已存在，无需导入。对话已结束，发新截图可开始新一轮识别。')
  finishAssistant()
  finalizeSession()
  setPendingImportFiles([])
  scrollToBottom()
}
onBeforeUnmount(() => {
  // 离开页面丢弃未处理的队列，避免下次进来自动发陈旧图片
  setPendingImportFiles([])
})
</script>
<style scoped>
.chat-agent {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}
.chat-scroll {
  flex: 1;
  overflow-y: auto;
  padding: 18px 14px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.chat-empty {
  margin: 32px auto 12px;
  text-align: center;
  max-width: 360px;
  color: var(--text-secondary);
}
.chat-empty-avatar {
  width: 56px;
  height: 56px;
  margin: 0 auto 12px;
  border-radius: 50%;
  background: linear-gradient(135deg, #007AFF 0%, #32ADE6 100%);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 6px 16px rgba(0, 122, 255, 0.22);
}
.chat-empty-avatar svg { width: 28px; height: 28px; }
.chat-empty-title { font-size: 18px; font-weight: 700; color: var(--text-primary); margin-bottom: 8px; }
.chat-empty-desc { font-size: 13px; line-height: 1.7; margin-bottom: 16px; }
.kbd {
  display: inline-block;
  padding: 1px 6px;
  border-radius: 5px;
  border: 1px solid var(--border-glass);
  background: var(--surface);
  font-family: monospace;
  font-size: 11px;
  color: var(--text-primary);
}
.chat-empty-hints { display: flex; gap: 8px; justify-content: center; flex-wrap: wrap; }
.hint-chip {
  padding: 7px 14px;
  border-radius: 999px;
  border: 1px solid var(--border-glass);
  background: var(--surface);
  font-family: inherit;
  font-size: 12.5px;
  color: var(--text-primary);
  cursor: pointer;
}
.hint-chip:hover { background: var(--primary-light); color: var(--primary); }
.chat-typing {
  align-self: flex-start;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 10px 14px;
  background: var(--surface);
  border-radius: 14px;
  border: 1px solid var(--border-glass);
  color: var(--text-secondary);
  font-size: 13px;
}
.chat-typing .dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--text-tertiary);
  animation: dotPulse 1.2s ease-in-out infinite;
}
.chat-typing .dot:nth-child(2) { animation-delay: 0.15s; }
.chat-typing .dot:nth-child(3) { animation-delay: 0.3s; }
@keyframes dotPulse {
  0%, 60%, 100% { opacity: 0.3; transform: translateY(0); }
  30% { opacity: 1; transform: translateY(-2px); }
}
.chat-error {
  align-self: stretch;
  background: rgba(255, 59, 48, 0.1);
  color: #FF3B30;
  border: 1px solid rgba(255, 59, 48, 0.25);
  border-radius: 10px;
  padding: 10px 14px;
  font-size: 13px;
}
@media (min-width: 1024px) {
  .chat-scroll { padding: 20px 32px; gap: 16px; }
}
</style>
