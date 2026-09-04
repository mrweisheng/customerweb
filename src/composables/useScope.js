// 管理员「数据范围」全局状态（原三处页面各自复制的切换用户逻辑收口于此）
// scopeUserId：null = 全部用户；数字 = 指定用户 id
// 切换入口：PC 侧边栏 / 我的页；工作台、统计页 watch 联动刷新
import { ref, computed } from 'vue'
import api from '../utils/api'
import { getUserInfo } from '../utils/auth'

const SCOPE_KEY = 'admin_scope_user_id'

function readStoredScope() {
  const v = localStorage.getItem(SCOPE_KEY)
  if (v === null || v === '') return null
  const n = Number(v)
  return Number.isNaN(n) ? null : n
}

const scopeUserId = ref(readStoredScope())
const users = ref([])

export function useScope() {
  const isAdmin = computed(() => getUserInfo()?.role === 'admin')

  function setScope(id) {
    scopeUserId.value = id ?? null
    if (id === null || id === undefined) localStorage.removeItem(SCOPE_KEY)
    else localStorage.setItem(SCOPE_KEY, String(id))
  }

  async function loadUsers() {
    if (!isAdmin.value) return
    try {
      users.value = (await api.get('/customers/users/list')) || []
    } catch (_) {
      // 用户列表加载失败：保持「全部用户」，静默降级
    }
  }

  // 请求参数：管理员且选定了具体用户时带 target_user_id（与后端 buildUserFilter 对齐）
  function scopeParams(extra = {}) {
    const params = { ...extra }
    if (isAdmin.value && scopeUserId.value) params.target_user_id = scopeUserId.value
    return params
  }

  // 登出时清理：范围重置为全部用户并清空用户列表（避免残留给下一个登录账号）
  function resetScope() {
    setScope(null)
    users.value = []
  }

  const scopeUserName = computed(() => {
    if (!scopeUserId.value) return '全部用户'
    return users.value.find((u) => u.id === scopeUserId.value)?.nickname || `用户 ${scopeUserId.value}`
  })

  return { scopeUserId, users, isAdmin, setScope, loadUsers, scopeParams, scopeUserName, resetScope }
}
