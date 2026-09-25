<template>
  <div
    class="page ai-import-page"
    @dragenter.prevent="onDragEnter"
    @dragover.prevent
    @dragleave.prevent="onDragLeave"
    @drop.prevent="onDrop"
  >
    <div class="ai-card bloom-card">
      <div class="ai-header">
        <div class="ai-header-left">
          <div class="ai-dot ai-dot-coral"></div>
          <div class="ai-dot ai-dot-mint"></div>
          <div class="ai-dot ai-dot-sun"></div>
          <div class="ai-title">智能导入 · 客资助手</div>
        </div>
        <button class="ai-clear" v-if="hasMessages" @click="onClear" title="清空对话">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6"></path>
          </svg>
        </button>
      </div>
      <ChatAgent ref="chatRef" />
    </div>

    <!-- 整页拖拽遮罩 -->
    <div v-if="dragging" class="drag-overlay">
      <div class="drag-overlay-tip">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="3" ry="3"></rect>
          <circle cx="8.5" cy="8.5" r="1.5"></circle>
          <polyline points="21 15 16 10 5 21"></polyline>
        </svg>
        <span>松开发送截图给客资助手</span>
      </div>
    </div>

    <div class="toast" v-if="toast.show">{{ toast.message }}</div>
  </div>
</template>
<script setup>
import { ref, computed } from 'vue'
import ChatAgent from '../components/agent/ChatAgent.vue'
import { useChatSession } from '../composables/useChatSession'
import { useToast } from '../composables/useToast'
const { hasMessages, clearSession } = useChatSession()
const { toast, showToast } = useToast()
const chatRef = ref(null)
function onClear() {
  if (confirm('清空当前对话？')) clearSession()
}

const dragDepth = ref(0)
const dragging = computed(() => dragDepth.value > 0)
function onDragEnter() { dragDepth.value += 1 }
function onDragLeave() { dragDepth.value = Math.max(0, dragDepth.value - 1) }
function onDrop(e) {
  dragDepth.value = 0
  const files = Array.from(e.dataTransfer?.files || [])
  const images = files.filter((f) => f.type?.startsWith('image/'))
  if (images.length === 0) {
    if (files.length > 0) showToast('仅支持图片文件（JPEG/PNG）')
    return
  }
  chatRef.value?.sendImageFiles(images)
}
</script>
<style scoped>
.ai-import-page {
  position: relative;
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--bloom-canvas);
}
@media (max-width: 1023px) {
  .ai-import-page {
    height: 100dvh;
    padding-bottom: calc(60px + env(safe-area-inset-bottom));
  }
}
.ai-card {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  background: var(--bloom-surface);
  border: 1px solid var(--bloom-rule);
  border-radius: 20px;
  overflow: hidden;
  box-shadow: 0 4px 20px -8px rgba(26, 22, 20, 0.08);
}
.ai-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 14px 18px;
  border-bottom: 1px solid var(--bloom-rule);
  flex-shrink: 0;
  background: var(--bloom-canvas-tint);
}
.ai-header-left { display: flex; align-items: center; gap: 8px; }
.ai-dot {
  width: 8px; height: 8px; border-radius: 999px;
}
.ai-dot-coral { background: var(--bloom-coral); }
.ai-dot-mint  { background: var(--bloom-mint); }
.ai-dot-sun   { background: var(--bloom-sun); }
.ai-title {
  font-family: "JetBrains Mono", ui-monospace, monospace;
  font-size: 13px; font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--bloom-ink);
  margin-left: 4px;
}
.ai-clear {
  width: 36px; height: 36px; border-radius: 12px;
  background: var(--bloom-surface);
  border: 1px solid var(--bloom-rule);
  color: var(--bloom-ink-2);
  cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
  transition: background var(--bloom-t-fast) var(--bloom-ease-out);
}
.ai-clear:hover { background: var(--bloom-coral-soft); color: var(--bloom-coral-ink); }
.ai-clear svg { width: 16px; height: 16px; }

.drag-overlay {
  position: absolute;
  inset: 0;
  z-index: 30;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bloom-coral-soft);
  backdrop-filter: blur(2px);
  -webkit-backdrop-filter: blur(2px);
  pointer-events: none;
}
.drag-overlay-tip {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 24px 36px;
  border: 2px dashed var(--bloom-coral);
  border-radius: 18px;
  background: var(--bloom-surface);
  color: var(--bloom-coral-ink);
  font-size: 15px;
  font-weight: 700;
  box-shadow: 0 12px 32px rgba(255, 107, 71, 0.18);
}
.drag-overlay-tip svg { width: 34px; height: 34px; }

@media (min-width: 1024px) {
  .ai-header { padding: 16px 22px; }
  .ai-title { font-size: 14px; }
}
</style>
