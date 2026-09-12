<template>
  <div class="composer">
    <div v-if="image" class="composer-image-chip">
      <img :src="image.preview" class="chip-thumb" />
      <button class="chip-remove" @click="clearImage" title="移除图片">×</button>
    </div>
    <div class="composer-row">
      <button class="composer-icon" @click="pickImage" :disabled="busy" title="选择截图">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2"></rect>
          <circle cx="8.5" cy="8.5" r="1.5"></circle>
          <polyline points="21 15 16 10 5 21"></polyline>
        </svg>
      </button>
      <input ref="fileRef" type="file" accept="image/jpeg,image/png" class="composer-file" @change="onFileChange" />
      <textarea
        ref="inputRef"
        class="composer-input"
        v-model="text"
        rows="1"
        :placeholder="busy ? '客资助手正在回复…' : '发截图或输入问题，回车发送'"
        :disabled="busy"
        @keydown.enter.exact.prevent="submit"
        @paste="onPaste"
      ></textarea>
      <button class="composer-send" :disabled="busy || (!text.trim() && !image)" @click="submit" title="发送">
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

const text = ref(props.initialText || '')
const image = ref(null) // { base64, preview, file }
const imageError = ref('')
const inputRef = ref(null)
const fileRef = ref(null)

watch(text, (t) => emit('update-text', t))
// 外部（开场白芯片 / 恢复草稿）同步文本进输入框
watch(() => props.initialText, (t) => { text.value = t || '' })

function submit() {
  if (props.busy || (!text.value.trim() && !image.value)) return
  emit('send', {
    text: text.value.trim(),
    image: image.value ? { base64: image.value.base64, preview: image.value.preview } : null,
  })
  text.value = ''
  // 发送成功：preview URL 的所有权已移交给消息气泡，不能 revoke（否则裂图）
  image.value = null
  imageError.value = ''
}

function pickImage() {
  fileRef.value?.click()
}
function onFileChange(e) {
  const file = e.target.files?.[0]
  e.target.value = ''
  if (file) setImage(file)
}
function onPaste(e) {
  const item = [...(e.clipboardData?.items || [])].find((i) => i.type.startsWith('image/'))
  if (!item) return
  e.preventDefault()
  const file = item.getAsFile()
  if (file) setImage(file)
}
// PC 端拖拽截图到输入栏直接添加
function onDrop(e) {
  dragging.value = false
  if (props.busy) return
  const file = [...(e.dataTransfer?.files || [])].find((f) => f.type?.startsWith('image/'))
  if (!file) {
    imageError.value = '请拖入图片文件（JPEG/PNG）'
    return
  }
  setImage(file)
}
// 附件就绪后把焦点拉回输入框：回车即可直接发送（图片可单独发，也可补文字一起发）
async function setImage(file) {
  imageError.value = ''
  try {
    clearImage()
    const { base64, preview } = await prepareAgentImage(file)
    image.value = { base64, preview, file }
    inputRef.value?.focus()
  } catch (err) {
    imageError.value = err.message || '图片处理失败'
  }
}
function clearImage() {
  if (image.value?.preview) URL.revokeObjectURL(image.value.preview)
  image.value = null
}
onMounted(() => {
  if (inputRef.value && !props.busy) inputRef.value.focus()
})
onBeforeUnmount(() => clearImage())
</script>
<style scoped>
.composer {
  padding: 10px 14px calc(12px + env(safe-area-inset-bottom));
  border-top: 1px solid var(--border-glass);
  background: var(--surface);
  position: relative;
}
.composer-image-chip {
  position: relative;
  display: inline-block;
  margin-bottom: 8px;
}
.chip-thumb {
  width: 64px;
  height: 64px;
  object-fit: cover;
  border-radius: 10px;
  border: 1px solid var(--border-glass);
  display: block;
}
.chip-remove {
  position: absolute;
  top: -6px;
  right: -6px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: none;
  background: rgba(0, 0, 0, 0.65);
  color: #fff;
  font-size: 14px;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}
.composer-row {
  display: flex;
  align-items: flex-end;
  gap: 8px;
}
.composer-icon {
  width: 38px;
  height: 38px;
  border-radius: 11px;
  border: 1px solid var(--border-glass);
  background: var(--bg-primary);
  color: var(--text-secondary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.composer-icon svg { width: 18px; height: 18px; }
.composer-icon:disabled { opacity: 0.5; cursor: not-allowed; }
.composer-file { display: none; }
.composer-input {
  flex: 1;
  resize: none;
  border: 1px solid var(--border-glass);
  border-radius: 12px;
  background: var(--bg-primary);
  color: var(--text-primary);
  font-family: inherit;
  font-size: 14px;
  line-height: 1.5;
  padding: 9px 12px;
  max-height: 120px;
}
.composer-input:focus { outline: none; border-color: var(--primary); }
.composer-input:disabled { opacity: 0.6; }
.composer-send {
  width: 38px;
  height: 38px;
  border-radius: 11px;
  border: none;
  background: var(--primary);
  color: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.composer-send svg { width: 17px; height: 17px; }
.composer-send:disabled { opacity: 0.4; cursor: not-allowed; }
.composer-error {
  margin-top: 6px;
  font-size: 12px;
  color: #FF3B30;
}
@media (min-width: 1024px) {
  .composer { padding: 12px 20px 16px; }
}
</style>
