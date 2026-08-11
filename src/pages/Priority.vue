<template>
  <div class="page">
    <!-- 示例数据提示 -->
    <div class="demo-banner" v-if="!loggedIn">
      <div class="demo-banner-text">
        <div class="demo-banner-badge">示例</div>
        <span class="demo-banner-label">当前为示例数据</span>
      </div>
      <div class="demo-banner-btn" @click="onAccountLogin">立即登录</div>
    </div>

    <!-- 管理员用户切换 -->
    <div v-if="loggedIn && isAdmin" class="admin-select">
      <div class="select-trigger" @click="showUserPicker = true">
        <span class="select-label">查看用户:</span>
        <div class="select-value">
          {{ currentUserName }}
          <span class="select-arrow">▾</span>
        </div>
      </div>
    </div>

    <!-- 用户选择弹窗 -->
    <div class="modal-mask" v-if="showUserPicker" @click="showUserPicker = false">
      <div class="modal-sheet" @click.stop>
        <div class="modal-handle"></div>
        <div class="modal-title">切换用户</div>
        <div class="picker-list">
          <div
            v-for="(user, index) in userPickerList"
            :key="user.id"
            class="picker-item"
            :class="{ active: currentUserPickerIndex === index }"
            @click="selectUser(index)"
          >
            {{ user.label }}
          </div>
        </div>
      </div>
    </div>

    <!-- 顶部：重点总数 + 健康度 -->
    <div class="priority-top">
      <div class="hero-stat-card">
        <div>
          <div class="hero-label">重点客户</div>
          <div class="hero-value">{{ priorityCount }}</div>
          <div class="hero-sub">占比客户 {{ priorityPercent }}%</div>
        </div>
        <div class="hero-icon-wrap">
          <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24"><path d="M12 2l2.94 6.26L22 9.27l-5 4.87L18.18 21 12 17.77 5.82 21 7 14.14l-5-4.87 7.06-1.01L12 2z"/></svg>
        </div>
      </div>

      <div class="health-grid">
        <div class="health-card success">
          <div class="health-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg></div>
          <div class="health-num">{{ healthStats.healthy }}</div>
          <div class="health-label">健康<br /><span class="health-desc">7天内回访</span></div>
        </div>
        <div class="health-card warning">
          <div class="health-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg></div>
          <div class="health-num">{{ healthStats.watch }}</div>
          <div class="health-label">需关注<br /><span class="health-desc">8-30天</span></div>
        </div>
        <div class="health-card danger">
          <div class="health-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></div>
          <div class="health-num">{{ healthStats.urgent }}</div>
          <div class="health-label">紧急<br /><span class="health-desc">超30天未回访</span></div>
        </div>
      </div>
    </div>

    <!-- 搜索框 -->
    <div class="search-bar">
      <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18">
        <circle cx="11" cy="11" r="8"></circle>
        <path d="M21 21l-4.35-4.35"></path>
      </svg>
      <input
        class="search-input"
        placeholder="搜索客户名称或备注，可按住重点"
        v-model="searchQuery"
        @input="onSearchInput"
        @keyup.enter="doSearch"
      />
      <div v-if="searchQuery" class="search-clear" @click="clearSearch">×</div>
    </div>

    <!-- 重点客户卡片网格（无搜索时）-->
    <div v-if="!searchQuery" class="grid-section">
      <div class="section-title">
        <svg class="title-icon" viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
        全部重点
        <span class="section-count">{{ priorityCustomers.length }}</span>
      </div>
      <div v-if="priorityCustomers.length === 0" class="empty-box">
        <div class="empty-icon">📋</div>
        <div class="empty-text">暂无重点客户</div>
        <div class="empty-desc">在上方搜索框搜索客户后标住</div>
      </div>
      <div v-else class="priority-grid">
        <div
          v-for="customer in priorityCustomers"
          :key="customer.id"
          class="priority-card"
          :class="customer.visitStatus.class"
          @click="onCardTap(customer)"
        >
          <div class="card-head">
            <span v-if="customer.lead_date_short" class="card-no">{{ customer.lead_date_short }}</span>
            <span class="card-name">{{ customer.customer_name }}</span>
            <span
              class="copy-btn"
              :class="{ copied: copiedId === customer.id }"
              @click.stop="copyName(customer)"
            >
              <svg v-if="copiedId !== customer.id" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
              </svg>
              <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </span>
          </div>
          <div class="card-remark" :class="{ placeholder: !customer.remark }">
            <svg class="remark-flag" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path>
              <line x1="4" y1="22" x2="4" y2="15"></line>
            </svg>
            <span class="remark-text">{{ customer.remark || '暂无备注' }}</span>
          </div>
          <div class="card-foot">
            <span class="visit-dot"></span>
            <span class="visit-text">{{ customer.visitStatus.text }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 搜索结果（有搜索词时）-->
    <div v-if="searchQuery" class="results-section">
      <div v-if="searchResults.length > 0" class="results-header">
        找到 {{ searchResults.length }} 条结果
      </div>
      <div
        v-for="customer in searchResults"
        :key="customer.id"
        class="result-card"
        @click="onResultTap(customer)"
      >
        <div class="result-avatar" :style="{ background: customer.avatarColor.bg, color: customer.avatarColor.color }">
          {{ customer.customer_name?.charAt(0) || '?' }}
        </div>
        <div class="result-info">
          <div class="result-name">
            {{ customer.customer_name }}
            <span v-if="customer.is_priority" class="priority-badge">重点</span>
            <span class="result-date">{{ customer.lead_date_short }}</span>
          </div>
          <div class="result-meta">{{ customer.remark || '—' }}</div>
        </div>
        <div class="result-visit" v-if="customer.is_priority && customer.visitStatus" :class="customer.visitStatus.class">
          {{ customer.visitStatus.text }}
        </div>
        <span class="action-arrow">›</span>
      </div>
      <div v-if="searchResults.length === 0 && hasSearched" class="empty-box">
        <div class="empty-icon">🔍</div>
        <div class="empty-text">未找到相关客户</div>
        <div class="empty-desc">试试其他关键字</div>
      </div>
    </div>

    <!-- 回访 / 标注弹窗 -->
    <div class="modal-mask" v-if="showVisitModal" @click="closeVisitModal">
      <div class="modal-sheet" @click.stop>
        <div class="modal-handle"></div>
        <div class="modal-title">{{ visitModalMode === 'visit' ? '记录回访' : '标注重点客户' }}</div>
        <div class="visit-name">{{ visitCustomerName }}</div>
        <div v-if="visitModalMode === 'visit'" class="visit-info">
          <div v-if="visitLastRemark" class="visit-remark">上次备注: {{ visitLastRemark }}</div>
          <div class="visit-days">{{ visitDaysAgo }}</div>
        </div>
        <textarea
          class="visit-input"
          :placeholder="visitModalMode === 'visit' ? '请输入回访记录...' : '请输入备注原因...'"
          v-model="visitRemark"
        ></textarea>
        <div class="modal-btns">
          <button v-if="visitModalMode === 'visit'" class="btn-danger" @click="removePriority">取消重点</button>
          <button class="btn-primary" @click="visitModalMode === 'visit' ? saveVisit() : confirmAddPriority()">
            {{ visitModalMode === 'visit' ? '保存记录' : '确认标注' }}
          </button>
        </div>
      </div>
    </div>

    <ConfirmDialog
      :show="showConfirmRemove"
      title="确认移除"
      :desc="`确认将「${visitCustomerName}」从重点客户中移除？`"
      cancel-text="再想想"
      confirm-text="确认移除"
      danger
      @cancel="cancelConfirmRemove"
      @confirm="doRemovePriority"
    />

    <div class="toast" v-if="toast.show">{{ toast.message }}</div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import api from '../utils/api'
import { isLoggedIn as checkLoggedIn, getUserInfo } from '../utils/auth'
import { AVATAR_COLORS, calcVisitStatus } from '../utils/constants'
import ConfirmDialog from '../components/ConfirmDialog.vue'

const router = useRouter()

const loggedIn = ref(false)
const isAdmin = ref(false)
const currentUserId = ref(null)

const priorityCount = ref(0)
const totalCount = ref(0)
const priorityCustomers = ref([])

const searchQuery = ref('')
const searchResults = ref([])
const hasSearched = ref(false)

const showUserPicker = ref(false)
const currentUserPickerIndex = ref(0)
const userPickerList = ref([{ id: 0, label: '全部用户', value: null }])

const showVisitModal = ref(false)
const visitModalMode = ref('visit')
const visitCustomerId = ref(null)
const visitCustomerName = ref('')
const visitRemark = ref('')
const visitLastRemark = ref('')
const visitDaysAgo = ref('')

const toast = reactive({ show: false, message: '' })
const copiedId = ref(null)
const showConfirmRemove = ref(false)

let searchTimer = null

const currentUserName = computed(() => {
  return userPickerList.value[currentUserPickerIndex.value]?.label || '全部用户'
})

const priorityPercent = computed(() => {
  if (!totalCount.value) return '0.0'
  return ((priorityCount.value / totalCount.value) * 100).toFixed(1)
})

// 健康度分布：直接复用 calcVisitStatus 的 class 判定
const healthStats = computed(() => {
  let healthy = 0, watch = 0, urgent = 0
  priorityCustomers.value.forEach((c) => {
    const cls = c.visitStatus?.class || calcVisitStatus(c.last_visit_at).class
    if (cls === 'success') healthy++
    else if (cls === 'warning') watch++
    else urgent++
  })
  return { healthy, watch, urgent }
})

function showToast(message, duration = 2000) {
  toast.message = message
  toast.show = true
  setTimeout(() => { toast.show = false }, duration)
}

function onAccountLogin() {
  router.push('/login')
}

// ---------- 管理员用户切换（复用 Statistics 模式）----------
async function loadUsersList() {
  try {
    const res = await api.get('/customers/users/list')
    const users = res || []
    const pickerList = [{ id: 0, label: '全部用户', value: null }]
    users.forEach((user) => {
      pickerList.push({ id: user.id, label: user.nickname, value: user.id })
    })
    userPickerList.value = pickerList
  } catch (e) {
    console.error('加载用户列表失败', e)
  }
}

function selectUser(index) {
  currentUserPickerIndex.value = index
  currentUserId.value = userPickerList.value[index].value
  showUserPicker.value = false
  loadAllData()
}

function targetUserIdParams() {
  const params = {}
  if (isAdmin.value && currentUserId.value) params.target_user_id = currentUserId.value
  return params
}

// ---------- 数据加载 ----------
async function loadAllData() {
  try {
    const [statsRes, listRes] = await Promise.all([
      api.get('/customers/stats', { params: targetUserIdParams() }),
      api.get('/customers/priority', { params: targetUserIdParams() }),
    ])
    priorityCount.value = statsRes.priority_count || 0
    totalCount.value = statsRes.total_count || 0
    priorityCustomers.value = (listRes || []).map((c, idx) => ({
      ...c,
      lead_date_short: c.lead_date ? c.lead_date.slice(5).replace('-', '') : '',
      avatarColor: AVATAR_COLORS[idx % AVATAR_COLORS.length],
      visitStatus: calcVisitStatus(c.last_visit_at),
    }))
  } catch (e) {
    showToast('加载失败')
  }
}

function loadMockData() {
  priorityCount.value = 28
  totalCount.value = 1286
  priorityCustomers.value = [
    { id: 1, lead_date_short: '0901', customer_name: 'jack', remark: '大客户', visitStatus: { text: '3天前', class: 'success' } },
    { id: 2, lead_date_short: '0905', customer_name: 'mary', remark: '团购单', visitStatus: { text: '还未回访', class: 'danger' } },
    { id: 3, lead_date_short: '0812', customer_name: 'tom', remark: 'VIP', visitStatus: { text: '12天前', class: 'warning' } },
    { id: 4, lead_date_short: '0730', customer_name: 'lucy', remark: '', visitStatus: { text: '5天前', class: 'success' } },
  ]
}

// ---------- 搜索（复用 Search 模式）----------
function onSearchInput() {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    if (searchQuery.value.trim()) {
      doSearch()
    } else {
      clearSearch()
    }
  }, 300)
}

