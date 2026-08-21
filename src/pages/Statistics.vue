<template>
  <div class="stats-page">
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

    <!-- 数据总览：Bento 大数字矩阵 -->
    <div class="card overview-card">
      <div class="card-header">
        <div class="card-title"><svg class="title-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>数据总览</div>
      </div>
      <div class="bento-grid">
        <!-- 主卡：历史客户 + sparkline -->
        <div class="bento-card bento-main">
          <div class="bento-head">
            <span class="bento-label">历史客户</span>
            <span class="bento-tag">ALL</span>
          </div>
          <div class="bento-value">{{ formatNumber(bigNumbers.history) }}</div>
          <div class="bento-spark-wrap">
            <canvas ref="historySparkRef" class="bento-spark-canvas"></canvas>
          </div>
          <div class="bento-trend-row">
            <span class="bento-trend-dot"></span>
            <span class="bento-trend-text">{{ historyTrendText }}</span>
          </div>
        </div>

        <!-- 上月客户：对比条 -->
        <div class="bento-card">
          <div class="bento-head">
            <span class="bento-label">上月客户</span>
            <span class="bento-dot-mark month"></span>
          </div>
          <div class="bento-value">{{ formatNumber(bigNumbers.lastMonth) }}</div>
          <div class="bento-compare-bar">
            <div class="bento-compare-fill last" :style="{ width: compareBars.lastMonth + '%' }"></div>
          </div>
          <div class="bento-trend-text flat">— 持平</div>
        </div>

        <!-- 本月客户：对比条 + 趋势 -->
        <div class="bento-card">
          <div class="bento-head">
            <span class="bento-label">本月客户</span>
            <span class="bento-dot-mark current"></span>
          </div>
          <div class="bento-value">{{ formatNumber(bigNumbers.month) }}</div>
          <div class="bento-compare-bar">
            <div class="bento-compare-fill current" :style="{ width: compareBars.month + '%' }"></div>
          </div>
          <div class="bento-trend-text" :class="monthTrendDir">{{ monthTrendText }}</div>
        </div>

        <!-- 重点客户：dot grid 反映数量 -->
        <div class="bento-card">
          <div class="bento-head">
            <span class="bento-label">重点客户</span>
            <span class="bento-dot-mark priority"></span>
          </div>
          <div class="bento-value">{{ formatNumber(bigNumbers.priority) }}</div>
          <div class="bento-dot-grid">
            <span
              v-for="i in Math.min(bigNumbers.priority, 8)"
              :key="i"
              class="bento-dot-cell filled"
            ></span>
            <span
              v-for="i in Math.max(0, 8 - Math.min(bigNumbers.priority, 8))"
              :key="'e' + i"
              class="bento-dot-cell empty"
            ></span>
          </div>
          <div class="bento-trend-text flat">待回访优先</div>
        </div>
      </div>
    </div>

    <!-- 成交统计 -->
    <div class="card deal-stats-card">
      <div class="card-header">
        <div class="card-title"><svg class="title-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>成交统计</div>
      </div>

      <!-- 成交总览 4 格（客户数/单数/车辆/两地牌） -->
      <div class="deal-grid">
        <div class="deal-cell">
          <div class="deal-val">{{ dealStats.customer_count }}</div>
          <div class="deal-lbl">成交客户数</div>
        </div>
        <div class="deal-cell">
          <div class="deal-val">{{ dealStats.total_count }}</div>
          <div class="deal-lbl">成交单数</div>
        </div>
        <div class="deal-cell">
          <div class="deal-val">{{ dealStats.vehicle_count }}</div>
          <div class="deal-lbl">🚗 车辆</div>
        </div>
        <div class="deal-cell">
          <div class="deal-val">{{ dealStats.plate_count }}</div>
          <div class="deal-lbl">🚦 两地牌</div>
        </div>
      </div>

      <template v-if="dealStats.total_count">
        <!-- 月度成交单数（CSS 条形） -->
        <div class="deal-section">
          <div class="deal-sub-title">月度成交单数</div>
          <div class="deal-bars">
            <div class="deal-bar-item" v-for="(cnt, i) in dealStats.monthly.counts" :key="i">
              <div class="deal-bar-num">{{ cnt }}</div>
              <div class="deal-bar-track">
                <div class="deal-bar-fill" :style="{ height: (cnt / dealMaxCount * 100) + '%' }"></div>
              </div>
              <div class="deal-bar-label">{{ dealMonthLabels[i] }}</div>
            </div>
          </div>
        </div>

        <!-- 成交结构 -->
        <div class="deal-section">
          <div class="deal-sub-title">成交结构</div>
          <div class="deal-row">
            <span class="deal-row-name">🚗 车辆</span>
            <div class="deal-row-bar"><div class="fill vehicle" :style="{ width: pct(dealStats.vehicle_count, dealStats.total_count) + '%' }"></div></div>
            <span class="deal-row-num">{{ dealStats.vehicle_count }}</span>
          </div>
          <div class="deal-row">
            <span class="deal-row-name">🚦 两地牌</span>
            <div class="deal-row-bar"><div class="fill plate" :style="{ width: pct(dealStats.plate_count, dealStats.total_count) + '%' }"></div></div>
            <span class="deal-row-num">{{ dealStats.plate_count }}</span>
          </div>
          <template v-if="dealStats.plate_count">
            <div class="deal-row" v-for="(c, port) in dealStats.by_port" :key="'port-' + port">
              <span class="deal-row-name">{{ port }}</span>
              <div class="deal-row-bar"><div class="fill port" :style="{ width: pct(c, dealStats.plate_count) + '%' }"></div></div>
              <span class="deal-row-num">{{ c }}</span>
            </div>
          </template>
          <template v-if="dealStats.plate_count">
            <div class="deal-row" v-for="(c, kind) in dealStats.by_plate_kind" :key="'kind-' + kind">
              <span class="deal-row-name">{{ kind }}</span>
              <div class="deal-row-bar"><div class="fill kind" :style="{ width: pct(c, dealStats.plate_count) + '%' }"></div></div>
              <span class="deal-row-num">{{ c }}</span>
            </div>
          </template>
        </div>

        <!-- 最近成交 -->
        <div class="deal-section" v-if="dealStats.recent.length">
          <div class="deal-sub-title">最近成交</div>
          <div class="deal-recent-item" v-for="d in dealStats.recent" :key="d.id">
            <span class="deal-tag-sm" :class="d.deal_type">{{ d.deal_type === 'vehicle' ? '🚗' : '🚦' }}</span>
            <span class="deal-recent-name">{{ d.customer_name }}</span>
            <span class="deal-recent-desc">{{ dealDesc(d) }}</span>
            <span class="deal-recent-date">{{ d.deal_time }}</span>
          </div>
        </div>
      </template>

      <div v-else class="empty-box">
        <div class="empty-icon">💰</div>
        <div class="empty-text">暂无成交记录</div>
        <div class="empty-desc">在重点客户里记录成交后，这里展示统计</div>
      </div>
    </div>

    <!-- 重点优先客户 -->
    <div class="card priority-card-block">
      <div class="card-header">
        <div class="card-title"><svg class="title-icon" viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>重点优先客户</div>
        <div class="expand-btn" @click="toggleKeyList">
          {{ keyListExpanded ? '收起' : '展开' }}
        </div>
      </div>
      <div v-if="priorityCustomers.length === 0" class="empty-box">
        <div class="empty-icon">📋</div>
        <div class="empty-text">暂无重点客户</div>
      </div>
      <div v-else class="priority-list" :class="{ expanded: keyListExpanded }">
        <div
          v-for="customer in displayPriorityCustomers"
          :key="customer.id"
          class="priority-item"
          @click="onKeyListItemTap(customer)"
        >
          <div class="priority-avatar" :style="{ background: customer.avatarColor.bg, color: customer.avatarColor.color }">
            {{ customer.customer_name?.charAt(0) || '?' }}
          </div>
          <div class="priority-info">
            <div class="priority-name">
              {{ customer.customer_name }}
              <span v-if="customer.remark" class="priority-remark">{{ customer.remark }}</span>
            </div>
            <div class="priority-meta">{{ customer.lead_date_short }}</div>
          </div>
          <div class="priority-visit" :style="{ color: customer.visitStatus.color, background: customer.visitStatus.bgColor }">
            {{ customer.visitStatus.text }}
          </div>
        </div>
      </div>
    </div>

    <!-- 客户趋势 -->
    <div class="card chart-trend">
      <div class="card-header">
        <div class="card-title"><svg class="title-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>客户趋势</div>
        <div class="trend-pills">
          <div class="pill" :class="{ active: trendDays === 7 }" @click="switchTrendDays(7)">7天</div>
          <div class="pill" :class="{ active: trendDays === 15 }" @click="switchTrendDays(15)">15天</div>
          <div class="pill" :class="{ active: trendDays === 30 }" @click="switchTrendDays(30)">30天</div>
        </div>
      </div>
      <div class="legend">
        <div class="legend-item"><div class="legend-dot current"></div>本期</div>
        <div class="legend-item"><div class="legend-dot previous"></div>上期</div>
      </div>
      <div class="chart-container">
        <canvas ref="trendCanvasRef"></canvas>
      </div>
      <div class="x-labels" v-if="trendDateLabels.length > 0">
        <span v-for="(label, index) in trendDateLabels" :key="index">{{ label }}</span>
      </div>
      <div class="summary" v-if="trendSummary">
        <div class="summary-item">
          <div class="summary-value">{{ trendSummary.currentTotal }}</div>
          <div class="summary-label">本期合计</div>
          <div class="summary-compare" :class="trendSummary.compareDir">{{ trendSummary.compareText }}</div>
        </div>
        <div class="summary-item">
          <div class="summary-value secondary">{{ trendSummary.prevTotal }}</div>
          <div class="summary-label">上期合计</div>
          <div class="summary-label">—</div>
        </div>
        <div class="summary-item">
          <div class="summary-value">{{ trendSummary.todayCount }}</div>
          <div class="summary-label">今日新增</div>
          <div class="summary-compare" :class="trendSummary.compareDir">{{ trendSummary.compareText }}</div>
        </div>
      </div>
    </div>

    <!-- 月度统计 -->
    <div class="card chart-monthly">
      <div class="card-header">
        <div class="card-title"><svg class="title-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>月度统计</div>
      </div>
      <div class="chart-container">
        <canvas ref="monthlyCanvasRef"></canvas>
      </div>
      <div class="x-labels monthly">
        <span v-for="(label, index) in monthlyLabels" :key="index">{{ label }}</span>
      </div>
      <div class="summary" v-if="monthlySummary">
        <div class="summary-item">
          <div class="summary-value">{{ monthlySummary.currentMonth }}</div>
          <div class="summary-label">本月</div>
        </div>
        <div class="summary-item">
          <div class="summary-value secondary">{{ monthlySummary.lastMonth }}</div>
          <div class="summary-label">上月</div>
        </div>
        <div class="summary-item">
          <div class="summary-value" :class="monthlySummary.compareDir">{{ monthlySummary.diff }}</div>
          <div class="summary-label">差数</div>
          <div class="summary-compare" :class="monthlySummary.compareDir">{{ monthlySummary.compareText }}</div>
        </div>
      </div>
    </div>


    <!-- 按日期查看客户 -->
    <div class="card customer-detail-card">
      <div class="card-header">
        <div class="card-title"><svg class="title-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>客户明细</div>
        <input type="date" class="date-input" v-model="selectedDateFilter" @change="loadCustomersByDate" />
      </div>
      <div v-if="dateCustomerList.length === 0" class="empty-box">
        <div class="empty-icon">📅</div>
        <div class="empty-text">该日期暂无客户</div>
      </div>
      <div v-else class="customer-list">
        <div
          v-for="customer in dateCustomerList"
          :key="customer.id"
          class="customer-item"
          @click="onDateCustomerTap(customer)"
        >
          <div class="customer-info">
            <div class="customer-name">
              {{ customer.customer_name }}
              <span v-if="customer.is_priority" class="badge">重点</span>
            </div>
            <div class="customer-date">{{ customer.lead_date_short }}</div>
          </div>
          <div class="customer-arrow">›</div>
        </div>
      </div>
    </div>

    <!-- 客户详情/操作面板（跟进记录 + 成交记录 + 重点开关） -->
    <CustomerDetailPanel
      v-model:show="showDetailPanel"
      :customer="activeCustomer"
      @updated="refreshAfterPanelUpdate"
    />

    <div class="toast" v-if="toast.show">{{ toast.message }}</div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import api from '../utils/api'
