<template>
  <div class="confirm-card">
    <div class="confirm-header">
      <div class="confirm-title">识别结果 · 待确认</div>
      <div class="confirm-stats">
        <span class="stat-total">{{ contacts.length }} 位</span>
        <span v-if="newCount > 0" class="stat-new">{{ newCount }} 新</span>
        <span v-if="existingCount > 0" class="stat-exists">{{ existingCount }} 已存在</span>
      </div>
    </div>
    <div class="confirm-list">
      <div v-for="(c, i) in contacts" :key="i" class="confirm-row" :class="{ exists: c.exists }">
        <span class="row-date">{{ c.date }}</span>
        <span class="row-name">{{ c.name }}</span>
        <span v-if="c.remark" class="row-remark">/{{ c.remark }}</span>
        <span class="row-tag" :class="c.exists ? 'tag-exists' : 'tag-new'">
          {{ c.exists ? '已存在' : '新' }}
        </span>
      </div>
    </div>
    <div class="confirm-actions">
      <button class="btn-cancel" :disabled="committing" @click="$emit('cancel')">取消</button>
      <button class="btn-confirm" :disabled="committing" @click="$emit('confirm')">
        <span v-if="committing">导入中…</span>
        <span v-else>✓ 确认导入 {{ newCount > 0 ? newCount : '' }} 位新客户</span>
      </button>
    </div>
  </div>
</template>
<script setup>
import { computed } from 'vue'
const props = defineProps({
  contacts: { type: Array, required: true },
  committing: { type: Boolean, default: false },
})
defineEmits(['confirm', 'cancel'])
const newCount = computed(() => props.contacts.filter((c) => !c.exists).length)
const existingCount = computed(() => props.contacts.filter((c) => c.exists).length)
</script>
<style scoped>
.confirm-card {
  margin: 0 14px 12px;
  border: 1px solid var(--primary);
  border-radius: 14px;
  background: var(--surface);
  overflow: hidden;
  box-shadow: 0 8px 24px rgba(0, 122, 255, 0.10);
}
.confirm-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  border-bottom: 1px solid var(--border-glass);
  background: var(--primary-light);
}
.confirm-title { font-size: 13px; font-weight: 700; color: var(--primary); }
.confirm-stats { display: flex; gap: 6px; align-items: center; }
.confirm-stats span {
  font-size: 11px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 999px;
}
.stat-total { background: var(--primary); color: #fff; }
.stat-new { background: #34C759; color: #fff; }
.stat-exists { background: var(--bg-primary); color: var(--text-tertiary); }
.confirm-list {
  max-height: 200px;
  overflow-y: auto;
  padding: 4px 0;
}
.confirm-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 14px;
  font-size: 13px;
}
.confirm-row.exists { opacity: 0.55; }
.confirm-row:not(:last-child) { border-bottom: 1px dashed var(--border-glass); }
.row-date {
  font-family: 'SF Mono', Menlo, monospace;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-tertiary);
  background: var(--bg-primary);
  padding: 2px 6px;
  border-radius: 4px;
  flex-shrink: 0;
}
.row-name { flex: 1; color: var(--text-primary); font-weight: 600; }
.row-remark { color: var(--text-secondary); font-size: 12px; }
.row-tag {
  flex-shrink: 0;
  font-size: 10.5px;
  font-weight: 700;
  padding: 2px 7px;
  border-radius: 4px;
  letter-spacing: 0.3px;
}
.tag-new { background: rgba(52, 199, 89, 0.15); color: #1f7a3a; }
.tag-exists { background: var(--bg-primary); color: var(--text-tertiary); }
.confirm-actions {
  display: flex;
  gap: 8px;
  padding: 10px 14px;
  border-top: 1px solid var(--border-glass);
  background: var(--bg-primary);
}
.btn-cancel, .btn-confirm {
  flex: 1;
  padding: 9px 12px;
  border-radius: 10px;
  border: none;
  font-family: inherit;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}
.btn-cancel {
  background: var(--surface);
  border: 1px solid var(--border-glass);
  color: var(--text-secondary);
}
.btn-confirm {
  background: var(--primary);
  color: #fff;
}
.btn-confirm:disabled, .btn-cancel:disabled { opacity: 0.5; cursor: not-allowed; }
@media (min-width: 1024px) {
  .confirm-card { margin: 0 80px 12px; }
}
</style>
