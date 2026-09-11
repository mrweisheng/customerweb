<template>
  <div class="ai-import-page">
    <div class="ai-topbar">
      <button class="ai-back" @click="goBack">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="15 18 9 12 15 6"></polyline>
        </svg>
        返回
      </button>
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
import { useRouter } from 'vue-router'
import ChatAgent from '../components/agent/ChatAgent.vue'
import { useChatSession } from '../composables/useChatSession'
const router = useRouter()
const { hasMessages, clearSession } = useChatSession()
function goBack() {
  router.push('/index')
}
function onClear() {
  if (confirm('清空当前对话？')) clearSession()
}
</script>
<style scoped>
.ai-import-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--bg-primary);
}
.ai-topbar {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  border-bottom: 1px solid var(--border-glass);
  background: var(--surface);
}
.ai-back {
  display: flex;
  align-items: center;
  gap: 3px;
  padding: 8px 12px 8px 8px;
  border-radius: 11px;
  background: var(--bg-primary);
  border: 1px solid var(--border-glass);
  color: var(--text-secondary);
  font-size: 13px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
}
.ai-back svg { width: 14px; height: 14px; }
.ai-title {
  flex: 1;
  text-align: center;
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
}
.ai-clear svg { width: 16px; height: 16px; }
@media (min-width: 1024px) {
  .ai-topbar { padding: 16px 32px; }
  .ai-title { font-size: 18px; }
}
</style>