async function doSearch() {
  const query = searchQuery.value.trim()
  if (!query) return
  try {
    const res = await api.get('/customers/search', { params: { keyword: query } })
    searchResults.value = (res || []).map((c, idx) => ({
      ...c,
      lead_date_short: c.lead_date ? c.lead_date.slice(5).replace('-', '') : '',
      avatarColor: AVATAR_COLORS[idx % AVATAR_COLORS.length],
      visitStatus: calcVisitStatus(c.last_visit_at),
    }))
    hasSearched.value = true
  } catch (e) {
    showToast('搜索失败')
  }
}

function clearSearch() {
  searchQuery.value = ''
  searchResults.value = []
  hasSearched.value = false
}

// ---------- 卡片 / 结果点击 → 回访弹窗（复用 Statistics/Search 交互）----------
function openVisitForExisting(customer) {
  const daysAgo = customer.last_visit_at
    ? Math.floor((Date.now() - new Date(customer.last_visit_at).getTime()) / 86400000)
    : null
  visitModalMode.value = 'visit'
  visitCustomerId.value = customer.id
  visitCustomerName.value = `${customer.lead_date_short}/${customer.customer_name}`
  visitLastRemark.value = customer.remark || ''
  visitRemark.value = ''
  visitDaysAgo.value = daysAgo === null ? '还未回访' : `${daysAgo}天前`
  showVisitModal.value = true
}

