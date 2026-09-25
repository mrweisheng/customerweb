<template>
  <div class="tabbar" v-if="showTabbar">
    <div
      v-for="tab in tabs"
      :key="tab.path"
      class="tabbar-item"
      :class="{ active: currentRoute === tab.path }"
      @click="switchTab(tab.path)"
    >
      <div class="tabbar-icon">
        <svg v-if="tab.name === 'Workbench'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="3" width="7" height="7" rx="1.5"></rect>
          <rect x="14" y="3" width="7" height="7" rx="1.5"></rect>
          <rect x="3" y="14" width="7" height="7" rx="1.5"></rect>
          <rect x="14" y="14" width="7" height="7" rx="1.5"></rect>
        </svg>
        <svg v-else-if="tab.name === 'Statistics'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="20" x2="18" y2="10"></line>
          <line x1="12" y1="20" x2="12" y2="4"></line>
          <line x1="6" y1="20" x2="6" y2="14"></line>
        </svg>
        <svg v-else-if="tab.name === 'AiImport'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
          <polyline points="17 8 12 3 7 8"></polyline>
          <line x1="12" y1="3" x2="12" y2="15"></line>
        </svg>
        <svg v-else-if="tab.name === 'Mine'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
          <circle cx="12" cy="7" r="4"></circle>
        </svg>
      </div>
      <div class="tabbar-text">{{ tab.text }}</div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'

const router = useRouter()
const route = useRoute()

const tabs = [
  { name: 'Workbench', path: '/index', text: '工作台' },
  { name: 'AiImport', path: '/ai-import', text: '导入' },
  { name: 'Statistics', path: '/statistics', text: '统计' },
  { name: 'Mine', path: '/mine', text: '我的' },
]

const currentRoute = computed(() => route.path)
const showTabbar = computed(() => route.meta.showTabbar)

function switchTab(path) {
  if (route.path === path) return
  router.push(path)
}
</script>

<style scoped>
.tabbar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 68px;
  background: color-mix(in srgb, var(--bloom-canvas) 92%, transparent);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  border-top: 1px solid var(--bloom-rule);
  display: flex;
  align-items: center;
  justify-content: space-around;
  z-index: var(--z-nav);
  padding-bottom: env(safe-area-inset-bottom);
}

.tabbar-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
  padding: 6px 0;
  cursor: pointer;
  color: var(--bloom-ink-3);
  transition: color var(--bloom-t-fast) var(--bloom-ease-out);
}

.tabbar-item:active {
  transform: scale(0.95);
}

.tabbar-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  padding: 4px 14px;
  margin-bottom: 2px;
  transition: background var(--bloom-t-fast) var(--bloom-ease-out),
              color var(--bloom-t-fast) var(--bloom-ease-out);
}

.tabbar-icon svg {
  width: 18px;
  height: 18px;
}

.tabbar-text {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  font-family: "JetBrains Mono", ui-monospace, monospace;
}

.tabbar-item.active .tabbar-icon {
  color: var(--bloom-coral);
  background: var(--bloom-coral-soft);
}

.tabbar-item.active .tabbar-text {
  color: var(--bloom-coral);
}
</style>
