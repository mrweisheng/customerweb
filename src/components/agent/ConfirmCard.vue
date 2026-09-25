<template>
  <div class="confirm-card" :class="{ 'all-dup': allDuplicates }">
    <div class="confirm-header">
      <div class="confirm-title">识别结果 · 待确认</div>
      <div class="confirm-stats">
        <span class="stat-total">{{ contacts.length }} 位</span>
        <span v-if="newCount > 0" class="stat-new">{{ newCount }} 新</span>
        <span v-if="existingCount > 0" class="stat-exists">{{ existingCount }} 已存在</span>
      </div>
    </div>

    <div v-if="allDuplicates" class="all-dup-notice">
      识别到的 {{ contacts.length }} 位联系人均已存在，无需重复导入。是否结束当前对话？
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

    <div v-if="!allDuplicates && existingCount > 0" class="dup-hint">
      已存在的 {{ existingCount }} 位将自动跳过，不会重复入库
    </div>

    <div class="confirm-actions">
      <template v-if="allDuplicates">
        <button class="btn-cancel" :disabled="committing" @click="$emit('cancel')">继续对话</button>
        <button class="btn-end" :disabled="committing" @click="$emit('end')">✓ 结束当前对话</button>
      </template>
      <template v-else>
        <button class="btn-cancel" :disabled="committing" @click="$emit('cancel')">取消</button>
        <button class="btn-confirm" :disabled="committing" @click="$emit('confirm')">
          <span v-if="committing">导入中…</span>
          <span v-else>✓ 确认导入 {{ newCount > 0 ? newCount : '' }} 位新客户</span>
        </button>
      </template>
    </div>
  </div>
</template>
<script setup>
import { computed } from 'vue'
const props = defineProps({
  contacts: { type: Array, required: true },
  committing: { type: Boolean, default: false },
})
defineEmits(['confirm', 'cancel', 'end'])
const newCount = computed(() => props.contacts.filter((c) => !c.exists).length)
const existingCount = computed(() => props.contacts.filter((c) => c.exists).length)
const allDuplicates = computed(() => props.contacts.length > 0 && newCount.value === 0)
</script>

<style scoped>
.confirm-card {
  margin: 0 14px 12px;
  border: 1px solid var(--bloom-coral);
  border-radius: 16px;
  background: var(--bloom-surface);
  overflow: hidden;
  box-shadow: 0 8px 24px rgba(255, 107, 71, 0.10);
}
.confirm-card.all-dup {
  border-color: var(--bloom-sun);
  box-shadow: 0 8px 24px rgba(245, 201, 93, 0.18);
}
.confirm-card.all-dup .confirm-header { background: var(--bloom-sun-soft); }
.confirm-card.all-dup .confirm-title { color: var(--bloom-sun-ink); }
.all-dup-notice {
  padding: 10px 14px;
  font-size: 12.5px; font-weight: 600; line-height: 1.6;
  color: var(--bloom-sun-ink);
  background: var(--bloom-sun-soft);
  border-bottom: 1px solid var(--bloom-rule);
}
.confirm-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px 14px;
  border-bottom: 1px solid var(--bloom-rule);
  background: var(--bloom-coral-soft);
}
.confirm-title {
  font-family: "JetBrains Mono", ui-monospace, monospace;
  font-size: 11px; font-weight: 700;
  letter-spacing: 0.08em;
  color: var(--bloom-coral-ink);
  text-transform: uppercase;
}
.confirm-stats { display: flex; gap: 6px; align-items: center; }
.confirm-stats span {
  font-size: 11px; font-weight: 600;
  padding: 2px 8px; border-radius: 999px;
}
.stat-total { background: var(--bloom-coral); color: var(--bloom-ink-on-accent); }
.stat-new   { background: var(--bloom-mint); color: var(--bloom-ink-on-accent); }
.stat-exists{ background: var(--bloom-canvas-tint); color: var(--bloom-ink-3); }
.confirm-list {
  max-height: 200px; overflow-y: auto;
  padding: 4px 0;
}
.confirm-row {
  display: flex; align-items: center; gap: 8px;
  padding: 6px 14px;
  font-size: 13px;
}
.confirm-row.exists { opacity: 0.55; }
.confirm-row:not(:last-child) { border-bottom: 1px dashed var(--bloom-rule); }
.row-date {
  font-family: "JetBrains Mono", ui-monospace, monospace;
  font-size: 12px; font-weight: 600;
  color: var(--bloom-ink-3);
  background: var(--bloom-canvas-tint);
  padding: 2px 6px; border-radius: 4px;
  flex-shrink: 0;
}
.row-name {
  flex: 1; min-width: 0;
  color: var(--bloom-ink); font-weight: 600;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.row-remark { color: var(--bloom-ink-2); font-size: 12px; flex-shrink: 0; max-width: 40%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.row-tag {
  flex-shrink: 0;
  font-size: 10.5px; font-weight: 700;
  padding: 2px 7px; border-radius: 4px;
  letter-spacing: 0.3px;
}
.tag-new    { background: var(--bloom-mint-soft); color: var(--bloom-mint-ink); }
.tag-exists { background: var(--bloom-sun-soft);  color: var(--bloom-sun-ink); border: 1px solid var(--bloom-sun); }
.dup-hint {
  padding: 8px 14px;
  font-size: 12px; color: var(--bloom-ink-2);
  background: var(--bloom-canvas-tint);
  border-top: 1px dashed var(--bloom-rule);
}
.confirm-actions {
  display: flex; gap: 8px;
  padding: 10px 14px;
  border-top: 1px solid var(--bloom-rule);
  background: var(--bloom-canvas-tint);
}
.btn-cancel, .btn-confirm {
  flex: 1; padding: 9px 12px;
  border-radius: 10px; border: none;
  font-family: inherit; font-size: 13px; font-weight: 600;
  cursor: pointer;
  transition: background var(--bloom-t-fast) var(--bloom-ease-out);
}
.btn-cancel {
  background: var(--bloom-surface);
  border: 1px solid var(--bloom-rule);
  color: var(--bloom-ink-2);
}
.btn-cancel:hover { background: var(--bloom-surface-hover); }
.btn-confirm {
  background: var(--bloom-coral);
  color: var(--bloom-ink-on-accent);
}
.btn-confirm:not(:disabled):hover { background: var(--bloom-coral-ink); }
.btn-end {
  background: var(--bloom-sun);
  color: var(--bloom-sun-ink);
}
.btn-confirm:disabled, .btn-cancel:disabled, .btn-end:disabled { opacity: 0.5; cursor: not-allowed; }
@media (min-width: 1024px) {
  .confirm-card { margin: 0 20px 12px; }
}
</style>
