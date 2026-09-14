<template>
  <div
    class="page ai-import-page"
    @dragenter.prevent="onDragEnter"
    @dragover.prevent
    @dragleave.prevent="onDragLeave"
    @drop.prevent="onDrop"
  >
    <div class="ai-card">
      <div class="ai-header">
        <div class="ai-title">智能导入 · 客资助手</div>
        <button class="ai-clear" v-if="hasMessages" @click="onClear" title="清空对话">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6"></path>
          </svg>
        </button>
      </div>
      <ChatAgent ref="chatRef" />
    </div>

    <!-- 整页拖拽遮罩：拖入页面任意位置（顶栏/气泡/输入栏均可）即高亮，松手直接识别 -->
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

// ── 整页拖拽：不必瞄准输入框，拖到页面任意位置松手即发送识别 ──
// dragenter/dragleave 在子元素间移动会成对触发，用深度计数避免高亮闪烁
const dragDepth = ref(0)
const dragging = computed(() => dragDepth.value > 0)
function onDragEnter() {
  dragDepth.value += 1
}
function onDragLeave() {
  dragDepth.value = Math.max(0, dragDepth.value - 1)
}
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
/* 布局对齐其他页面：外层 .page（移动端灰底 / PC 端统一内边距），
   内容是一张 surface 圆角卡片，聊天区在卡片内滚动 */
.ai-import-page {
  position: relative;
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
@media (max-width: 1023px) {
  .ai-import-page {
    height: 100dvh;
    /* 移动端底部 TabBar（60px + 安全区）为固定定位，给内容留出空间 */
    padding-bottom: calc(60px + env(safe-area-inset-bottom));
  }
}
.ai-card {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  background: var(--surface);
  border: 1px solid var(--border-glass);
  border-radius: 18px;
  overflow: hidden;
}
.ai-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 12px 14px;
  border-bottom: 1px solid var(--border-glass);
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

/* 整页拖拽遮罩：pointer-events:none 不拦截 drop，事件仍冒泡到页面根节点 */
.drag-overlay {
  position: absolute;
  inset: 0;
  z-index: 30;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 122, 255, 0.08);
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
  border: 2px dashed var(--primary);
  border-radius: 18px;
  background: var(--surface);
  color: var(--primary);
  font-size: 15px;
  font-weight: 700;
  box-shadow: 0 12px 32px rgba(0, 122, 255, 0.18);
}
.drag-overlay-tip svg { width: 34px; height: 34px; }

@media (min-width: 1024px) {
  .ai-header { padding: 14px 20px; }
  .ai-title { font-size: 17px; }
}
</style>