function openVisitForNew(customer) {
  visitModalMode.value = 'add-priority'
  visitCustomerId.value = customer.id
  visitCustomerName.value = `${customer.lead_date_short}/${customer.customer_name}`
  visitRemark.value = ''
  visitLastRemark.value = ''
  visitDaysAgo.value = ''
  showVisitModal.value = true
}

function copyToClipboard(text) {
  if (navigator.clipboard && window.isSecureContext) {
    return navigator.clipboard.writeText(text)
  }
  return new Promise((resolve, reject) => {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    try {
      document.execCommand('copy')
      resolve()
    } catch (e) {
      reject(e)
    }
    document.body.removeChild(ta)
  })
}

async function copyName(customer) {
  if (!loggedIn.value) { showToast('请先登录'); return }
  const text = `${customer.lead_date_short}/${customer.customer_name}`
  try {
    await copyToClipboard(text)
    showToast(`已复制 ${text}`)
    copiedId.value = customer.id
    setTimeout(() => {
      if (copiedId.value === customer.id) copiedId.value = null
    }, 1500)
  } catch (e) {
    showToast('复制失败，请手动选取')
  }
}

function onCardTap(customer) {
  if (!loggedIn.value) { showToast('请先登录'); return }
  if (isAdmin.value) return
  openVisitForExisting(customer)
}

