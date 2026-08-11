<template>
  <aside class="sidebar">
    <div class="sidebar-brand">
      <div class="sidebar-brand-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="22" height="22">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
          <polyline points="9 22 9 12 15 12 15 22"></polyline>
        </svg>
      </div>
      <div class="sidebar-brand-text">
        <div class="sidebar-brand-title">客户管理</div>
        <div class="sidebar-brand-sub">Customer CRM</div>
      </div>
    </div>

    <nav class="sidebar-nav">
      <div
        v-for="tab in tabs"
        :key="tab.path"
        class="sidebar-item"
        :class="{ active: currentRoute === tab.path }"
        @click="switchTab(tab.path)"
      >
        <div class="sidebar-icon" v-html="tab.icon"></div>
        <div class="sidebar-text">{{ tab.text }}</div>
        <div v-if="currentRoute === tab.path" class="sidebar-active-bar"></div>
      </div>
    </nav>

    <div class="sidebar-footer">
      <div class="sidebar-version">v1.0.0</div>
    </div>
  </aside>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'

const router = useRouter()
const route = useRoute()

const tabs = [
  {
    name: 'Home',
    path: '/index',
    text: '首页',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>',
  },
  {
    name: 'Priority',
    path: '/priority',
    text: '重点',
    icon: '<svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>',
  },
  {
    name: 'Statistics',
    path: '/statistics',
    text: '统计',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>',
  },
  {
    name: 'Mine',
    path: '/mine',
    text: '我的',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>',
  },
]

const currentRoute = computed(() => route.path)

function switchTab(path) {
  if (route.path === path) return
  router.push(path)
}
</script>

<style scoped>
.sidebar {
  position: fixed;
  top: 0;
  left: 0;
  bottom: 0;
  width: 232px;
  background: #FFFFFF;
  border-right: 1px solid var(--border-glass);
  display: flex;
  flex-direction: column;
  z-index: 100;
}

.sidebar-brand {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 22px 20px 18px;
  border-bottom: 1px solid var(--border-glass);
}

.sidebar-brand-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: linear-gradient(135deg, #007AFF 0%, #32ADE6 100%);
  color: #FFFFFF;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 10px rgba(0, 122, 255, 0.18);
}

.sidebar-brand-text {
  display: flex;
  flex-direction: column;
}

.sidebar-brand-title {
  font-size: 16px;
  font-weight: 700;
  color: var(--text-primary);
  letter-spacing: 0.5px;
}

.sidebar-brand-sub {
  font-size: 11px;
  color: var(--text-secondary);
  font-weight: 500;
  letter-spacing: 0.4px;
}

.sidebar-nav {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 16px 12px;
}

.sidebar-item {
  position: relative;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 11px 14px;
  border-radius: 10px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease;
}

.sidebar-item:hover {
  background: var(--bg-primary);
  color: var(--text-primary);
}

.sidebar-item.active {
  background: var(--primary-light);
  color: var(--primary);
  font-weight: 600;
}

.sidebar-icon {
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.sidebar-icon :deep(svg) {
  width: 100%;
  height: 100%;
}

.sidebar-text {
  font-size: 14px;
  letter-spacing: 0.3px;
}

.sidebar-active-bar {
  position: absolute;
  right: -12px;
  top: 50%;
  transform: translateY(-50%);
  width: 3px;
  height: 18px;
  background: var(--primary);
  border-radius: 2px;
}

.sidebar-footer {
  padding: 14px 20px;
  border-top: 1px solid var(--border-glass);
}

.sidebar-version {
  font-size: 11px;
  color: var(--text-tertiary);
  letter-spacing: 0.5px;
}
</style>