import { isLoggedIn as checkLoggedIn, getUserInfo } from '../utils/auth'
import { AVATAR_COLORS, calcVisitStatus } from '../utils/constants'
import CustomerDetailPanel from '../components/CustomerDetailPanel.vue'

const router = useRouter()
const loggedIn = ref(false)

// 数据总览：Bento 大数字矩阵（千分位精确显示，无 k 缩写）
const bigNumbers = ref({
  history: 0,
  lastMonth: 0,
  month: 0,
  priority: 0,
})
// 本月/上月 vs 历史 的占比条（视觉化比例，不显示百分比数字）
const compareBars = ref({ lastMonth: 0, month: 0 })
// 趋势文本与方向（保留 ↑/↓/— 这种箭头，但不写 2004% 这种失真百分比）
const monthTrendText = ref('—')
const monthTrendDir = ref('flat')
const historyTrendText = ref('累计增长中')
// 历史客户 sparkline 数据：取最近 7 天每日新增（复用 trend 接口的 counts）
const historySparkData = ref([])

// 千分位格式化：1000 → "1,000"；避免 5.1k 这种损失精度的缩写
function formatNumber(n) {
  if (n === null || n === undefined || Number.isNaN(n)) return '0'
  return Number(n).toLocaleString('en-US')
}
const priorityCustomers = ref([])
const keyListExpanded = ref(false)
const trendDays = ref(7)
const trendDateLabels = ref([])
const trendSummary = ref(null)
const monthlyLabels = ref([])
const monthlySummary = ref(null)
// 成交统计
const dealStats = ref({
  total_count: 0, customer_count: 0, vehicle_count: 0, plate_count: 0, month_count: 0,
  monthly: { months: [], counts: [] }, by_port: {}, by_plate_kind: {}, recent: [],
})
const selectedDateFilter = ref('')
const dateCustomerList = ref([])
const dateCustomerTotal = ref(0)
const isAdmin = ref(false)
const currentUserId = ref(null)
const showUserPicker = ref(false)
const currentUserPickerIndex = ref(0)
const userPickerList = ref([{ id: 0, label: '全部用户', value: null }])
const showDetailPanel = ref(false)
const activeCustomer = ref({})
const toast = reactive({ show: false, message: '' })

