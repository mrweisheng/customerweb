<template>
  <div class="composer">
    <div v-if="images.length > 0" class="composer-image-chips">
      <div v-for="(img, i) in images" :key="img.preview" class="composer-image-chip">
        <img :src="img.preview" class="chip-thumb" />
        <button class="chip-remove" @click="removeImage(i)" title="移除图片">×</button>
      </div>
    </div>
    <div class="composer-row">
      <label
        class="composer-icon"
        :class="{ disabled: busy, active: tapActive }"
        title="选择截图（可多选）"
        @click="onIconClick"
        @touchstart.passive="tapActive = true"
        @touchend.passive="tapActive = false"
        @touchcancel.passive="tapActive = false"
        @mousedown="tapActive = true"
        @mouseup="tapActive = false"
        @mouseleave="tapActive = false"
      >
        <input
          ref="fileRef"
          type="file"
          accept="image/*"
          multiple
          class="composer-file"
          @change="onFileChange"
        />
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2"></rect>
          <circle cx="8.5" cy="8.5" r="1.5"></circle>
          <polyline points="21 15 16 10 5 21"></polyline>
        </svg>
      </label>
      <textarea
        ref="inputRef"
        class="composer-input"
        v-model="text"
        rows="1"
        :placeholder="busy ? '正在回复…' : '发截图或输入问题'"
        :disabled="busy"
        @keydown.enter.exact.prevent="submit"
        @paste="onPaste"
      ></textarea>
      <button class="composer-send" :disabled="busy || (!text.trim() && images.length === 0)" @click="submit" title="发送">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="22" y1="2" x2="11" y2="13"></line>
          <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
        </svg>
      </button>
    </div>
    <div v-if="imageError" class="composer-error">{{ imageError }}</div>
  </div>
</template>
<script setup>
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'
import { prepareAgentImage } from '../../utils/agentStream'

const props = defineProps({
  busy: { type: Boolean, default: false },
  initialText: { type: String, default: '' },
})
const emit = defineEmits(['send', 'update-text'])

const MAX_IMAGES = 9

const text = ref(props.initialText || '')
const images = ref([])
const imageError = ref('')
const tapActive = ref(false)
const inputRef = ref(null)
const fileRef = ref(null)

watch(text, (t) => emit('update-text', t))
watch(() => props.initialText, (t) => { text.value = t || '' })

// 兼容策略：
// 1) iOS Safari 只能通过点击包裹 <label> 让浏览器原生触发 picker；
// 2) 大量 Android 端浏览器（OEM 内核、微信/小程序 webview、较旧版本）
//    对 label 转发不可靠，必须主动 .click() 才能弹起选择器。
// 因此这里同时依赖 label 转发 + 主动 click：当 label 转发成功时浏览器已弹起
// 选择器，随后的程序化 click 会被系统静默忽略，不存在双开问题。
function onIconClick() {
  if (props.busy) return
  fileRef.value?.click()
}

function submit() {
  if (props.busy || (!text.value.trim() && images.value.length === 0)) return
  emit('send', {
    text: text.value.trim(),
    images: images.value.map((img) => ({ base64: img.base64, preview: img.preview })),
  })
  text.value = ''
  images.value = []
  imageError.value = ''
}

function onFileChange(e) { addFiles(e.target.files); e.target.value = '' }
function onPaste(e) {
  const files = [...(e.clipboardData?.items || [])]
    .filter((i) => i.type.startsWith('image/'))
    .map((i) => i.getAsFile())
    .filter(Boolean)
  if (files.length === 0) return
  e.preventDefault()
  addFiles(files)
}
async function addFiles(fileList) {
  imageError.value = ''
  const files = [...(fileList || [])]
  if (files.length === 0) return
  const room = MAX_IMAGES - images.value.length
  if (room <= 0) { imageError.value = `一次最多 ${MAX_IMAGES} 张图片`; return }
  if (files.length > room) imageError.value = `一次最多 ${MAX_IMAGES} 张图片，已保留前 ${MAX_IMAGES} 张`
  let focused = false
  for (const file of files.slice(0, room)) {
    try {
      const { base64, preview } = await prepareAgentImage(file)
      images.value.push({ base64, preview, file })
      if (!focused) { inputRef.value?.focus(); focused = true }
    } catch (err) { imageError.value = err.message || '图片处理失败' }
  }
}
function removeImage(i) {
  const img = images.value[i]
  if (img?.preview) URL.revokeObjectURL(img.preview)
  images.value.splice(i, 1)
}
onMounted(() => { if (inputRef.value && !props.busy) inputRef.value.focus() })
onBeforeUnmount(() => {
  for (const img of images.value) { if (img.preview) URL.revokeObjectURL(img.preview) }
  images.value = []
})
</script>

