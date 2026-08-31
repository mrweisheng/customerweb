<template>
  <div class="page p-priority">
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

    <!-- Row 1: 搜索 Hero Command Bar（移动到顶部） -->
    <div class="p-search-hero">
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
        <div class="search-shortcut" aria-hidden="true">⌘K</div>
      </div>
      <div class="search-hint">搜索客户名称或备注，可按住重点</div>
    </div>

    <!-- Row 2: KPI Hero（不对称：主卡 + 3 个副卡垂直堆叠） -->
    <div class="p-kpi-hero">
      <!-- 主卡：重点客户（PC 显示，移动隐藏） -->
      <div class="kpi-hero-main">
        <div class="kpi-hero-icon">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2l2.94 6.26L22 9.27l-5 4.87L18.18 21 12 17.77 5.82 21 7 14.14l-5-4.87 7.06-1.01L12 2z"/>
          </svg>
        </div>
        <div class="kpi-hero-body">
          <div class="kpi-hero-label">重点客户</div>
          <div class="kpi-hero-num">{{ priorityCount }}</div>
          <div class="kpi-hero-meta">
            占总客户 <strong>{{ priorityPercent }}%</strong>
            <span class="kpi-hero-trend flat">— 待接入趋势</span>
          </div>
        </div>
      </div>

      <!-- 副卡：3 个紧凑指标 -->
      <div class="kpi-hero-rail">
        <div class="kpi-hero-tile kpi-info">
          <div class="tile-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
          </div>
          <div class="tile-body">
            <div class="tile-num">{{ visitStats.total }}</div>
            <div class="tile-label">本月到店<span class="tile-sub">{{ visitStats.dealt }} 成交</span></div>
          </div>
        </div>

        <div class="kpi-hero-tile kpi-success">
          <div class="tile-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
          </div>
          <div class="tile-body">
            <div class="tile-num">{{ monthDeals.length }}</div>
            <div class="tile-label">本月成交<span class="tile-sub">单数</span></div>
          </div>
        </div>

        <div class="kpi-hero-tile kpi-danger">
          <div class="tile-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          </div>
          <div class="tile-body">
            <div class="tile-num">{{ healthStats.watch + healthStats.urgent }}</div>
            <div class="tile-label">需要回访<span class="tile-sub">超 7 天未访</span></div>
          </div>
        </div>
      </div>
    </div>

    <!-- Row 3: Bento — 成交/到店横向并排（等宽）+ 重点客户独占下方 -->
    <div v-if="!searchQuery" class="p-bento">
      <!-- 横向并排：本月成交 + 本月到店（等宽双卡） -->
      <div class="p-bento-pair">
        <section v-if="monthDeals.length" class="grid-section month-deal-section">
          <div class="section-title">
            <svg class="title-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
            本月成交
            <span class="section-count">{{ monthDeals.length }} 单</span>
          </div>
          <div class="month-deal-grid">
            <div
              v-for="d in monthDeals"
              :key="d.id"
              class="month-deal-card"
              :class="d.deal_type"
            >
              <div class="md-head">
                <span class="md-name">{{ leadName(d) }}</span>
                <span class="md-tag" :class="d.deal_type">{{ d.deal_type === 'vehicle' ? '🚗 车辆' : '🚦 两地牌' }}</span>
              </div>
              <div class="md-detail">
                <template v-if="d.deal_type === 'vehicle'">
                  <span class="md-desc">{{ d.vehicle_desc || '车辆' }}</span>
                  <span class="md-vin" v-if="d.vin">车架号 {{ d.vin }}</span>
                </template>
                <template v-else>
                  <span class="md-desc">{{ d.port }} · {{ d.plate_kind }}</span>
                  <span class="md-vin" v-if="d.plate_number">车牌 {{ d.plate_number }}</span>
                </template>
              </div>
              <div class="md-remark" v-if="d.remark">📝 {{ d.remark }}</div>
              <div class="md-foot">
                <span class="md-time">📅 成交日 {{ d.deal_time }}</span>
              </div>
            </div>
          </div>
        </section>

        <section v-if="monthVisits.length" class="grid-section month-visit-section">
          <div class="section-title">
            <svg class="title-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
            本月到店
            <span class="section-count">{{ visitStats.total }} 次</span>
            <span class="section-sub">{{ visitStats.dealt }} 成交 / {{ visitStats.notDealt }} 未成交</span>
          </div>
          <div class="month-visit-grid">
            <div
              v-for="v in monthVisits"
              :key="v.id"
              class="month-visit-card"
              :class="v.is_deal ? 'dealt' : 'not-dealt'"
            >
              <div class="md-head">
                <span class="md-name">{{ leadName(v) }}</span>
                <span class="md-tag" :class="v.is_deal ? 'dealt' : 'not-dealt'">{{ v.is_deal ? '✓ 成交' : '未成交' }}</span>
              </div>
              <div class="md-detail">
                <span class="md-desc" v-if="v.needs">{{ v.needs }}</span>
                <span class="md-desc" v-else-if="visitDealSummary(v)">{{ visitDealSummary(v) }}</span>
                <span class="md-desc muted" v-else>（未填写需求）</span>
              </div>
              <div class="md-remark" v-if="v.remark">📝 {{ v.remark }}</div>
              <div class="md-foot">
                <span class="md-time">📅 到店日 {{ v.visit_time }}</span>
              </div>
            </div>
          </div>
        </section>
      </div>

      <!-- 下方独占一行：重点客户卡片网格 -->
      <section class="p-bento-main grid-section">
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
              <span class="card-name">{{ leadName(customer) }}</span>
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
      </section>
    </div>

    <!-- 搜索结果（有搜索词时替代 Bento） -->
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
            {{ leadName(customer) }}
            <span v-if="customer.is_priority" class="priority-badge">重点</span>
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

    <!-- 客户详情/操作面板（跟进记录 + 成交记录 + 重点开关） -->
    <CustomerDetailPanel
      v-model:show="showDetailPanel"
      :customer="activeCustomer"
      @updated="loadAllData"
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
import CustomerDetailPanel from '../components/CustomerDetailPanel.vue'