function onResultTap(customer) {
  if (!loggedIn.value) { showToast('请先登录'); return }
  if (isAdmin.value) return
  if (customer.is_priority) {
    openVisitForExisting(customer)
  } else {
    openVisitForNew(customer)
  }
}

function closeVisitModal() {
  showVisitModal.value = false
  visitModalMode.value = 'visit'
  visitCustomerId.value = null
  visitRemark.value = ''
  visitLastRemark.value = ''
}

async function saveVisit() {
  if (!visitRemark.value.trim()) { showToast('请填写回访记录'); return }
  try {
    await api.put(`/customers/${visitCustomerId.value}/visit`, { remark: visitRemark.value })
    showToast('回访已记录')
    closeVisitModal()
    loadAllData()
  } catch (e) { showToast('保存失败') }
}

function removePriority() {
  if (!visitRemark.value.trim()) { showToast('请填写取消原因'); return }
  showVisitModal.value = false
  showConfirmRemove.value = true
}

function cancelConfirmRemove() {
  showConfirmRemove.value = false
  showVisitModal.value = true
}

async function doRemovePriority() {
  showConfirmRemove.value = false
  try {
    await api.put(`/customers/${visitCustomerId.value}/priority`, { is_priority: false, remark: visitRemark.value })
    showToast('已移除')
    closeVisitModal()
    loadAllData()
  } catch (e) { showToast('操作失败') }
}

async function confirmAddPriority() {
  if (!visitRemark.value.trim()) { showToast('请填写备注'); return }
  try {
    await api.put(`/customers/${visitCustomerId.value}/priority`, { is_priority: true, remark: visitRemark.value })
    showToast('已标为重点')
    closeVisitModal()
    loadAllData()
    doSearch()
  } catch (e) { showToast('操作失败') }
}

onMounted(() => {
  loggedIn.value = checkLoggedIn()
  if (loggedIn.value) {
    const userInfo = getUserInfo()
    isAdmin.value = userInfo?.role === 'admin'
    currentUserId.value = userInfo?.role === 'admin' ? null : userInfo?.user_id
    if (isAdmin.value) {
      loadUsersList()
    }
    loadAllData()
  } else {
    loadMockData()
  }
})
</script>

<style scoped>
.page {
  padding: 0 14px 80px;
  min-height: 100vh;
  background: var(--bg-primary);
  overflow-x: hidden;
}

