<template>
  <div class="import-page">
    <!-- 顶栏：返回 + 标题（权限拦截由路由守卫完成） -->
    <div class="imp-topbar">
      <button class="imp-back" @click="goBack">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="15 18 9 12 15 6"></polyline>
        </svg>
        返回
      </button>
      <div class="imp-title">录入客户</div>
      <div class="imp-topbar-spacer"></div>
    </div>

    <!-- 录入流程主体（与 PC 工作台弹窗共用同一组件） -->
    <ImportFlow @close="goBack" />
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'
import ImportFlow from '../components/ImportFlow.vue'

const router = useRouter()

function goBack() {
  router.push('/index')
}
</script>

<style scoped>
.import-page {
  min-height: 100vh;
  background: var(--bg-primary);
  padding: 12px 14px 40px;
}
.imp-topbar {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 14px;
}
.imp-back {
  display: flex;
  align-items: center;
  gap: 3px;
  padding: 8px 12px 8px 8px;
  border-radius: 11px;
  background: var(--surface);
  border: 1px solid var(--border-glass);
  color: var(--text-secondary);
  font-size: 13px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
}
.imp-back svg { width: 14px; height: 14px; }
.imp-title {
  flex: 1;
  text-align: center;
  font-size: 16px;
  font-weight: 700;
  color: var(--text-primary);
}
.imp-topbar-spacer { width: 76px; }

@media (min-width: 1024px) {
  .import-page { padding: 28px 32px 48px; }
  .imp-topbar { margin-bottom: 18px; }
  .imp-title { font-size: 18px; }
}
</style>
