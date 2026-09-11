<template>
  <div class="ai-import-page">
    <div class="ai-header">
      <div class="ai-title">智能导入 · 客资助手</div>
      <button class="ai-clear" v-if="hasMessages" @click="onClear" title="清空对话">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="3 6 5 6 21 6"></polyline>
          <path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6"></path>
        </svg>
      </button>
    </div>
    <ChatAgent />
  </div>
</template>
<script setup>
import ChatAgent from '../components/agent/ChatAgent.vue'
import { useChatSession } from '../composables/useChatSession'
const { hasMessages, clearSession } = useChatSession()
function onClear() {
  if (confirm('清空当前对话？')) clearSession()
}
</script>
<style scoped>
.ai-import-page {
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--bg-primary);
}
/* 移动端 TabBar 固定在底部 60px，内容区让出 */
@media (max-width: 1023px) {
  .ai-import-page {
    height: 100dvh;
    padding-bottom: 60px;
    box-sizing: border-box;
  }
}
.ai-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 12px 14px;
  border-bottom: 1px solid var(--border-glass);
  background: var(--surface);
  flex-shrink: 0;
}
.ai-title {
  font-size: 16px;
  font-weight: 700;
  color: var(--text-primary);
}
.ai-clear {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: var(--bg-primary);
  border: 1px solid var(--border-glass);
  color: var(--text-secondary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.ai-clear svg { width: 16px; height: 16px; }
@media (min-width: 1024px) {
  .ai-header { padding: 16px 32px; }
  .ai-title { font-size: 18px; }
}
</style>