const router = useRouter()

const loggedIn = ref(false)
const isAdmin = ref(false)
const currentUserId = ref(null)

const priorityCount = ref(0)
const totalCount = ref(0)
const priorityCustomers = ref([])
const monthDeals = ref([])
const monthVisits = ref([])

const searchQuery = ref('')
const searchResults = ref([])
const hasSearched = ref(false)

const showUserPicker = ref(false)
const currentUserPickerIndex = ref(0)
const userPickerList = ref([{ id: 0, label: '全部用户', value: null }])

const showDetailPanel = ref(false)
const activeCustomer = ref({})

const toast = reactive({ show: false, message: '' })
const copiedId = ref(null)

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

// 本月到店统计：成交 / 未成交
const visitStats = computed(() => {
  const total = monthVisits.value.length
  let dealt = 0
  monthVisits.value.forEach((v) => { if (v.is_deal) dealt++ })
  return { total, dealt, notDealt: total - dealt }
})

// 已成交到店（由成交记录自动生成）的成交摘要
function visitDealSummary(v) {
  if (!v.is_deal) return ''
  if (v.deal_type === 'vehicle') return v.vehicle_desc ? `🚗 ${v.vehicle_desc}` : '🚗 车辆'
  if (v.deal_type === 'plate') {
    const p = [v.port, v.plate_kind].filter(Boolean).join(' ')
    return `🚦 ${p || '两地牌'}`
  }
  return '已成交'
}

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
    const [statsRes, listRes, dealsRes, visitsRes] = await Promise.all([
      api.get('/customers/stats', { params: targetUserIdParams() }),
      api.get('/customers/priority', { params: targetUserIdParams() }),
      api.get('/customers/deal-list', { params: targetUserIdParams() }),
      api.get('/customers/visit-list', { params: targetUserIdParams() }),
    ])
    priorityCount.value = statsRes.priority_count || 0
    totalCount.value = statsRes.total_count || 0
    priorityCustomers.value = (listRes || []).map((c, idx) => ({
      ...c,
      lead_date_short: c.lead_date ? c.lead_date.slice(3).replace(/-/g, '') : '',
      avatarColor: AVATAR_COLORS[idx % AVATAR_COLORS.length],
      visitStatus: calcVisitStatus(c.last_visit_at),
    }))
    monthDeals.value = (dealsRes || []).map((d) => ({
      ...d,
      lead_date_short: d.lead_date ? d.lead_date.slice(3).replace(/-/g, '') : '',
    }))
    monthVisits.value = (visitsRes || []).map((v) => ({
      ...v,
      lead_date_short: v.lead_date ? v.lead_date.slice(3).replace(/-/g, '') : '',
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
  monthDeals.value = [
    { id: 101, lead_date_short: '0901', customer_name: 'jack', deal_type: 'vehicle', deal_time: '2026-08-05', vehicle_desc: '21款霸道4000', vin: 'LFV123', port: null, plate_kind: null, plate_number: null },
    { id: 102, lead_date_short: '0905', customer_name: 'mary', deal_type: 'plate', deal_time: '2026-08-06', vehicle_desc: null, vin: null, port: '深圳湾', plate_kind: '现牌', plate_number: 'FV-123' },
  ]
  monthVisits.value = [
    { id: 201, lead_date_short: '0901', customer_name: 'jack', visit_time: '2026-08-05', is_deal: true, needs: '直接提车', remark: '' },
    { id: 202, lead_date_short: '0903', customer_name: 'tom', visit_time: '2026-08-07', is_deal: false, needs: '看霸道4000 白色', remark: '下周再来' },
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
      lead_date_short: c.lead_date ? c.lead_date.slice(3).replace(/-/g, '') : '',
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

// ---------- 卡片 / 结果点击 → 打开客户详情面板 ----------
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

// 统一的客户展示名：线索日/客户名（如 60806/Lucajer），无线索日时仅客户名
function leadName(item) {
  const lead = item?.lead_date_short
  return lead ? `${lead}/${item.customer_name}` : (item?.customer_name || '')
}

async function copyName(customer) {
  if (!loggedIn.value) { showToast('请先登录'); return }
  const text = leadName(customer)
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

function openDetailPanel(customer) {
  activeCustomer.value = customer
  showDetailPanel.value = true
}

function onCardTap(customer) {
  if (!loggedIn.value) { showToast('请先登录'); return }
  if (isAdmin.value) return
  openDetailPanel(customer)
}

function onResultTap(customer) {
  if (!loggedIn.value) { showToast('请先登录'); return }
  if (isAdmin.value) return
  openDetailPanel(customer)
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
/* ==========================================================================
   重点菜单页面 — Editorial Bento 风格
   - 移动：垂直流（搜索 Hero → KPI 3 列紧凑 → Bento 单列）
   - PC：Hero Command Bar + KPI 不对称（1 大 3 小）+ Bento 2 列网格
   - 入场动画：fade-up 错峰；prefers-reduced-motion 自动关闭
   ========================================================================== */

/* -------- 入场动画 -------- */
@keyframes p-priority-fade-up {
  from { opacity: 0; transform: translateY(10px); }
  to   { opacity: 1; transform: translateY(0); }
}
.p-search-hero,
.p-kpi-hero,
.p-bento > * {
  animation: p-priority-fade-up 0.46s cubic-bezier(0.2, 0.7, 0.2, 1) both;
}
.p-search-hero { animation-delay: 0ms; }
.p-kpi-hero    { animation-delay: 80ms; }
.p-bento       { animation-delay: 160ms; }
.p-bento-pair  { animation-delay: 240ms; }
@media (prefers-reduced-motion: reduce) {
  .p-search-hero,
  .p-kpi-hero,
  .p-bento > * { animation: none; }
}

/* -------- Demo Banner -------- */
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

/* -------- Admin Select -------- */
.admin-select { width: 100%; margin-bottom: 6px; padding-top: 14px; }
.select-trigger { display: flex; align-items: center; justify-content: space-between; padding: 10px 12px; background: rgba(255,255,255,0.72); border: 1px solid rgba(0,0,0,0.06); border-radius: 12px; }
.select-label { font-size: 13px; color: var(--text-secondary); font-weight: 500; }
.select-value { display: flex; align-items: center; gap: 4px; font-size: 14px; font-weight: 600; color: var(--primary); }
.select-arrow { font-size: 10px; }

/* -------- Modal -------- */
.modal-mask { position: fixed; inset: 0; background: rgba(0,0,0,0.25); display: flex; align-items: flex-end; justify-content: center; z-index: 1000; }
.modal-sheet { width: 100%; background: #fff; border-radius: 16px 16px 0 0; padding: 14px; padding-bottom: calc(14px + env(safe-area-inset-bottom)); max-height: 85vh; overflow-y: auto; }
.modal-handle { width: 32px; height: 4px; border-radius: 2px; background: rgba(0,0,0,0.12); margin: 0 auto 12px; }
.modal-title { font-size: 16px; font-weight: 600; margin-bottom: 12px; color: var(--text-primary); }
.picker-list { max-height: 300px; overflow-y: auto; }
.picker-item { padding: 14px 16px; font-size: 15px; color: var(--text-primary); border-bottom: 1px solid var(--border-glass); cursor: pointer; }
.picker-item:active { background: var(--bg-primary); }
.picker-item.active { color: var(--primary); font-weight: 600; }

/* ==========================================================================
   Row 1: 搜索 Hero Command Bar（移动端基础）
   ========================================================================== */
.p-search-hero {
  margin-top: 14px;
  margin-bottom: 14px;
}
.p-search-hero .search-bar {
  position: relative;
  display: flex;
  align-items: center;
  height: 44px;
  background: #fff;
  border: 1px solid var(--border-glass);
  border-radius: 12px;
  transition: border-color 0.18s, box-shadow 0.18s;
}
.p-search-hero .search-icon {
  position: absolute;
  left: 12px;
  color: var(--text-secondary);
  pointer-events: none;
}
.p-search-hero .search-input {
  flex: 1;
  width: 100%;
  height: 100%;
  padding: 0 36px 0 38px;
  background: transparent;
  border: none;
  font-size: 14px;
  color: var(--text-primary);
}
.p-search-hero .search-input::placeholder { color: var(--text-secondary); }
.p-search-hero .search-input:focus { outline: none; }
.p-search-hero .search-bar:focus-within {
  border-color: var(--primary);
}
.p-search-hero .search-clear {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.08);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  color: var(--text-secondary);
  cursor: pointer;
}
.p-search-hero .search-shortcut { display: none; }
.p-search-hero .search-hint {
  display: block;
  margin-top: 8px;
  font-size: 12px;
  color: var(--text-tertiary);
  text-align: center;
  letter-spacing: 0.2px;
}

/* ==========================================================================
   Row 2: KPI Hero（移动端：3 列紧凑；隐藏主卡）
   ========================================================================== */
.p-kpi-hero {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin-bottom: 14px;
}
.kpi-hero-main { display: none; }
.kpi-hero-rail {
  display: contents;
}
.kpi-hero-tile {
  border-radius: 14px;
  padding: 11px 10px;
  display: flex;
  align-items: center;
  gap: 8px;
  border: 1px solid transparent;
  min-width: 0;
}
.tile-icon {
  width: 30px;
  height: 30px;
  border-radius: 9px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.tile-icon svg { width: 16px; height: 16px; }
.tile-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.tile-num {
  font-family: 'SF Mono', 'JetBrains Mono', ui-monospace, 'Menlo', monospace;
  font-size: 20px;
  font-weight: 800;
  line-height: 1;
}
.tile-label {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-primary);
  display: flex;
  align-items: baseline;
  gap: 3px;
  /* 去掉 nowrap：窄屏让 "3 成交" 等 sub 自然换行到第二行，不被 ellipsis 截断 */
  flex-wrap: wrap;
  row-gap: 1px;
  min-width: 0;
}
.tile-sub {
  font-size: 10px;
  font-weight: 500;
  color: var(--text-secondary);
}
/* 沿用 4 色语义 */
.kpi-hero-tile.kpi-warning { background: rgba(255, 149, 0, 0.08); border-color: rgba(255, 149, 0, 0.18); }
.kpi-hero-tile.kpi-warning .tile-icon { background: rgba(255, 149, 0, 0.15); color: #FF9500; }
.kpi-hero-tile.kpi-warning .tile-num { color: #FF9500; }
.kpi-hero-tile.kpi-info { background: rgba(90, 200, 250, 0.08); border-color: rgba(90, 200, 250, 0.18); }
.kpi-hero-tile.kpi-info .tile-icon { background: rgba(90, 200, 250, 0.15); color: #5AC8FA; }
.kpi-hero-tile.kpi-info .tile-num { color: #5AC8FA; }
.kpi-hero-tile.kpi-success { background: rgba(52, 199, 89, 0.08); border-color: rgba(52, 199, 89, 0.18); }
.kpi-hero-tile.kpi-success .tile-icon { background: rgba(52, 199, 89, 0.15); color: #34C759; }
.kpi-hero-tile.kpi-success .tile-num { color: #34C759; }
.kpi-hero-tile.kpi-danger { background: rgba(255, 59, 48, 0.08); border-color: rgba(255, 59, 48, 0.18); }
.kpi-hero-tile.kpi-danger .tile-icon { background: rgba(255, 59, 48, 0.15); color: #FF3B30; }
.kpi-hero-tile.kpi-danger .tile-num { color: #FF3B30; }

/* ==========================================================================
   Row 3: Bento（移动端：本月成交/到店横向并排 + 重点客户独占下方）
   ========================================================================== */
.p-bento { display: block; }
.p-bento-pair {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-bottom: 14px;
}
.p-bento-pair > .grid-section {
  background: transparent;
  border: none;
  padding: 0;
  margin-bottom: 0;
  min-width: 0;
}
.p-bento-main {
  background: transparent;
  border: none;
  padding: 0;
  margin-bottom: 14px;
}
/* 极窄屏：双卡退化为单列堆叠，避免内容挤压 */
@media (max-width: 380px) {
  .p-bento-pair { grid-template-columns: 1fr; gap: 14px; }
}

/* ==========================================================================
   Section Title / Empty Box（保持原约定）
   ========================================================================== */
.section-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 10px;
  display: flex;
  align-items: center;
  gap: 6px;
}
.section-count { font-size: 12px; font-weight: 500; color: var(--text-secondary); }
.section-sub { margin-left: auto; font-size: 11px; font-weight: 500; color: var(--text-tertiary); }
.title-icon { width: 16px; height: 16px; margin-right: 4px; flex-shrink: 0; }

.empty-box { text-align: center; padding: 40px 20px; }
.empty-icon { font-size: 40px; margin-bottom: 10px; }
.empty-text { font-size: 15px; font-weight: 600; color: var(--text-primary); margin-bottom: 4px; }
.empty-desc { font-size: 12px; color: var(--text-secondary); }

/* ==========================================================================
   Priority Card（保留所有既有细节：色条、danger 脉动、橙色渐变 remark）
   ========================================================================== */
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

/* ==========================================================================
   本月成交 / 本月到店卡片（保留原 md-* 子样式）
   ========================================================================== */
.month-deal-section { margin-bottom: 14px; }
.month-deal-grid { column-count: 2; column-gap: 10px; }
.month-deal-card {
  position: relative; background: #fff; border: 1px solid rgba(0,0,0,0.05);
  border-radius: 16px; padding: 13px 12px 11px 16px; margin-bottom: 10px;
  overflow: hidden; break-inside: avoid; -webkit-column-break-inside: avoid; page-break-inside: avoid;
  box-shadow: 0 1px 2px rgba(20,20,20,0.04), 0 5px 14px rgba(20,20,20,0.05);
}
.month-deal-card::before { content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 4px; }
.month-deal-card.vehicle::before { background: #007AFF; }
.month-deal-card.plate::before { background: #AF52DE; }
.md-head { display: flex; align-items: center; gap: 6px; margin-bottom: 7px; }
.md-name { flex: 1; min-width: 0; font-size: 15px; font-weight: 700; color: var(--text-primary); word-break: break-all; letter-spacing: 0.2px; }
.md-tag { flex-shrink: 0; font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 5px; }
.md-tag.plate { background: rgba(175,82,222,0.1); color: #AF52DE; }
.md-detail { display: flex; flex-direction: column; gap: 2px; margin-bottom: 8px; }
.md-desc { font-size: 13px; font-weight: 700; color: var(--text-primary); }
.md-vin { font-size: 11px; color: var(--text-secondary); word-break: break-all; }
.md-remark { font-size: 12px; color: var(--text-secondary); margin-bottom: 7px; line-height: 1.4; word-break: break-all; padding: 5px 8px; background: rgba(0,0,0,0.03); border-radius: 7px; }
.md-foot { display: flex; align-items: center; gap: 5px; }
.md-time { font-size: 11px; font-weight: 600; color: var(--text-tertiary); }
.md-desc.muted { color: var(--text-tertiary); font-weight: 500; }

.month-visit-section { margin-bottom: 14px; }
.month-visit-grid { column-count: 2; column-gap: 10px; }
.month-visit-card {
  position: relative; background: #fff; border: 1px solid rgba(0,0,0,0.05);
  border-radius: 16px; padding: 13px 12px 11px 16px; margin-bottom: 10px;
  overflow: hidden; break-inside: avoid; -webkit-column-break-inside: avoid; page-break-inside: avoid;
  box-shadow: 0 1px 2px rgba(20,20,20,0.04), 0 5px 14px rgba(20,20,20,0.05);
}
.month-visit-card::before { content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 4px; }
.month-visit-card.dealt::before { background: #34C759; }
.month-visit-card.not-dealt::before { background: #FF9500; }
.md-tag.dealt { background: rgba(52,199,89,0.12); color: #34C759; }
.md-tag.not-dealt { background: rgba(255,149,0,0.12); color: #FF9500; }

/* ==========================================================================
   搜索结果（PC 网格）
   ========================================================================== */
.results-header { font-size: 12px; color: var(--text-secondary); margin-bottom: 10px; }
.result-card { display: flex; align-items: center; gap: 12px; padding: 14px; background: white; border: 1px solid var(--border-glass); border-radius: 14px; margin-bottom: 10px; cursor: pointer; transition: all 0.2s; }
.result-card:active { background: var(--bg-primary); transform: scale(0.99); }
.result-avatar { width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 18px; font-weight: 700; flex-shrink: 0; }
.result-info { flex: 1; min-width: 0; }
.result-name { font-size: 15px; font-weight: 600; color: var(--text-primary); display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.priority-badge { font-size: 10px; font-weight: 600; padding: 2px 6px; border-radius: 4px; background: rgba(255, 149, 0, 0.1); color: #FF9500; }
.result-meta { font-size: 12px; color: var(--text-secondary); margin-top: 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.result-visit { font-size: 10px; font-weight: 600; padding: 3px 6px; border-radius: 5px; flex-shrink: 0; }
.result-visit.success { color: #34C759; background: rgba(52, 199, 89, 0.1); }
.result-visit.warning { color: #FF9500; background: rgba(255, 149, 0, 0.1); }
.result-visit.danger { color: #FF3B30; background: rgba(255, 59, 48, 0.1); }
.action-arrow { font-size: 18px; color: var(--text-tertiary); flex-shrink: 0; }

/* ==========================================================================
   Toast
   ========================================================================== */
.toast { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: rgba(0, 0, 0, 0.75); color: white; padding: 10px 20px; border-radius: 8px; font-size: 14px; z-index: 9999; }

/* ==========================================================================
   768~1023px：移动布局但 .page 锁宽 414px 居中（保留项目既有约定）
   ========================================================================== */
@media (min-width: 768px) {
  .page { max-width: 414px; margin: 0 auto; }
}

/* ==========================================================================
   PC (>=1024px) — Editorial Bento 布局
   ========================================================================== */
@media (min-width: 1024px) {
  .page {
    max-width: none;
    margin: 0;
  }

  .demo-banner {
    position: relative;
    border-radius: 12px;
    margin: 0 0 14px;
    padding: 12px 18px;
  }

  .admin-select {
    padding-top: 0;
    margin-bottom: 14px;
  }

  /* Row 1: 搜索 Hero — 玻璃质感，舒展高度 */
  .p-search-hero {
    margin-top: 0;
    margin-bottom: 18px;
  }
  .p-search-hero .search-bar {
    height: 52px;
    background: var(--bg-card);
    backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px);
    border: 1px solid var(--border-glass);
    border-radius: 16px;
    box-shadow: 0 1px 2px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.04);
    padding: 0 14px;
    transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;
  }
  .p-search-hero .search-bar:hover {
    border-color: rgba(0,0,0,0.12);
  }
  .p-search-hero .search-bar:focus-within {
    border-color: rgba(0,122,255,0.4);
    box-shadow: 0 0 0 4px rgba(0,122,255,0.10), 0 8px 24px rgba(0,122,255,0.06);
    background: rgba(255,255,255,0.85);
  }
  .p-search-hero .search-icon {
    left: 18px;
    width: 18px;
    height: 18px;
  }
  .p-search-hero .search-input {
    padding: 0 90px 0 48px;
    font-size: 15px;
  }
  .p-search-hero .search-clear {
    right: 64px;
    width: 22px;
    height: 22px;
  }
  .p-search-hero .search-shortcut {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    position: absolute;
    right: 14px;
    top: 50%;
    transform: translateY(-50%);
    padding: 4px 8px;
    border: 1px solid var(--border-glass);
    border-radius: 6px;
    background: rgba(0,0,0,0.04);
    font-family: 'SF Mono', 'JetBrains Mono', ui-monospace, monospace;
    font-size: 11px;
    font-weight: 600;
    color: var(--text-secondary);
    letter-spacing: 0.5px;
    pointer-events: none;
  }
  .p-search-hero .search-hint { display: none; }

  /* Row 2: KPI Hero — 不对称 1.4fr / 1fr */
  .p-kpi-hero {
    grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr);
    gap: 18px;
    margin-bottom: 22px;
  }
  .kpi-hero-main {
    display: flex;
    align-items: center;
    gap: 22px;
    grid-column: 1;
    grid-row: 1;
    padding: 26px 28px;
    border-radius: 18px;
    background:
      radial-gradient(120% 120% at 0% 0%, rgba(255,149,0,0.12) 0%, rgba(255,149,0,0) 60%),
      var(--bg-card);
    border: 1px solid rgba(255,149,0,0.20);
    box-shadow: 0 1px 2px rgba(0,0,0,0.04), 0 12px 28px rgba(255,149,0,0.06);
    position: relative;
    overflow: hidden;
    backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
  }
  .kpi-hero-main::before {
    content: '';
    position: absolute;
    left: 0; top: 0; bottom: 0;
    width: 4px;
    background: linear-gradient(180deg, #FF9500 0%, #FF5E3A 100%);
  }
  .kpi-hero-icon {
    width: 64px;
    height: 64px;
    border-radius: 16px;
    background: linear-gradient(135deg, #FF9500 0%, #FF6B00 100%);
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    box-shadow: 0 8px 18px rgba(255,149,0,0.30);
  }
  .kpi-hero-icon svg { width: 30px; height: 30px; }
  .kpi-hero-body {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .kpi-hero-label {
    font-size: 13px;
    font-weight: 600;
    color: var(--text-secondary);
    letter-spacing: 0.3px;
  }
  .kpi-hero-num {
    font-family: 'SF Mono', 'JetBrains Mono', ui-monospace, monospace;
    font-size: clamp(40px, 4vw, 56px);
    font-weight: 800;
    line-height: 1;
    background: linear-gradient(135deg, #FF9500 0%, #FF5E3A 100%);
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
    color: transparent;
    letter-spacing: -1px;
  }
  .kpi-hero-meta {
    font-size: 13px;
    color: var(--text-secondary);
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }
  .kpi-hero-meta strong {
    color: var(--text-primary);
    font-weight: 700;
  }
  .kpi-hero-trend {
    display: inline-flex;
    align-items: center;
    gap: 3px;
    padding: 2px 8px;
    border-radius: 999px;
    font-size: 11px;
    font-weight: 600;
  }
  .kpi-hero-trend.up   { color: #34C759; background: rgba(52,199,89,0.12); }
  .kpi-hero-trend.down { color: #FF3B30; background: rgba(255,59,48,0.12); }
  .kpi-hero-trend.flat { color: var(--text-secondary); background: rgba(0,0,0,0.05); }

  /* 副卡 rail: 3 个紧凑卡垂直堆叠 */
  .kpi-hero-rail {
    display: grid;
    grid-template-columns: 1fr;
    grid-template-rows: repeat(3, minmax(0, 1fr));
    gap: 12px;
    min-width: 0;
  }
  .kpi-hero-tile {
    padding: 14px 16px;
    border-radius: 14px;
    background: var(--bg-card);
    backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
    transition: transform 0.2s, box-shadow 0.2s, border-color 0.2s;
  }
  .kpi-hero-tile:hover { transform: translateY(-1px); }
  .kpi-hero-tile.kpi-warning:hover { border-color: rgba(255,149,0,0.40); box-shadow: 0 8px 20px rgba(255,149,0,0.10); }
  .kpi-hero-tile.kpi-info:hover    { border-color: rgba(90,200,250,0.40); box-shadow: 0 8px 20px rgba(90,200,250,0.10); }
  .kpi-hero-tile.kpi-success:hover { border-color: rgba(52,199,89,0.40);  box-shadow: 0 8px 20px rgba(52,199,89,0.10); }
  .kpi-hero-tile.kpi-danger:hover  { border-color: rgba(255,59,48,0.40);  box-shadow: 0 8px 20px rgba(255,59,48,0.10); }
  .tile-icon { width: 40px; height: 40px; }
  .tile-icon svg { width: 22px; height: 22px; }
  .tile-num { font-size: 28px; }
  .tile-label { font-size: 13px; }

  /* Row 3: Bento 上下两行 — pair(成交/到店等宽双卡) + main(重点客户独占) */
  .p-bento {
    display: grid;
    grid-template-rows: auto 1fr;
    gap: 18px;
    align-items: start;
  }
  .p-bento-pair {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 18px;
    margin-bottom: 0;
    min-width: 0;
  }
  .p-bento-pair > .grid-section,
  .p-bento-main {
    background: var(--bg-card);
    border: 1px solid var(--border-glass);
    border-radius: 16px;
    padding: 18px 22px;
    backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
    box-shadow: 0 1px 2px rgba(0,0,0,0.03), 0 10px 24px rgba(0,0,0,0.03);
    margin-bottom: 0;
    min-width: 0;
  }
  .p-bento-pair .section-title { margin-bottom: 12px; }
  .p-bento-pair .month-deal-grid,
  .p-bento-pair .month-visit-grid { column-count: 2; column-gap: 12px; }

  /* 搜索结果在 PC 下两列网格 */
  .results-section {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
    background: var(--bg-card);
    border: 1px solid var(--border-glass);
    border-radius: 16px;
    padding: 18px 22px;
    backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
  }
  .results-section .results-header,
  .results-section .empty-box {
    grid-column: 1 / -1;
  }
  .results-section .result-card {
    margin-bottom: 0;
  }

  /* 优先级网格：3 列 */
  .priority-grid { column-count: 3; column-gap: 14px; }
  .priority-card { margin-bottom: 14px; }

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
  .modal-handle { display: none; }
  .modal-title { font-size: 18px; text-align: center; margin-bottom: 16px; }

  .toast { top: 80px; bottom: auto; }

  /* 区块标题放大 */
  .section-title { font-size: 16px; }
  .title-icon { width: 18px; height: 18px; color: var(--warning); }
}

/* ==========================================================================
   超宽屏 (>=1440px)
   ========================================================================== */
@media (min-width: 1440px) {
  .p-search-hero { margin-bottom: 22px; }
  .p-search-hero .search-input { font-size: 16px; }

  .p-kpi-hero { gap: 22px; margin-bottom: 26px; }
  .kpi-hero-main { padding: 30px 32px; }
  .kpi-hero-icon { width: 72px; height: 72px; border-radius: 18px; }
  .kpi-hero-icon svg { width: 34px; height: 34px; }
  .tile-num { font-size: 32px; }

  .p-bento { gap: 22px; }
  .p-bento-pair .month-deal-grid,
  .p-bento-pair .month-visit-grid { column-count: 3; column-gap: 14px; }

  .priority-grid { column-count: 4; }

  .results-section { grid-template-columns: repeat(3, 1fr); }
}

/* ==========================================================================
   Keyframes
   ========================================================================== */
@keyframes pop-in {
  from { opacity: 0; transform: scale(1.05); }
  to   { opacity: 1; transform: scale(1); }
}
</style>