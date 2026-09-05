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
      <div class="sidebar-user" v-if="userInfo">
        <div class="sidebar-avatar" :style="{ background: avatarColor.bg, color: avatarColor.color }">
          {{ avatarText }}
        </div>
        <div class="sidebar-user-info">
          <div class="sidebar-user-name">{{ userInfo.nickname || userInfo.username || '用户' }}</div>
          <div class="sidebar-user-role">ID {{ userInfo.user_id }} · {{ isAdmin ? '管理员' : '已登录' }}</div>
        </div>
      </div>
      <div class="sidebar-scope" v-if="isAdmin">
        <label class="scope-label">数据范围</label>
        <select class="scope-select" :value="scopeValue" @change="onScopeChange">
          <option value="all">全部用户</option>
          <option v-for="u in users" :key="u.id" :value="u.id">{{ u.nickname }}</option>
        </select>
      </div>
      <button class="theme-toggle" @click="toggle" :title="isDark ? '切换到浅色模式' : '切换到深色模式'">
        <svg v-if="isDark" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>
        <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
        <span>{{ isDark ? '浅色模式' : '深色模式' }}</span>
      </button>
      <div class="sidebar-version">v2.0.0</div>
    </div>
  </aside>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { getUserInfo } from '../utils/auth'
import { getAvatarColor } from '../utils/constants'
import { useScope } from '../composables/useScope'
import { useTheme } from '../composables/useTheme'

const router = useRouter()
const route = useRoute()
const { scopeUserId, users, isAdmin, setScope, loadUsers } = useScope()
const { isDark, toggle } = useTheme()

const userInfo = computed(() => getUserInfo())
const avatarText = computed(() => {
  const name = userInfo.value?.nickname || userInfo.value?.username || 'U'
  return name.charAt(0).toUpperCase()
})
const avatarColor = computed(() => getAvatarColor(userInfo.value?.nickname || userInfo.value?.username))
const scopeValue = computed(() => (scopeUserId.value === null ? 'all' : scopeUserId.value))

const tabs = [
  {
    name: 'Workbench',
    path: '/index',
    text: '工作台',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="1.5"></rect><rect x="14" y="3" width="7" height="7" rx="1.5"></rect><rect x="3" y="14" width="7" height="7" rx="1.5"></rect><rect x="14" y="14" width="7" height="7" rx="1.5"></rect></svg>',
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

function onScopeChange(e) {
  const v = e.target.value
  setScope(v === 'all' ? null : Number(v))
}

onMounted(() => {
  if (isAdmin.value) loadUsers()
})
</script>

<style scoped>
.sidebar {
  position: fixed;
  top: 0;
  left: 0;
  bottom: 0;
  width: var(--sidebar-width);
  background: var(--surface);
  border-right: 1px solid var(--border-glass);
  display: flex;
  flex-direction: column;
  z-index: var(--z-sidebar);
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
  padding: 14px 16px;
  border-top: 1px solid var(--border-glass);
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.sidebar-user {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
  border-radius: 12px;
  background: var(--bg-primary);
}

.sidebar-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 700;
  flex-shrink: 0;
}

.sidebar-user-info {
  min-width: 0;
}

.sidebar-user-name {
  font-size: 12.5px;
  font-weight: 600;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sidebar-user-role {
  font-size: 10px;
  color: var(--text-tertiary);
  margin-top: 1px;
}

.sidebar-scope {
  border: 1px dashed rgba(0, 122, 255, 0.35);
  border-radius: 10px;
  padding: 8px 10px;
  background: rgba(0, 122, 255, 0.05);
}

.scope-label {
  display: block;
  font-size: 10px;
  font-weight: 700;
  color: var(--primary);
  margin-bottom: 4px;
  letter-spacing: 0.5px;
}

.scope-select {
  width: 100%;
  border: none;
  outline: none;
  background: transparent;
  font-family: inherit;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-primary);
  cursor: pointer;
  padding: 0;
}

.theme-toggle {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 10px 12px;
  margin-bottom: 12px;
  border-radius: 10px;
  border: 1px solid var(--border-glass);
  background: var(--bg-primary);
  color: var(--text-secondary);
  font-size: 13px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  transition: background 0.15s;
}
.theme-toggle svg { width: 16px; height: 16px; }
.theme-toggle:hover { background: var(--bg-hover); }

.sidebar-version {
  font-size: 11px;
  color: var(--text-tertiary);
  letter-spacing: 0.5px;
  padding: 0 4px;
}
</style>