const trendCanvasRef = ref(null)
const monthlyCanvasRef = ref(null)
const historySparkRef = ref(null)

let bigNumberAnimTimer = null

const currentUserName = computed(() => {
  return userPickerList.value[currentUserPickerIndex.value]?.label || '全部用户'
})

const displayPriorityCustomers = computed(() => {
  return keyListExpanded.value ? priorityCustomers.value : priorityCustomers.value.slice(0, 3)
})

function showToast(message, duration = 2000) {
  toast.message = message
  toast.show = true
  setTimeout(() => { toast.show = false }, duration)
}

function onAccountLogin() {
  router.push('/login')
}

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

async function loadAllData() {
  await Promise.all([
    loadStats(),
    loadTrend(),
    loadMonthlyStats(),
    loadPriorityCustomers(),
    loadDealStats(),
  ])
  loadDefaultDate()
}

function loadMockData() {
  // 示例数据：千分位精确数字，无 k 缩写
  bigNumbers.value = { history: 5100, lastMonth: 242, month: 105, priority: 8 }
  compareBars.value = { lastMonth: 5, month: 2 }    // 占总量比例，移动端视觉化对比条
  monthTrendText.value = '↑ 18%'
  monthTrendDir.value = 'up'
  historyTrendText.value = '近期累计增长 5,100'
  historySparkData.value = [3, 5, 8, 6, 12, 7, 10]    // 最近 7 天每日新增（示例）
  nextTick(() => setTimeout(() => drawHistorySpark(), 50))

  priorityCustomers.value = [
    { id: 1, lead_date_short: '0510', customer_name: '李先生', remark: '大客户', avatarColor: AVATAR_COLORS[0], visitStatus: { text: '3天前', color: '#34C759', bgColor: 'rgba(52,199,89,0.1)' } },
    { id: 2, lead_date_short: '0508', customer_name: '王女士', remark: '团购单', avatarColor: AVATAR_COLORS[1], visitStatus: { text: '12天前', color: '#FF9500', bgColor: 'rgba(255,149,0,0.1)' } },
    { id: 3, lead_date_short: '0505', customer_name: '张总', remark: '', avatarColor: AVATAR_COLORS[2], visitStatus: { text: '20天前', color: '#FF3B30', bgColor: 'rgba(255,59,48,0.1)' } },
    { id: 4, lead_date_short: '0501', customer_name: '陈小姐', remark: 'VIP', avatarColor: AVATAR_COLORS[3], visitStatus: { text: '5天前', color: '#34C759', bgColor: 'rgba(52,199,89,0.1)' } },
    { id: 5, lead_date_short: '0428', customer_name: '赵先生', remark: '', avatarColor: AVATAR_COLORS[4], visitStatus: { text: '8天前', color: '#34C759', bgColor: 'rgba(52,199,89,0.1)' } },
  ]

  const today = new Date()
  const dates = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    dates.push(`${d.getMonth() + 1}/${d.getDate()}`)
  }
  trendDateLabels.value = dates.map((d, i) => (i === 0 || i === dates.length - 1 || i === Math.floor(dates.length / 2)) ? d : '')
  trendSummary.value = { currentTotal: 68, prevTotal: 52, todayCount: 12, compareDir: 'up', compareText: '↑31%' }
  nextTick(() => setTimeout(() => drawTrendCanvas([5, 8, 12, 6, 15, 10, 12], [3, 6, 9, 8, 11, 7, 8]), 50))

  monthlyLabels.value = ['12月', '1月', '2月', '3月', '4月', '5月']
  monthlySummary.value = { currentMonth: 156, lastMonth: 135, diff: '+21', compareDir: 'up', compareText: '↑16%' }
  nextTick(() => setTimeout(() => drawMonthlyCanvas([98, 112, 125, 135, 135, 156]), 50))

  // 成交统计示例
  dealStats.value = {
    total_count: 18, customer_count: 14, vehicle_count: 11, plate_count: 7, month_count: 4,
    monthly: { months: ['2025-12','2026-01','2026-02','2026-03','2026-04','2026-05'], counts: [3,4,2,3,3,3] },
    by_port: { '深圳湾': 3, '莲塘': 2, '沙头角': 1, '港珠澳': 1 },
    by_plate_kind: { '期牌': 4, '现牌': 3 },
    recent: [
      { id: 1, customer_name: '李先生', deal_type: 'vehicle', deal_time: '2026-05-11', vehicle_desc: '21款霸道4000', vin: null, port: null, plate_kind: null, plate_number: null },
      { id: 2, customer_name: '王女士', deal_type: 'plate', deal_time: '2026-05-10', vehicle_desc: null, vin: null, port: '深圳湾', plate_kind: '现牌', plate_number: 'FV-123' },
    ],
  }

  dateCustomerList.value = [
    { id: 1, lead_date: '2026-05-11', lead_date_short: '0511', customer_name: '钱先生', is_priority: false },
    { id: 2, lead_date: '2026-05-11', lead_date_short: '0511', customer_name: '孙女士', is_priority: true },
    { id: 3, lead_date: '2026-05-11', lead_date_short: '0511', customer_name: '周先生', is_priority: false },
  ]
  dateCustomerTotal.value = 3
  selectedDateFilter.value = '2026-05-11'
}

