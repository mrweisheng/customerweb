<template>
  <div class="bubble" :class="['bubble-' + message.role, { streaming: message.streaming }]">
    <!-- 用户消息 -->
    <template v-if="message.role === 'user'">
      <img v-if="message.image" :src="message.image" class="bubble-image" />
      <div v-if="message.content" class="bubble-text">{{ message.content }}</div>
    </template>
    <!-- 助手消息 -->
    <template v-else-if="message.role === 'assistant'">
      <div class="bubble-avatar">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="10"></circle><path d="M8 14s1.5 2 4 2 4-2 4-2"></path><line x1="9" y1="9" x2="9.01" y2="9"></line><line x1="15" y1="9" x2="15.01" y2="9"></line></svg>
      </div>
      <div class="bubble-body">
        <div v-if="message.content" class="bubble-text">
          {{ message.content }}<span v-if="message.streaming" class="cursor">▍</span>
        </div>
        <div v-if="message.tool_calls && message.tool_calls.length > 0" class="bubble-tool-summary">
          <span class="tool-icon">🔧</span>
          <span>调用了 {{ message.tool_calls.length }} 个工具</span>
        </div>
      </div>
    </template>
  </div>
</template>
<script setup>
defineProps({ message: { type: Object, required: true } })
</script>
<style scoped>
.bubble {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  max-width: 100%;
}
.bubble-user {
  justify-content: flex-end;
}
.bubble-assistant {
  justify-content: flex-start;
}
.bubble-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: linear-gradient(135deg, #007AFF 0%, #32ADE6 100%);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 3px 8px rgba(0, 122, 255, 0.18);
}
.bubble-avatar svg { width: 18px; height: 18px; }
.bubble-body {
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-width: min(560px, 80%);
}
.bubble-text {
  background: var(--surface);
  border: 1px solid var(--border-glass);
  border-radius: 14px;
  padding: 10px 14px;
  font-size: 14px;
  line-height: 1.6;
  color: var(--text-primary);
  white-space: pre-wrap;
  word-break: break-word;
}
.bubble-user .bubble-text {
  background: var(--primary);
  color: #fff;
  border-color: transparent;
  border-bottom-right-radius: 4px;
}
.bubble-assistant .bubble-text {
  border-bottom-left-radius: 4px;
}
.bubble-image {
  max-width: 220px;
  max-height: 220px;
  border-radius: 12px;
  border: 1px solid var(--border-glass);
  display: block;
}
.bubble-tool-summary {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 999px;
  background: var(--primary-light);
  color: var(--primary);
  font-size: 11.5px;
  font-weight: 600;
  width: fit-content;
}
.tool-icon { font-size: 11px; }
.cursor {
  display: inline-block;
  margin-left: 2px;
  color: var(--primary);
  animation: blink 1s steps(1) infinite;
}
@keyframes blink {
  0%, 50% { opacity: 1; }
  51%, 100% { opacity: 0; }
}
</style>