/* Demo Banner */
.demo-banner {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  background: linear-gradient(135deg, #FF9500, #FF6B00);
  padding: 10px 14px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.demo-banner-text { display: flex; align-items: center; gap: 8px; }
.demo-banner-badge { background: rgba(255,255,255,0.3); padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: 600; color: white; }
.demo-banner-label { font-size: 13px; color: white; font-weight: 500; }
.demo-banner-btn { background: white; color: #FF9500; padding: 6px 14px; border-radius: 16px; font-size: 13px; font-weight: 600; cursor: pointer; }

/* Admin Select */
.admin-select { width: 100%; margin-bottom: 6px; padding-top: 14px; }
.select-trigger { display: flex; align-items: center; justify-content: space-between; padding: 10px 12px; background: rgba(255,255,255,0.72); border: 1px solid rgba(0,0,0,0.06); border-radius: 12px; }
.select-label { font-size: 13px; color: var(--text-secondary); font-weight: 500; }
.select-value { display: flex; align-items: center; gap: 4px; font-size: 14px; font-weight: 600; color: var(--primary); }
.select-arrow { font-size: 10px; }

/* Modal */
.modal-mask { position: fixed; inset: 0; background: rgba(0,0,0,0.25); display: flex; align-items: flex-end; justify-content: center; z-index: 1000; }
.modal-sheet { width: 100%; background: #fff; border-radius: 16px 16px 0 0; padding: 14px; padding-bottom: calc(14px + env(safe-area-inset-bottom)); max-height: 85vh; overflow-y: auto; }
.modal-handle { width: 32px; height: 4px; border-radius: 2px; background: rgba(0,0,0,0.12); margin: 0 auto 12px; }
.modal-title { font-size: 16px; font-weight: 600; margin-bottom: 12px; color: var(--text-primary); }
.picker-list { max-height: 300px; overflow-y: auto; }
.picker-item { padding: 14px 16px; font-size: 15px; color: var(--text-primary); border-bottom: 1px solid var(--border-glass); cursor: pointer; }
.picker-item:active { background: var(--bg-primary); }
.picker-item.active { color: var(--primary); font-weight: 600; }

/* 顶部：重点总数 + 健康度 */
.priority-top {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 14px;
  margin-bottom: 14px;
}

/* Hero Stat */
.hero-stat-card {
  background: linear-gradient(145deg, #ffffff 0%, #fffcf8 100%);
  border-radius: 16px;
  padding: 16px;
  box-shadow: 0 4px 16px rgba(255, 149, 0, 0.06), 0 2px 4px rgba(0, 0, 0, 0.02);
  display: flex;
  justify-content: space-between;
  align-items: center;
  border: 1px solid rgba(255, 149, 0, 0.15);
}
.hero-label { font-size: 12px; color: rgba(0, 0, 0, 0.6); font-weight: 600; margin-bottom: 4px; }
.hero-value { font-size: 36px; font-weight: 800; background: linear-gradient(135deg, #FF9500 0%, #FF5E3A 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; line-height: 1; }
.hero-sub { font-size: 12px; color: rgba(0, 0, 0, 0.45); font-weight: 500; margin-top: 4px; }
.hero-icon-wrap { width: 44px; height: 44px; border-radius: 12px; background: linear-gradient(135deg, #FF9500 0%, #FF6B00 100%); color: white; display: flex; align-items: center; justify-content: center; font-size: 20px; box-shadow: 0 4px 12px rgba(255, 149, 0, 0.3); }

/* Health Grid */
.health-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }

.health-card { border-radius: 14px; padding: 12px 10px; display: flex; flex-direction: column; align-items: center; border: 1px solid transparent; }
.health-card.success { background: rgba(52, 199, 89, 0.08); border-color: rgba(52, 199, 89, 0.15); }
.health-card.warning { background: rgba(255, 149, 0, 0.08); border-color: rgba(255, 149, 0, 0.15); }
.health-card.danger { background: rgba(255, 59, 48, 0.08); border-color: rgba(255, 59, 48, 0.15); }
.health-num { font-size: 24px; font-weight: 800; line-height: 1; }
.health-card.success .health-num { color: #34C759; }
.health-card.warning .health-num { color: #FF9500; }
.health-card.danger .health-num { color: #FF3B30; }
.health-label { font-size: 11px; font-weight: 600; color: var(--text-primary); text-align: center; margin-top: 6px; line-height: 1.3; }
.health-desc { font-size: 9px; font-weight: 400; color: var(--text-secondary); }

/* 健康度圆形图标（移动 + PC 通用） */
.health-icon { width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-bottom: 6px; }
.health-icon svg { width: 16px; height: 16px; }
.health-card.success .health-icon { background: rgba(52,199,89,0.15); color: #34C759; }
.health-card.warning .health-icon { background: rgba(255,149,0,0.15); color: #FF9500; }
.health-card.danger .health-icon { background: rgba(255,59,48,0.15); color: #FF3B30; }
.title-icon { width: 16px; height: 16px; margin-right: 4px; flex-shrink: 0; }

/* Search Bar */
.search-bar { position: relative; display: flex; align-items: center; margin-bottom: 14px; }
.search-icon { position: absolute; left: 12px; color: var(--text-secondary); pointer-events: none; }
.search-input { width: 100%; padding: 10px 36px 10px 38px; background: white; border: 1px solid var(--border-glass); border-radius: 12px; font-size: 14px; color: var(--text-primary); }
.search-input:focus { border-color: var(--primary); outline: none; }
.search-clear { position: absolute; right: 10px; width: 20px; height: 20px; border-radius: 50%; background: rgba(0, 0, 0, 0.08); display: flex; align-items: center; justify-content: center; font-size: 10px; color: var(--text-secondary); cursor: pointer; }

/* Section */
.section-title { font-size: 14px; font-weight: 600; color: var(--text-primary); margin-bottom: 10px; display: flex; align-items: center; gap: 6px; }
.section-count { font-size: 12px; font-weight: 500; color: var(--text-secondary); }

.empty-box { text-align: center; padding: 40px 20px; }
.empty-icon { font-size: 40px; margin-bottom: 10px; }
.empty-text { font-size: 15px; font-weight: 600; color: var(--text-primary); margin-bottom: 4px; }
.empty-desc { font-size: 12px; color: var(--text-secondary); }

/* Priority Card Grid — 卡片设计 */
.priority-grid { column-count: 2; column-gap: 10px; }
.priority-card {
  position: relative;
  background: #fff;
  border: 1px solid rgba(0, 0, 0, 0.05);
  border-radius: 16px;
  padding: 13px 12px 11px 16px;
  margin-bottom: 10px;
  cursor: pointer;
  overflow: hidden;
  break-inside: avoid;
  -webkit-column-break-inside: avoid;
  page-break-inside: avoid;
  box-shadow: 0 1px 2px rgba(20, 20, 20, 0.04), 0 5px 14px rgba(20, 20, 20, 0.05);
  transition: transform 0.18s ease, box-shadow 0.18s ease, background 0.18s ease;
}
/* 左侧健康度色条 */
.priority-card::before {
  content: '';
  position: absolute;
  left: 0; top: 0; bottom: 0;
  width: 4px;
  background: var(--rail, #34C759);
}
.priority-card.success { --rail: #34C759; }
.priority-card.warning { --rail: #FF9500; }
.priority-card.danger {
  --rail: #FF3B30;
  background: linear-gradient(100deg, rgba(255, 59, 48, 0.07) 0%, #fff 42%);
  border-color: rgba(255, 59, 48, 0.2);
}
/* 未回访：色条微吸，提示尽快处理 */
.priority-card.danger::before {
  animation: priority-pulse 2s ease-out infinite;
}
@keyframes priority-pulse {
  0% { box-shadow: 0 0 0 0 rgba(255, 59, 48, 0.45); }
  70% { box-shadow: -6px 0 0 0 rgba(255, 59, 48, 0); }
  100% { box-shadow: -6px 0 0 0 rgba(255, 59, 48, 0); }
}
.priority-card:active {
  transform: translateY(1px) scale(0.985);
  box-shadow: 0 1px 3px rgba(20, 20, 20, 0.08);
}
.card-head { display: flex; align-items: center; gap: 6px; margin-bottom: 8px; }
.card-no {
  flex-shrink: 0;
  font-family: 'SF Mono', 'JetBrains Mono', ui-monospace, 'Menlo', monospace;
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: 0.4px;
  color: var(--text-secondary);
  background: rgba(0, 0, 0, 0.05);
  padding: 2px 5px;
  border-radius: 5px;
  line-height: 1.5;
}
.card-name {
  flex: 1; min-width: 0;
  font-size: 15px;
  font-weight: 700;
  color: var(--text-primary);
  word-break: break-all;
  letter-spacing: 0.2px;
}
.copy-btn { flex-shrink: 0; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; border-radius: 7px; color: var(--text-tertiary); transition: all 0.18s; cursor: pointer; }
.copy-btn:active { background: rgba(0, 0, 0, 0.06); transform: scale(0.9); }
.copy-btn.copied { color: var(--success); }
.copy-btn svg { width: 13px; height: 13px; }

.card-remark {
  position: relative;
  display: flex;
  align-items: flex-start;
  gap: 6px;
  background: linear-gradient(135deg, #FFF8F0 0%, #FFE8CC 100%);
  border: 1px solid rgba(234, 88, 12, 0.22);
  border-left: 3px solid #EA580C;
  border-radius: 9px;
  padding: 7px 9px 7px 8px;
  margin: 2px 0 10px;
  font-size: 13px;
  font-weight: 700;
  line-height: 1.45;
  color: #9A3412;
  word-break: break-all;
  overflow-wrap: break-word;
  box-shadow: 0 1px 2px rgba(180, 83, 9, 0.06);
}
.remark-flag {
  flex-shrink: 0;
  width: 13px;
  height: 13px;
  margin-top: 2px;
  color: #EA580C;
}
.remark-text {
  flex: 1;
  min-width: 0;
  display: -webkit-box;
  -webkit-line-clamp: 4;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.card-remark.placeholder {
  background: rgba(0, 0, 0, 0.025);
  border-color: transparent;
  border-left-color: rgba(0, 0, 0, 0.1);
  color: var(--text-tertiary);
  font-weight: 500;
  box-shadow: none;
}
.card-remark.placeholder .remark-flag { color: var(--text-tertiary); opacity: 0.5; }
.card-foot { display: flex; align-items: center; gap: 5px; }
.visit-dot { width: 6px; height: 6px; border-radius: 50%; display: inline-block; }
.visit-text { font-size: 11px; font-weight: 600; letter-spacing: 0.3px; }
.priority-card.success .visit-dot { background: #34C759; }
.priority-card.success .visit-text { color: #34C759; }
.priority-card.warning .visit-dot { background: #FF9500; }
.priority-card.warning .visit-text { color: #FF9500; }
.priority-card.danger .visit-dot { background: #FF3B30; }
.priority-card.danger .visit-text { color: #FF3B30; }

/* Search Results */
.results-header { font-size: 12px; color: var(--text-secondary); margin-bottom: 10px; }
.result-card { display: flex; align-items: center; gap: 12px; padding: 14px; background: white; border: 1px solid var(--border-glass); border-radius: 14px; margin-bottom: 10px; cursor: pointer; transition: all 0.2s; }
.result-card:active { background: var(--bg-primary); transform: scale(0.99); }
.result-avatar { width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 18px; font-weight: 700; flex-shrink: 0; }
.result-info { flex: 1; min-width: 0; }
.result-name { font-size: 15px; font-weight: 600; color: var(--text-primary); display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.priority-badge { font-size: 10px; font-weight: 600; padding: 2px 6px; border-radius: 4px; background: rgba(255, 149, 0, 0.1); color: #FF9500; }
.result-date { font-size: 11px; color: var(--text-tertiary); }
.result-meta { font-size: 12px; color: var(--text-secondary); margin-top: 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.result-visit { font-size: 10px; font-weight: 600; padding: 3px 6px; border-radius: 5px; flex-shrink: 0; }
.result-visit.success { color: #34C759; background: rgba(52, 199, 89, 0.1); }
.result-visit.warning { color: #FF9500; background: rgba(255, 149, 0, 0.1); }
.result-visit.danger { color: #FF3B30; background: rgba(255, 59, 48, 0.1); }
.action-arrow { font-size: 18px; color: var(--text-tertiary); flex-shrink: 0; }

/* Visit Modal */
.visit-name { font-size: 14px; font-weight: 600; color: var(--text-primary); margin-bottom: 8px; }
.visit-info { margin-bottom: 12px; }
.visit-remark { font-size: 12px; color: var(--text-secondary); margin-bottom: 4px; }
.visit-days { font-size: 12px; color: var(--text-secondary); }
.visit-input { width: 100%; min-height: 80px; padding: 12px; border: 1px solid var(--border-glass); border-radius: 12px; font-size: 14px; color: var(--text-primary); resize: none; margin-bottom: 12px; }
.visit-input:focus { border-color: var(--primary); outline: none; }
.modal-btns { display: flex; gap: 10px; }
.btn-danger { flex: 1; padding: 12px; border-radius: 12px; background: white; color: var(--danger); font-size: 14px; font-weight: 600; border: 1px solid var(--border-glass); }
.btn-primary { flex: 1; padding: 12px; border-radius: 12px; background: var(--primary); color: white; font-size: 14px; font-weight: 600; }

/* Toast */
.toast { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: rgba(0, 0, 0, 0.75); color: white; padding: 10px 20px; border-radius: 8px; font-size: 14px; z-index: 9999; }

@media (min-width: 768px) {
  .page { max-width: 414px; margin: 0 auto; }
}

/* PC 适配 */
@media (min-width: 1024px) {
  /* 解除 768 断点的 414px 锁宽,PC 下铺满 */
  .page {
    max-width: none;
    margin: 0;
  }

  .demo-banner {
    position: relative;
    border-radius: 12px;
    margin: 0 0 16px;
    padding: 12px 18px;
  }

  .admin-select {
    padding-top: 0;
    margin-bottom: 12px;
  }

  /* 顶部两列：重点卡 + 健康度 */
  .priority-top {
    display: grid;
    grid-template-columns: 1fr 1.4fr;
    gap: 14px;
    margin-top: 0;
    margin-bottom: 16px;
  }

  .hero-stat-card {
    padding: 22px;
    height: 100%;
  }

  .hero-value {
    font-size: 44px;
  }

  .hero-icon-wrap {
    width: 48px;
    height: 48px;
    font-size: 22px;
  }

  .health-grid {
    gap: 12px;
  }

  .health-card {
    padding: 16px 12px;
  }

  .health-num {
    font-size: 28px;
  }

  .health-label {
    font-size: 12px;
  }

  .health-desc {
    font-size: 10px;
  }

  /* 搜索栏居中 + 适当宽度 */
  .search-bar {
    max-width: 560px;
  }

  .section-title {
    font-size: 16px;
  }

  /* 重点客户网格：3 列 */
  .grid-section,
  .results-section {
    background: rgba(255, 255, 255, 0.72);
    border: 1px solid var(--border-glass);
    border-radius: 14px;
    padding: 18px 22px;
  }

  .priority-grid {
    column-count: 3;
    column-gap: 14px;
  }

  .priority-card {
    margin-bottom: 14px;
  }

  /* 搜索结果在 PC 下两列网格布局 */
  .results-section {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
  }

  .results-section .results-header,
  .results-section .empty-box {
    grid-column: 1 / -1;
  }

  .results-section .result-card {
    margin-bottom: 0;
  }

  /* 弹窗居中 */
  .modal-mask {
    align-items: center;
    background: rgba(0, 0, 0, 0.35);
  }

  .modal-sheet {
    width: 460px;
    max-width: calc(100vw - 48px);
    border-radius: 14px;
    padding: 24px;
    box-shadow: 0 24px 60px rgba(0, 0, 0, 0.25);
    animation: pop-in 0.2s ease;
    max-height: calc(100vh - 80px);
  }

  .modal-handle {
    display: none;
  }

  .modal-title {
    font-size: 18px;
    text-align: center;
    margin-bottom: 16px;
  }

  .visit-name {
    text-align: center;
    margin-bottom: 12px;
  }

  .visit-input {
    font-size: 14px;
    padding: 14px;
  }

  .modal-btns .btn-danger,
  .modal-btns .btn-primary {
    padding: 14px;
  }

  .toast {
    top: 80px;
    bottom: auto;
  }
}

/* 超宽屏:重点卡片升至 4 列,搜索结果升至 3 列 */
@media (min-width: 1440px) {
  .priority-grid {
    column-count: 4;
  }

  .results-section {
    grid-template-columns: repeat(3, 1fr);
  }
}

@keyframes pop-in {
  from { opacity: 0; transform: scale(1.05); }
  to { opacity: 1; transform: scale(1); }
}

/* ============ PC 端增强：图标放大 + 密度（方案 A） ============ */
@media (min-width: 1024px) {
  .health-icon { width: 38px; height: 38px; }
  .health-icon svg { width: 20px; height: 20px; }
  .title-icon { width: 18px; height: 18px; color: var(--warning); }
  .hero-icon-wrap svg { width: 26px; height: 26px; }

  /* 搜索栏在 PC 下不缩窄，与下方网格同宽，避免右侧大片留白 */
  .search-bar { max-width: none; }
}
</style>