async function loadStats() {
  try {
    const params = {}
    if (isAdmin.value && currentUserId.value) params.target_user_id = currentUserId.value
    const res = await api.get('/customers/stats', { params })
    const totalCount = res.total_count || 0
    const lastMonthTotal = res.last_month_total || 0
    const lastMonthCount = res.last_month_count || 0
    const monthCount = res.month_count || 0
    const priorityCount = res.priority_count || 0

    // 对比条：本月/上月 占历史总量的比例（视觉化，不显示百分比文字）
    const lastMonthBar = totalCount > 0 ? Math.min(100, (lastMonthTotal / totalCount) * 100) : 0
    const monthBar = totalCount > 0 ? Math.min(100, (monthCount / totalCount) * 100) : 0

    // 本月趋势（vs 上月）：箭头 + 文字，但避免 2004% 这种失真百分比
    let mTrendText = '— 持平', mTrendDir = 'flat'
    if (lastMonthCount > 0) {
      const diff = monthCount - lastMonthCount
      if (diff > 0) { mTrendText = `↑ 多 ${diff} 位`; mTrendDir = 'up' }
      else if (diff < 0) { mTrendText = `↓ 少 ${Math.abs(diff)} 位`; mTrendDir = 'down' }
    } else if (monthCount > 0) {
      mTrendText = '↑ 新增'
      mTrendDir = 'up'
    }

    // 历史客户趋势文字：简洁描述累计增长
    const historyText = lastMonthTotal > 0
      ? `累计 ${formatNumber(totalCount)}，上月 ${formatNumber(lastMonthTotal)}`
      : `累计 ${formatNumber(totalCount)}`

    compareBars.value = { lastMonth: Math.round(lastMonthBar), month: Math.round(monthBar) }
    monthTrendText.value = mTrendText
    monthTrendDir.value = mTrendDir
    historyTrendText.value = historyText

    animateBigNumbers({ history: totalCount, lastMonth: lastMonthTotal, month: monthCount, priority: priorityCount })
  } catch (e) {
    showToast('加载统计失败')
  }
}

function animateBigNumbers(target) {
  if (bigNumberAnimTimer) clearTimeout(bigNumberAnimTimer)
  const steps = 25
  let step = 0
  const start = { ...bigNumbers.value }

  const tick = () => {
    step++
    const progress = Math.min(step / steps, 1)
    const ease = 1 - Math.pow(1 - progress, 3)   // easeOutCubic
    bigNumbers.value = {
      history: Math.round(start.history + (target.history - start.history) * ease),
      lastMonth: Math.round(start.lastMonth + (target.lastMonth - start.lastMonth) * ease),
      month: Math.round(start.month + (target.month - start.month) * ease),
      priority: Math.round(start.priority + (target.priority - start.priority) * ease),
    }
    if (step < steps) bigNumberAnimTimer = setTimeout(tick, 32)
  }
  tick()
}

function drawHistorySpark() {
  const canvas = historySparkRef.value
  if (!canvas) return
  const data = historySparkData.value
  if (!data || data.length < 2) return

  const ctx = canvas.getContext('2d')
  const dpr = window.devicePixelRatio || 1
  const w = canvas.parentElement.clientWidth || 300
  const h = 36
  canvas.width = w * dpr
  canvas.height = h * dpr
  canvas.style.width = w + 'px'
  canvas.style.height = h + 'px'
  ctx.scale(dpr, dpr)
  ctx.clearRect(0, 0, w, h)

  const max = Math.max(...data, 1)
  const pad = { l: 2, r: 2, t: 4, b: 4 }
  const cw = w - pad.l - pad.r
  const ch = h - pad.t - pad.b
  const pts = data.map((v, i) => ({
    x: pad.l + (i / (data.length - 1)) * cw,
    y: pad.t + ch - (v / max) * ch,
  }))

  // 填充渐变（淡到透明）
  ctx.beginPath()
  ctx.moveTo(pts[0].x, h)
  pts.forEach((p, i) => i === 0 ? ctx.lineTo(p.x, p.y) : ctx.lineTo(p.x, p.y))
  ctx.lineTo(pts[pts.length - 1].x, h)
  ctx.closePath()
  const grad = ctx.createLinearGradient(0, pad.t, 0, h)
  grad.addColorStop(0, 'rgba(0,122,255,0.18)')
  grad.addColorStop(1, 'rgba(0,122,255,0)')
  ctx.fillStyle = grad
  ctx.fill()

  // 折线
  ctx.beginPath()
  ctx.strokeStyle = '#007AFF'
  ctx.lineWidth = 1.5
  ctx.lineJoin = 'round'
  ctx.lineCap = 'round'
  pts.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y))
  ctx.stroke()

  // 最后一个点高亮
  const last = pts[pts.length - 1]
  ctx.beginPath()
  ctx.arc(last.x, last.y, 2.5, 0, Math.PI * 2)
  ctx.fillStyle = '#007AFF'
  ctx.fill()
  ctx.beginPath()
  ctx.arc(last.x, last.y, 1, 0, Math.PI * 2)
  ctx.fillStyle = '#fff'
  ctx.fill()
}

async function loadTrend() {
  try {
    const params = { days: trendDays.value }
    if (isAdmin.value && currentUserId.value) params.target_user_id = currentUserId.value
    const res = await api.get('/customers/trend', { params })
    const counts = res.counts || []
    const prevCounts = res.prev_counts || []
    const dates = res.dates || []

    const labels = dates.map((d, i) => (i === 0 || i === dates.length - 1 || i === Math.floor(dates.length / 2)) ? d : '')
    const currentTotal = counts.reduce((a, b) => a + b, 0)
    const prevTotal = prevCounts.reduce((a, b) => a + b, 0)
    let compareDir = 'up', compareText = '—'
    if (prevTotal > 0) {
      const pct = Math.round(((currentTotal - prevTotal) / prevTotal) * 100)
      compareDir = pct >= 0 ? 'up' : 'down'
      compareText = `${pct >= 0 ? '↑' : '↓'} ${Math.abs(pct)}%`
    } else {
      compareText = currentTotal > 0 ? '↑新增' : '—'
    }

    trendDateLabels.value = labels
    trendSummary.value = { currentTotal, prevTotal, todayCount: counts[counts.length - 1] || 0, compareDir, compareText }
    // 历史客户 sparkline 数据：取最近 7 天每日新增（trend 接口返回的 counts）
    historySparkData.value = counts.slice(-7)
    nextTick(() => setTimeout(() => {
      drawTrendCanvas(counts, prevCounts)
      drawHistorySpark()
    }, 50))
  } catch (e) {
    showToast('加载趋势失败')
  }
}