<style scoped>
.composer {
  padding: 12px 14px calc(12px + env(safe-area-inset-bottom));
  border-top: 1px solid var(--bloom-rule);
  background: var(--bloom-canvas);
  position: relative;
}
.composer-image-chips {
  display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 8px;
}
.composer-image-chip { position: relative; display: inline-block; }
.chip-thumb {
  width: 64px; height: 64px; object-fit: cover;
  border-radius: 10px;
  border: 1px solid var(--bloom-rule);
  display: block;
}
.chip-remove {
  position: absolute; top: -8px; right: -8px;
  width: 26px; height: 26px; border-radius: 50%;
  border: none;
  background: var(--bloom-ink);
  color: var(--bloom-canvas);
  font-size: 14px; line-height: 1;
  cursor: pointer;
  display: flex; align-items: center; justify-content: center;
}
.composer-row { display: flex; align-items: flex-end; gap: 8px; }
/* label 包裹隐藏的 file input，跨平台最稳的「点击触发选图」模式：
   iOS Safari 对 display:none 的 input 程序化 click 会忽略，
   但点击包裹它的 label 元素可以原生穿透，无需任何 JS。 */
.composer-icon {
  width: 40px; height: 40px; border-radius: 12px;
  border: 1px solid var(--bloom-rule);
  background: var(--bloom-surface);
  color: var(--bloom-ink-2);
  cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
  transition: background var(--bloom-t-fast) var(--bloom-ease-out),
              color var(--bloom-t-fast) var(--bloom-ease-out),
              transform var(--bloom-t-fast) var(--bloom-ease-out);
}
.composer-icon:hover { background: var(--bloom-surface-hover); }
.composer-icon:active { background: var(--bloom-coral-soft); color: var(--bloom-coral-ink); transform: scale(0.94); }
.composer-icon.active { background: var(--bloom-coral-soft); color: var(--bloom-coral-ink); transform: scale(0.94); }
.composer-icon svg { width: 18px; height: 18px; display: block; pointer-events: none; }
.composer-icon.disabled { opacity: 0.5; cursor: not-allowed; }
.composer-icon.disabled:active { background: var(--bloom-surface); color: var(--bloom-ink-2); transform: none; }
.composer-file {
  position: absolute;
  width: 1px; height: 1px;
  padding: 0; margin: -1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
  border: 0;
}
.composer-input {
  flex: 1; resize: none;
  border: 1px solid var(--bloom-rule);
  border-radius: 12px;
  background: var(--bloom-surface);
  color: var(--bloom-ink);
  font-family: inherit;
  font-size: 15px; line-height: 1.5;
  padding: 10px 14px;
  max-height: 120px;
  transition: border-color var(--bloom-t-fast) var(--bloom-ease-out),
              box-shadow var(--bloom-t-fast) var(--bloom-ease-out);
}
.composer-input:focus {
  outline: none;
  border-color: var(--bloom-coral);
  box-shadow: 0 0 0 3px var(--bloom-coral-soft);
}
.composer-input:disabled { opacity: 0.6; }
.composer-send {
  width: 40px; height: 40px; border-radius: 12px;
  border: none;
  background: var(--bloom-coral);
  color: var(--bloom-ink-on-accent);
  cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 4px 10px -2px rgba(255, 107, 71, 0.4);
  transition: background var(--bloom-t-fast) var(--bloom-ease-out),
              transform var(--bloom-t-fast) var(--bloom-ease-out);
}
.composer-send svg { width: 17px; height: 17px; }
.composer-send:disabled { opacity: 0.4; cursor: not-allowed; }
.composer-send:not(:disabled):hover { background: var(--bloom-coral-ink); }
.composer-send:not(:disabled):active { transform: scale(0.94); }
.composer-error { margin-top: 6px; font-size: 12px; color: var(--bloom-coral-ink); }
/* 移动端点击区提到 44px（iOS HIG 最小），缩窄内边距给键盘更多空间 */
@media (max-width: 1023px) {
  .composer { padding-bottom: 12px; }
  .composer-icon,
  .composer-send { width: 44px; height: 44px; }
}
@media (min-width: 1024px) {
  .composer { padding: 14px 20px 16px; }
}
</style>
