<template>
  <div class="confirm-mask" v-if="show" @click="$emit('cancel')">
    <div class="confirm-sheet" @click.stop>
      <div class="confirm-title">{{ title }}</div>
      <div class="confirm-desc" v-if="desc">{{ desc }}</div>
      <div class="confirm-actions">
        <button class="btn-cancel" @click="$emit('cancel')">{{ cancelText }}</button>
        <button class="btn-confirm" :class="{ danger }" @click="$emit('confirm')">{{ confirmText }}</button>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  show: { type: Boolean, default: false },
  title: { type: String, default: '提示' },
  desc: { type: String, default: '' },
  cancelText: { type: String, default: '取消' },
  confirmText: { type: String, default: '确认' },
  danger: { type: Boolean, default: false },
})
defineEmits(['cancel', 'confirm'])
</script>

<style scoped>
.confirm-mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.25);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: var(--z-overlay);
  padding: 0 40px;
  animation: fade-in 0.18s ease;
}

.confirm-sheet {
  width: 100%;
  max-width: 300px;
  background: rgba(255, 255, 255, 0.96);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-radius: 14px;
  overflow: hidden;
  animation: pop-in 0.2s ease;
}

.confirm-title {
  padding: 20px 20px 6px;
  font-size: 17px;
  font-weight: 600;
  color: var(--text-primary);
  text-align: center;
}

.confirm-desc {
  padding: 0 20px 20px;
  font-size: 13px;
  color: var(--text-secondary);
  text-align: center;
  line-height: 1.5;
}

.confirm-actions {
  display: flex;
  border-top: 1px solid rgba(0, 0, 0, 0.08);
}

.confirm-actions button {
  flex: 1;
  padding: 14px 0;
  font-size: 16px;
  font-weight: 500;
  background: none;
  border: none;
  cursor: pointer;
  transition: background 0.15s;
}

.confirm-actions button:active {
  background: rgba(0, 0, 0, 0.05);
}

.btn-cancel {
  color: var(--text-secondary);
  border-right: 1px solid rgba(0, 0, 0, 0.08);
}

.btn-confirm {
  color: var(--primary);
}

.btn-confirm.danger {
  color: var(--danger);
}

@keyframes fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes pop-in {
  from { opacity: 0; transform: scale(1.08); }
  to { opacity: 1; transform: scale(1); }
}

/* PC 适配:确认弹窗居中 + 加阴影 */
@media (min-width: 1024px) {
  .confirm-mask {
    padding: 0;
    align-items: center;
  }
  .confirm-sheet {
    max-width: 420px;
    border-radius: 14px;
    box-shadow: 0 24px 60px rgba(0, 0, 0, 0.22);
  }
}
</style>