function drawTrendCanvas(counts, prevCounts) {
  const canvas = trendCanvasRef.value
  if (!canvas) return

  const ctx = canvas.getContext('2d')
  const dpr = window.devicePixelRatio || 1
  const w = canvas.parentElement.clientWidth || 300
  const h = window.innerWidth >= 1024 ? 170 : 100
  canvas.width = w * dpr
  canvas.height = h * dpr
  canvas.style.width = w + 'px'
  canvas.style.height = h + 'px'
  ctx.scale(dpr, dpr)

  const pad = { t: 8, r: 8, b: 8, l: 8 }
  const cw = w - pad.l - pad.r
  const ch = h - pad.t - pad.b
  const max = Math.max(...counts, ...prevCounts, 1)

  ctx.clearRect(0, 0, w, h)

  const drawLine = (data, color, fill) => {
    if (!data || data.length < 2) return
    const pts = data.map((v, i) => ({
      x: pad.l + (i / (data.length - 1)) * cw,
      y: pad.t + ch - (v / max) * ch,
    }))
    ctx.beginPath()
    ctx.strokeStyle = color
    ctx.lineWidth = 2
    ctx.lineJoin = 'round'
    ctx.lineCap = 'round'
    ctx.moveTo(pts[0].x, pts[0].y)
    for (let i = 1; i < pts.length; i++) {
      const cpx = (pts[i - 1].x + pts[i].x) / 2
      ctx.bezierCurveTo(cpx, pts[i - 1].y, cpx, pts[i].y, pts[i].x, pts[i].y)
    }
    ctx.stroke()
    if (fill) {
      ctx.lineTo(pts[pts.length - 1].x, pad.t + ch)
      ctx.lineTo(pts[0].x, pad.t + ch)
      ctx.closePath()
      ctx.fillStyle = fill
      ctx.fill()
    }
  }

  drawLine(prevCounts, '#C7C7CC', 'rgba(199,199,204,0.1)')
  drawLine(counts, '#007AFF', 'rgba(0,122,255,0.1)')
}

function switchTrendDays(days) {
  if (!loggedIn.value) { showToast('请先登录'); return }
  trendDays.value = days
  loadTrend()
}

async function loadMonthlyStats() {
  try {
    const params = { months: 6 }
    if (isAdmin.value && currentUserId.value) params.target_user_id = currentUserId.value
    const res = await api.get('/customers/monthly-stats', { params })
    const months = res.months || []
    const counts = res.counts || []
    const labels = months.map(m => m.split('-')[1] + '月')
    const currentMonth = counts[counts.length - 1] || 0
    const lastMonth = counts[counts.length - 2] || 0
    const diff = currentMonth - lastMonth
    let compareDir = 'up', compareText = '—'
    if (lastMonth > 0) {
      const pct = Math.round(((currentMonth - lastMonth) / lastMonth) * 100)
      compareDir = pct >= 0 ? 'up' : 'down'
      compareText = `${pct >= 0 ? '↑' : '↓'} ${Math.abs(pct)}%`
    } else {
      compareText = diff >= 0 ? '持续增长' : '—'
    }

    monthlyLabels.value = labels
    monthlySummary.value = { currentMonth, lastMonth, diff: diff >= 0 ? `+${diff}` : `${diff}`, compareDir, compareText }
    nextTick(() => setTimeout(() => drawMonthlyCanvas(counts), 50))
  } catch (e) {
    showToast('加载月度统计失败')
  }
}

function drawMonthlyCanvas(counts) {
  const canvas = monthlyCanvasRef.value
  if (!canvas) return

  const ctx = canvas.getContext('2d')
  const dpr = window.devicePixelRatio || 1
  const w = canvas.parentElement.clientWidth || 300
  const h = window.innerWidth >= 1024 ? 130 : 80
  canvas.width = w * dpr
  canvas.height = h * dpr
  canvas.style.width = w + 'px'
  canvas.style.height = h + 'px'
  ctx.scale(dpr, dpr)

  const max = Math.max(...counts, 1)
  const pad = { t: 6, b: 6, x: 4 }
  const cw = w - pad.x * 2
  const ch = h - pad.t - pad.b
  const n = counts.length
  const toX = (i) => pad.x + (n > 1 ? (i / (n - 1)) * cw : cw / 2)
  const toY = (v) => pad.t + ch - (v / max) * ch

  ctx.clearRect(0, 0, w, h)

  // Area
  ctx.beginPath()
  counts.forEach((v, i) => { i === 0 ? ctx.moveTo(toX(i), toY(v)) : ctx.lineTo(toX(i), toY(v)) })
  ctx.lineTo(toX(n - 1), h)
  ctx.lineTo(toX(0), h)
  ctx.closePath()
  const grad = ctx.createLinearGradient(0, pad.t, 0, h)
  grad.addColorStop(0, 'rgba(175,82,222,0.2)')
  grad.addColorStop(1, 'rgba(175,82,222,0.02)')
  ctx.fillStyle = grad
  ctx.fill()

  // Line
  ctx.beginPath()
  ctx.strokeStyle = '#AF52DE'
  ctx.lineWidth = 2
  ctx.lineJoin = 'round'
  ctx.lineCap = 'round'
  counts.forEach((v, i) => { i === 0 ? ctx.moveTo(toX(i), toY(v)) : ctx.lineTo(toX(i), toY(v)) })
  ctx.stroke()

  // Dots
  counts.forEach((v, i) => {
    ctx.beginPath()
    ctx.arc(toX(i), toY(v), 3, 0, Math.PI * 2)
    ctx.fillStyle = '#AF52DE'
    ctx.fill()
  })
}

async function loadPriorityCustomers() {
  try {
    const params = {}
    if (isAdmin.value && currentUserId.value) params.target_user_id = currentUserId.value
    const res = await api.get('/customers/priority', { params })
    priorityCustomers.value = (res || []).map((c, idx) => ({
      ...c,
      lead_date_short: c.lead_date ? c.lead_date.slice(3).replace(/-/g, '') : '',
      avatarColor: AVATAR_COLORS[idx % AVATAR_COLORS.length],
      visitStatus: calcVisitStatus(c.last_visit_at),
    }))
  } catch (e) {
    showToast('加载优先客户失败')
  }
}

// ── 成交统计 ──
const dealMonthLabels = computed(() => (dealStats.value.monthly?.months || []).map((ym) => ym.slice(5) + '月'))
const dealMaxCount = computed(() => Math.max(...(dealStats.value.monthly?.counts || [0]), 1))
function pct(part, total) { return total > 0 ? Math.round((part / total) * 100) : 0 }
function dealDesc(d) {
  if (d.deal_type === 'vehicle') return d.vehicle_desc || d.vin || '车辆'
  return [d.port, d.plate_kind, d.plate_number].filter(Boolean).join(' · ')
}
async function loadDealStats() {
  try {
    const params = {}
    if (isAdmin.value && currentUserId.value) params.target_user_id = currentUserId.value
    dealStats.value = await api.get('/customers/deal-stats', { params })
  } catch (e) {
    console.error('加载成交统计失败', e)
  }
}

function toggleKeyList() { keyListExpanded.value = !keyListExpanded.value }

function openDetailPanel(customer) {
  activeCustomer.value = customer
  showDetailPanel.value = true
}

function onKeyListItemTap(customer) {
  if (!loggedIn.value) { showToast('请先登录'); return }
  if (isAdmin.value) return
  openDetailPanel(customer)
}

function onDateCustomerTap(customer) {
  if (!loggedIn.value) { showToast('请先登录'); return }
  if (isAdmin.value) return
  openDetailPanel(customer)
}

// 面板内数据变更（跟进/成交/重点）后刷新统计相关列表
function refreshAfterPanelUpdate() {
  loadPriorityCustomers()
  loadStats()
  if (selectedDateFilter.value) loadCustomersByDate()
}

async function loadDefaultDate() {
  try {
    const params = {}
    if (isAdmin.value && currentUserId.value) params.target_user_id = currentUserId.value
    const res = await api.get('/customers/latest-date', { params })
    let dateStr = res.latest_date || (() => { const n = new Date(); return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}-${String(n.getDate()).padStart(2,'0')}` })()
    selectedDateFilter.value = dateStr
    loadCustomersByDate()
  } catch (e) { console.error('加载默认日期失败', e) }
}

async function loadCustomersByDate() {
  try {
    const params = { date: selectedDateFilter.value }
    if (isAdmin.value && currentUserId.value) params.target_user_id = currentUserId.value
    const res = await api.get('/customers/by-date', { params })
    dateCustomerList.value = (res.customers || []).map(c => ({ ...c, lead_date_short: c.lead_date ? c.lead_date.slice(3).replace(/-/g, '') : '' }))
    dateCustomerTotal.value = dateCustomerList.value.length
  } catch (e) { showToast('加载客户失败') }
}

onMounted(() => {
  loggedIn.value = checkLoggedIn()
  if (loggedIn.value) {
    const userInfo = getUserInfo()
    isAdmin.value = userInfo?.role === 'admin'
    currentUserId.value = userInfo?.role === 'admin' ? null : userInfo?.user_id
    if (isAdmin.value) loadUsersList()
    loadAllData()
  } else {
    loadMockData()
  }
})

onUnmounted(() => {
  if (bigNumberAnimTimer) clearTimeout(bigNumberAnimTimer)
})
</script>

<style scoped>
.stats-page {
  padding: 0 14px 80px;
  min-height: 100vh;
  background: #F5F5F7;
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
.admin-select { margin-bottom: 6px; padding-top: 14px; }
.select-trigger { display: flex; align-items: center; justify-content: space-between; padding: 10px 12px; background: rgba(255,255,255,0.72); border: 1px solid rgba(0,0,0,0.06); border-radius: 12px; }
.select-label { font-size: 13px; color: rgba(29,29,31,0.55); font-weight: 500; }
.select-value { display: flex; align-items: center; gap: 4px; font-size: 14px; font-weight: 600; color: #007AFF; }
.select-arrow { font-size: 10px; }

/* Modal */
.modal-mask { position: fixed; inset: 0; background: rgba(0,0,0,0.25); display: flex; align-items: flex-end; justify-content: center; z-index: 1000; }
.modal-sheet { width: 100%; background: #fff; border-radius: 16px 16px 0 0; padding: 14px; padding-bottom: calc(14px + env(safe-area-inset-bottom)); max-height: 85vh; overflow-y: auto; }
.modal-handle { width: 32px; height: 4px; border-radius: 2px; background: rgba(0,0,0,0.12); margin: 0 auto 12px; }
.modal-title { font-size: 16px; font-weight: 600; margin-bottom: 12px; color: #1D1D1F; }
.picker-list { max-height: 300px; overflow-y: auto; }
.picker-item { padding: 14px 16px; font-size: 15px; color: #1D1D1F; border-bottom: 1px solid rgba(0,0,0,0.06); cursor: pointer; }
.picker-item:active { background: #F5F5F7; }
.picker-item.active { color: #007AFF; font-weight: 600; }

/* Card */
.card {
  background: rgba(255,255,255,0.72);
  border: 1px solid rgba(0,0,0,0.06);
  border-radius: 14px;
  padding: 14px;
  margin-bottom: 10px;
}
.card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
.card-title { font-size: 14px; font-weight: 600; color: #1D1D1F; display: flex; align-items: center; }

/* 区块标题图标（移动端基础尺寸，PC 端 @media 中放大） */
.title-icon {
  width: 16px;
  height: 16px;
  margin-right: 5px;
  flex-shrink: 0;
}
.overview-card .title-icon { color: var(--primary); }
.priority-card-block .title-icon { color: var(--warning); }
.chart-trend .title-icon { color: var(--info); }
.chart-monthly .title-icon { color: var(--purple); }
.customer-detail-card .title-icon { color: var(--success); }

/* ── Bento 大数字矩阵 ─────────────────────────────── */
.bento-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}
.bento-card {
  display: flex;
  flex-direction: column;
  padding: 14px;
  background: rgba(255, 255, 255, 0.55);
  border-radius: 14px;
  border: 1px solid rgba(0, 0, 0, 0.04);
  min-height: 124px;
  position: relative;
  overflow: hidden;
  transition: transform 0.18s ease, box-shadow 0.18s ease;
}
.bento-card:active {
  transform: scale(0.985);
}
.bento-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}
.bento-label {
  font-size: 12px;
  font-weight: 600;
  color: rgba(29, 29, 31, 0.55);
  letter-spacing: 0.2px;
}
.bento-tag {
  font-size: 9px;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 4px;
  background: var(--blue-light);
  color: var(--primary);
  letter-spacing: 0.6px;
}
.bento-dot-mark {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.12);
}
.bento-dot-mark.month { background: var(--success); }
.bento-dot-mark.current { background: var(--warning); }
.bento-dot-mark.priority { background: var(--danger); }

/* 巨号数字：等宽字体强调精确感 */
.bento-value {
  font-family: ui-monospace, 'SF Mono', SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
  font-size: 30px;
  font-weight: 800;
  line-height: 1.05;
  color: #1D1D1F;
  letter-spacing: -0.5px;
  margin-bottom: 8px;
  font-variant-numeric: tabular-nums;
}

/* sparkline 容器（仅主卡） */
.bento-spark-wrap {
  margin-top: auto;
  margin-bottom: 6px;
  height: 36px;
  width: 100%;
}
.bento-spark-canvas {
  display: block;
  width: 100%;
}

/* 对比条（上月 / 本月） */
.bento-compare-bar {
  margin-top: auto;
  height: 4px;
  background: rgba(0, 0, 0, 0.05);
  border-radius: 2px;
  overflow: hidden;
  margin-bottom: 6px;
}
.bento-compare-fill {
  height: 100%;
  border-radius: 2px;
  transition: width 0.6s cubic-bezier(0.16, 1, 0.3, 1);
}
.bento-compare-fill.last { background: var(--success); }
.bento-compare-fill.current { background: var(--warning); }

/* dot grid（重点客户：最多 8 个圆点，未达 8 显示空心占位） */
.bento-dot-grid {
  margin-top: auto;
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  gap: 4px;
  margin-bottom: 6px;
}
.bento-dot-cell {
  width: 100%;
  aspect-ratio: 1;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.06);
}
.bento-dot-cell.filled { background: var(--danger); }

/* 趋势文本与指示 */
.bento-trend-row {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  color: rgba(29, 29, 31, 0.55);
  font-weight: 500;
}
.bento-trend-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--primary);
}
.bento-trend-text {
  font-size: 11px;
  font-weight: 600;
  color: rgba(29, 29, 31, 0.55);
  letter-spacing: 0.1px;
}
.bento-trend-text.up { color: var(--success); }
.bento-trend-text.down { color: var(--danger); }
.bento-trend-text.flat { color: rgba(29, 29, 31, 0.4); }

/* 主卡（历史客户）跨整行 */
.bento-card.bento-main {
  grid-column: span 2;
  background: linear-gradient(135deg, rgba(0, 122, 255, 0.06), rgba(0, 122, 255, 0.02));
  border-color: rgba(0, 122, 255, 0.1);
  min-height: 140px;
}
.bento-card.bento-main .bento-value {
  font-size: 36px;
}

/* Priority */
.expand-btn { font-size: 12px; color: #007AFF; font-weight: 500; cursor: pointer; }
.empty-box { text-align: center; padding: 24px 16px; }
.empty-icon { font-size: 28px; margin-bottom: 6px; }
.empty-text { font-size: 13px; color: rgba(29,29,31,0.55); }
.priority-list { max-height: 180px; overflow: hidden; transition: max-height 0.3s; }
.priority-list.expanded { max-height: none; }
.priority-item { display: flex; align-items: center; gap: 10px; padding: 10px 0; border-bottom: 1px solid rgba(0,0,0,0.06); cursor: pointer; }
.priority-item:last-child { border-bottom: none; }
.priority-item:active { background: #F5F5F7; }
.priority-avatar { width: 36px; height: 36px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 700; flex-shrink: 0; }
.priority-info { flex: 1; min-width: 0; }
.priority-name { font-size: 13px; font-weight: 600; color: #1D1D1F; display: flex; align-items: center; gap: 6px; }
.priority-remark { font-size: 10px; font-weight: 500; padding: 2px 5px; border-radius: 3px; background: rgba(0,122,255,0.08); color: #007AFF; }
.priority-meta { font-size: 11px; color: rgba(29,29,31,0.55); margin-top: 2px; }
.priority-visit { font-size: 10px; font-weight: 600; padding: 3px 6px; border-radius: 5px; flex-shrink: 0; }

/* Trend */
.trend-pills { display: flex; gap: 2px; background: rgba(0,0,0,0.04); border-radius: 10px; padding: 2px; }
.pill { font-size: 10px; padding: 3px 8px; border-radius: 8px; color: rgba(29,29,31,0.55); font-weight: 500; cursor: pointer; }
.pill.active { background: #007AFF; color: white; }
.legend { display: flex; gap: 12px; margin-bottom: 6px; }
.legend-item { display: flex; align-items: center; gap: 4px; font-size: 10px; color: rgba(29,29,31,0.55); }
.legend-dot { width: 7px; height: 7px; border-radius: 50%; }
.legend-dot.current { background: #007AFF; }
.legend-dot.previous { background: #C7C7CC; }
.chart-container { width: 100%; height: 100px; margin-bottom: 4px; }
.chart-container canvas { display: block; }
.x-labels { display: flex; justify-content: space-between; padding: 0 2px; font-size: 10px; color: rgba(29,29,31,0.28); }
.x-labels.monthly { margin-top: 4px; }
.summary { display: flex; justify-content: space-between; align-items: center; margin-top: 10px; padding-top: 10px; border-top: 1px solid rgba(0,0,0,0.06); }
.summary-item { text-align: center; flex: 1; }
.summary-value { font-size: 15px; font-weight: 700; color: #007AFF; }
.summary-value.secondary { color: rgba(29,29,31,0.4); }
.summary-value.up { color: #34C759; }
.summary-value.down { color: #FF3B30; }
.summary-label { font-size: 9px; color: rgba(29,29,31,0.55); }
.summary-compare { font-size: 10px; font-weight: 600; }
.summary-compare.up { color: #34C759; }
.summary-compare.down { color: #FF3B30; }

/* Date Customer */
.date-input { font-size: 12px; padding: 4px 8px; border: 1px solid rgba(0,0,0,0.1); border-radius: 6px; background: white; color: #1D1D1F; }
.customer-list { max-height: 250px; overflow-y: auto; }
.customer-item { display: flex; align-items: center; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid rgba(0,0,0,0.06); cursor: pointer; }
.customer-item:last-child { border-bottom: none; }
.customer-item:active { background: #F5F5F7; }
.customer-info { flex: 1; min-width: 0; }
.customer-name { font-size: 13px; font-weight: 600; color: #1D1D1F; display: flex; align-items: center; gap: 6px; }
.badge { font-size: 9px; font-weight: 600; padding: 2px 5px; border-radius: 3px; background: rgba(255,149,0,0.1); color: #FF9500; }
.customer-date { font-size: 11px; color: rgba(29,29,31,0.55); margin-top: 2px; }
.customer-arrow { font-size: 16px; color: rgba(29,29,31,0.28); }

/* 成交统计 */
.deal-stats-card .title-icon { color: #EA580C; }
.deal-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 8px; margin-bottom: 4px; }
.deal-cell { background: rgba(234,88,12,0.06); border-radius: 10px; padding: 12px; text-align: center; }
.deal-val { font-size: 20px; font-weight: 800; color: #1D1D1F; line-height: 1.1; }
.deal-val.money { color: #EA580C; }
.deal-lbl { font-size: 11px; color: rgba(29,29,31,0.55); margin-top: 4px; line-height: 1.3; }
.deal-sub { font-size: 10px; color: rgba(29,29,31,0.4); }
.deal-section { margin-top: 14px; padding-top: 12px; border-top: 1px solid rgba(0,0,0,0.06); }
.deal-sub-title { font-size: 12px; font-weight: 600; color: rgba(29,29,31,0.7); margin-bottom: 10px; }
.deal-bars { display: flex; align-items: flex-end; gap: 8px; height: 110px; }
.deal-bar-item { flex: 1; display: flex; flex-direction: column; align-items: center; height: 100%; justify-content: flex-end; min-width: 0; }
.deal-bar-num { font-size: 9px; color: rgba(29,29,31,0.5); margin-bottom: 3px; white-space: nowrap; }
.deal-bar-track { width: 70%; flex: 1; background: rgba(234,88,12,0.08); border-radius: 6px; display: flex; align-items: flex-end; min-height: 40px; }
.deal-bar-fill { width: 100%; background: linear-gradient(180deg, #FB923C, #EA580C); border-radius: 6px; min-height: 2px; transition: height 0.4s; }
.deal-bar-label { font-size: 10px; color: rgba(29,29,31,0.5); margin-top: 4px; }
.deal-row { display: flex; align-items: center; gap: 8px; margin-bottom: 7px; }
.deal-row-name { font-size: 12px; color: rgba(29,29,31,0.7); width: 64px; flex-shrink: 0; }
.deal-row-bar { flex: 1; height: 18px; background: rgba(0,0,0,0.04); border-radius: 9px; overflow: hidden; }
.deal-row-bar .fill { height: 100%; border-radius: 9px; transition: width 0.4s; }
.deal-row-bar .fill.vehicle { background: #007AFF; }
.deal-row-bar .fill.plate { background: #AF52DE; }
.deal-row-bar .fill.port { background: #34C759; }
.deal-row-bar .fill.kind { background: #FF9500; }
.deal-row-num { font-size: 12px; font-weight: 600; color: rgba(29,29,31,0.7); width: 24px; text-align: right; }
.deal-recent-item { display: flex; align-items: center; gap: 6px; padding: 8px 0; border-bottom: 1px solid rgba(0,0,0,0.04); font-size: 12px; flex-wrap: wrap; }
.deal-recent-item:last-child { border-bottom: none; }
.deal-tag-sm { font-size: 10px; padding: 2px 6px; border-radius: 5px; flex-shrink: 0; }
.deal-tag-sm.vehicle { background: rgba(0,122,255,0.1); }
.deal-tag-sm.plate { background: rgba(175,82,222,0.1); }
.deal-recent-name { font-weight: 600; color: #1D1D1F; }
.deal-recent-desc { color: rgba(29,29,31,0.55); flex: 1; min-width: 80px; }
.deal-recent-amt { color: #EA580C; font-weight: 700; }
.deal-recent-date { color: rgba(29,29,31,0.4); font-size: 11px; }

/* Visit Modal */
.visit-name { font-size: 13px; font-weight: 600; color: #1D1D1F; margin-bottom: 6px; }
.visit-info { margin-bottom: 10px; }
.visit-remark { font-size: 11px; color: rgba(29,29,31,0.55); margin-bottom: 2px; }
.visit-days { font-size: 11px; color: rgba(29,29,31,0.55); }
.visit-input { width: 100%; min-height: 70px; padding: 10px; border: 1px solid rgba(0,0,0,0.1); border-radius: 10px; font-size: 13px; color: #1D1D1F; resize: none; margin-bottom: 10px; }
.visit-input:focus { border-color: #007AFF; outline: none; }
.modal-btns { display: flex; gap: 8px; }
.btn-danger { flex: 1; padding: 10px; border-radius: 10px; background: white; color: #FF3B30; font-size: 13px; font-weight: 600; border: 1px solid rgba(0,0,0,0.1); }
.btn-primary { flex: 1; padding: 10px; border-radius: 10px; background: #007AFF; color: white; font-size: 13px; font-weight: 600; }

/* Toast */
.toast { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: rgba(0, 0, 0, 0.75); color: white; padding: 10px 20px; border-radius: 8px; font-size: 14px; z-index: 9999; }

@media (min-width: 768px) {
  .stats-page { max-width: 414px; margin: 0 auto; }
}

/* PC 适配 */
@media (min-width: 1024px) {
  /* 解除 768 断点的 414px 锁宽,PC 下铺满 */
  .stats-page {
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

  /* 数据总览 + 月度同行 */
  .card {
    padding: 18px 22px;
    margin-bottom: 14px;
  }

  .card-title {
    font-size: 16px;
  }

  /* 趋势图 + 月度统计 并排:父容器用 grid,这两个卡各占一半,其余卡占满宽 */
  .stats-page {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 14px;
  }

  /* 默认所有直接子元素跨满两列(banner / admin-select / 数据总览 / 重点客户 / 客户明细 / 弹窗等) */
  .stats-page > * {
    grid-column: 1 / -1;
  }

  /* 仅"图表对"各占一半 */
  .chart-trend,
  .chart-monthly {
    grid-column: span 1;
    margin-bottom: 0;
  }

  /* 卡片自身下边距交给 grid gap 统一管理 */
  .stats-page > .card {
    margin-bottom: 0;
  }

  /* Bento 大数字矩阵：PC 端 4 列一行，主卡（历史客户）与子卡同高 */
  .bento-grid {
    grid-template-columns: repeat(4, 1fr);
    gap: 14px;
  }

  .bento-card {
    padding: 16px 16px 14px;
    min-height: 150px;
  }

  .bento-value {
    font-size: 34px;
  }

  .bento-card.bento-main {
    grid-column: span 1;       /* PC 端 4 等权，主卡不跨列 */
    min-height: 150px;
  }

  .bento-card.bento-main .bento-value {
    font-size: 38px;
  }

  .bento-trend-text,
  .bento-trend-row {
    font-size: 12px;
  }

  .ring-label {
    font-size: 12px;
    margin-bottom: 4px;
  }

  /* 重点客户列表区域 */
  .priority-list {
    max-height: none;
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 0 18px;
  }

  .priority-list.expanded {
    grid-template-columns: repeat(3, 1fr);
  }

  .priority-item {
    padding: 10px 0;
  }

  /* 趋势图 / 月度图更大画布 */
  .chart-container {
    height: 140px;
  }

  .summary-value {
    font-size: 18px;
  }

  /* 客户明细：双列 */
  .customer-list {
    max-height: 320px;
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 0 18px;
  }

  .customer-item {
    padding: 12px 0;
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
  }

  .visit-input {
    font-size: 14px;
    padding: 12px 14px;
  }

  .modal-btns .btn-danger,
  .modal-btns .btn-primary {
    padding: 12px;
  }

  .toast {
    top: 80px;
    bottom: auto;
  }
}

@keyframes pop-in {
  from { opacity: 0; transform: scale(1.05); }
  to { opacity: 1; transform: scale(1); }
}

/* ============ PC 端增强：布局重组 + 配色 + 图标（方案 A） ============ */
@media (min-width: 1024px) {
  /* 卡片标题图标 */
  .card-title { display: flex; align-items: center; }
  .title-icon { width: 18px; height: 18px; margin-right: 7px; flex-shrink: 0; }
  .overview-card .title-icon { color: var(--primary); }
  .priority-card-block .title-icon { color: var(--warning); }
  .chart-trend .title-icon { color: var(--info); }
  .chart-monthly .title-icon { color: var(--purple); }
  .customer-detail-card .title-icon { color: var(--success); }

  /* 4 个内容卡两两并排：重点+趋势 / 月度+明细 */
  .priority-card-block,
  .customer-detail-card {
    grid-column: span 1;
  }

  /* Bento 卡片：保留语义色做点缀（数字主色仍为黑，仅背景轻微着色） */
  .bento-card.bento-main {
    background: linear-gradient(135deg, rgba(0,122,255,0.08), rgba(0,122,255,0.02));
    border-color: rgba(0,122,255,0.12);
  }
  .bento-card:nth-child(2) { border-color: rgba(52,199,89,0.14); }
  .bento-card:nth-child(3) { border-color: rgba(255,149,0,0.14); }
  .bento-card:nth-child(4) { border-color: rgba(255,59,48,0.14); }

  .bento-card { transition: transform 0.15s ease, box-shadow 0.15s ease; }
  .bento-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.04);
  }

  /* 半宽卡内列表收为单列，避免拥挤 */
  .priority-list { grid-template-columns: 1fr; }
  .priority-list.expanded { grid-template-columns: repeat(2, 1fr); }
  .customer-list { grid-template-columns: 1fr; }

  /* 图表加高 */
  .chart-container { height: 170px; }
}
</style>
