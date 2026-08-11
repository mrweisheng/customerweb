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

    <!-- 环形图统计 -->
    <div class="card overview-card">
      <div class="card-header">
        <div class="card-title"><svg class="title-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>数据总览</div>
      </div>
      <div class="ring-grid">
        <div v-for="(ring, idx) in ringData" :key="idx" class="ring-card">
          <div class="ring-chart">
            <canvas :ref="el => { if (el) ringCanvasRefs[idx] = el }" class="ring-canvas"></canvas>
            <div class="ring-value">{{ ring.value }}</div>
          </div>
          <div class="ring-label">{{ ringLabels[idx] }}</div>
          <div v-if="ring.trendText" class="ring-trend" :class="ring.trendDir">
            {{ ring.trendText }}
          </div>
        </div>
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

    <!-- 回访弹窗 -->
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
          <button class="btn-primary" @click="visitModalMode === 'visit' ? saveVisit() : confirmAddPriorityFromDetail()">
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
import { ref, reactive, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import api from '../utils/api'
import { isLoggedIn as checkLoggedIn, getUserInfo } from '../utils/auth'
import { AVATAR_COLORS, calcVisitStatus } from '../utils/constants'
import ConfirmDialog from '../components/ConfirmDialog.vue'

const router = useRouter()
const loggedIn = ref(false)

const ringLabels = ['历史客户', '上月客户', '本月客户', '重点客户']
const ringData = ref([
  { value: '0', percent: 0, trendDir: 'up', trendText: '' },
  { value: '0', percent: 0, trendDir: 'flat', trendText: '' },
  { value: '0', percent: 0, trendDir: 'up', trendText: '' },
  { value: '0', percent: 0, trendDir: 'flat', trendText: '' },
])
const priorityCustomers = ref([])
const keyListExpanded = ref(false)
const trendDays = ref(7)
const trendDateLabels = ref([])
const trendSummary = ref(null)
const monthlyLabels = ref([])
const monthlySummary = ref(null)
const selectedDateFilter = ref('')
const dateCustomerList = ref([])
const dateCustomerTotal = ref(0)
const isAdmin = ref(false)
const currentUserId = ref(null)
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
const showConfirmRemove = ref(false)

const trendCanvasRef = ref(null)
const monthlyCanvasRef = ref(null)
const ringCanvasRefs = reactive({})

let ringAnimTimer = null

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
  ])
  loadDefaultDate()
}

function loadMockData() {
  const mockRingData = [
    { value: '1.3k', percent: 100, trendDir: 'up', trendText: '↑18%' },
    { value: '342', percent: 27, trendDir: 'flat', trendText: '—' },
    { value: '156', percent: 12, trendDir: 'up', trendText: '↑15%' },
    { value: '28', percent: 2, trendDir: 'flat', trendText: '' },
  ]
  ringData.value = mockRingData
  nextTick(() => setTimeout(() => drawRings(), 50))

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

    const totalPercent = totalCount > 0 ? 100 : 0
    const lastMonthPercent = totalCount > 0 ? Math.round((lastMonthTotal / totalCount) * 100) : 0
    const monthPercent = totalCount > 0 ? Math.round((monthCount / totalCount) * 100) : 0
    const priorityPercent = totalCount > 0 ? Math.round((priorityCount / totalCount) * 100) : 0

    let totalTrend = 'up', totalTrendText = ''
    if (lastMonthTotal > 0) {
      const pct = Math.round(((totalCount - lastMonthTotal) / lastMonthTotal) * 100)
      totalTrend = pct >= 0 ? 'up' : 'down'
      totalTrendText = `${pct >= 0 ? '↑' : '↓'} ${Math.abs(pct)}%`
    }

    let monthTrend = 'up', monthTrendText = ''
    if (lastMonthCount > 0) {
      const pct = Math.round(((monthCount - lastMonthCount) / lastMonthCount) * 100)
      monthTrend = pct >= 0 ? 'up' : 'down'
      monthTrendText = `${pct >= 0 ? '↑' : '↓'} ${Math.abs(pct)}%`
    } else if (monthCount > 0) {
      monthTrendText = '↑新增'
    }

    const targetRingData = [
      { value: totalCount >= 1000 ? (totalCount / 1000).toFixed(1) + 'k' : String(totalCount), percent: totalPercent, trendDir: totalTrend, trendText: totalTrendText },
      { value: String(lastMonthTotal), percent: lastMonthPercent, trendDir: 'flat', trendText: '—' },
      { value: String(monthCount), percent: monthPercent, trendDir: monthTrend, trendText: monthTrendText },
      { value: String(priorityCount), percent: priorityPercent, trendDir: 'flat', trendText: '' },
    ]

    animateRingNumbers(targetRingData)
    nextTick(() => setTimeout(() => drawRings(), 50))
  } catch (e) {
    showToast('加载统计失败')
  }
}

function animateRingNumbers(targetRingData) {
  if (ringAnimTimer) clearTimeout(ringAnimTimer)
  const duration = 800
  const steps = 25
  let step = 0

  const parseVal = (val) => {
    if (typeof val === 'string' && val.endsWith('k')) return parseFloat(val) * 1000
    return parseInt(val) || 0
  }

  const originals = targetRingData.map(item => ({ value: parseVal(item.value), percent: item.percent }))

  const animate = () => {
    step++
    const progress = Math.min(step / steps, 1)
    const ease = 1 - Math.pow(1 - progress, 3)

    ringData.value = targetRingData.map((target, i) => {
      const animVal = Math.round(originals[i].value * ease)
      const animPct = Math.round(originals[i].percent * ease)
      return {
        value: originals[i].value >= 1000 ? (animVal / 1000).toFixed(1) + 'k' : String(animVal),
        percent: animPct,
        trendDir: target.trendDir,
        trendText: target.trendText,
      }
    })

    if (step < steps) ringAnimTimer = setTimeout(animate, 32)
  }
  animate()
}

function drawRings() {
  const colors = ['#007AFF', '#34C759', '#FF9500', '#FF3B30']
  ringData.value.forEach((ring, idx) => {
    const canvas = ringCanvasRefs[idx]
    if (canvas) drawRing(canvas, ring.percent, colors[idx])
  })
}

function drawRing(canvas, percent, color) {
  const ctx = canvas.getContext('2d')
  const dpr = window.devicePixelRatio || 1
  const size = window.innerWidth >= 1024 ? 96 : 72
  canvas.width = size * dpr
  canvas.height = size * dpr
  canvas.style.width = size + 'px'
  canvas.style.height = size + 'px'
  ctx.scale(dpr, dpr)

  const cx = size / 2
  const cy = size / 2
  const r = size * 0.39
  const lw = size * 0.07

  ctx.clearRect(0, 0, size, size)
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.strokeStyle = 'rgba(0,0,0,0.06)'
  ctx.lineWidth = lw
  ctx.stroke()

  ctx.beginPath()
  ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + (percent / 100) * Math.PI * 2)
  ctx.strokeStyle = color
  ctx.lineWidth = lw
  ctx.lineCap = 'round'
  ctx.stroke()
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
    nextTick(() => setTimeout(() => drawTrendCanvas(counts, prevCounts), 50))
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
      lead_date_short: c.lead_date ? c.lead_date.slice(5).replace('-', '') : '',
      avatarColor: AVATAR_COLORS[idx % AVATAR_COLORS.length],
      visitStatus: calcVisitStatus(c.last_visit_at),
    }))
  } catch (e) {
    showToast('加载优先客户失败')
  }
}

function toggleKeyList() { keyListExpanded.value = !keyListExpanded.value }

function onKeyListItemTap(customer) {
  if (!loggedIn.value) { showToast('请先登录'); return }
  if (isAdmin.value) return
  const daysAgo = customer.last_visit_at ? Math.floor((Date.now() - new Date(customer.last_visit_at).getTime()) / 86400000) : null
  visitModalMode.value = 'visit'
  visitCustomerId.value = customer.id
  visitCustomerName.value = `${customer.lead_date_short}/${customer.customer_name}`
  visitLastRemark.value = customer.remark || ''
  visitRemark.value = ''
  visitDaysAgo.value = daysAgo === null ? '还未回访' : `${daysAgo}天前`
  showVisitModal.value = true
}

function onDateCustomerTap(customer) {
  if (!loggedIn.value) { showToast('请先登录'); return }
  if (isAdmin.value) return
  if (customer.is_priority) {
    const daysAgo = customer.last_visit_at ? Math.floor((Date.now() - new Date(customer.last_visit_at).getTime()) / 86400000) : null
    visitModalMode.value = 'visit'
    visitCustomerId.value = customer.id
    visitCustomerName.value = `${customer.lead_date_short}/${customer.customer_name}`
    visitLastRemark.value = customer.remark || ''
    visitRemark.value = ''
    visitDaysAgo.value = daysAgo === null ? '还未回访' : `${daysAgo}天前`
  } else {
    visitModalMode.value = 'add-priority'
    visitCustomerId.value = customer.id
    visitCustomerName.value = `${customer.lead_date_short}/${customer.customer_name}`
    visitRemark.value = ''
    visitLastRemark.value = ''
    visitDaysAgo.value = ''
  }
  showVisitModal.value = true
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
    loadPriorityCustomers()
    if (selectedDateFilter.value) loadCustomersByDate()
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
    loadPriorityCustomers()
    loadStats()
  } catch (e) { showToast('操作失败') }
}

async function confirmAddPriorityFromDetail() {
  if (!visitRemark.value.trim()) { showToast('请填写备注'); return }
  try {
    await api.put(`/customers/${visitCustomerId.value}/priority`, { is_priority: true, remark: visitRemark.value })
    showToast('已标重点')
    closeVisitModal()
    loadPriorityCustomers()
    loadStats()
  } catch (e) { showToast('操作失败') }
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
    dateCustomerList.value = (res.customers || []).map(c => ({ ...c, lead_date_short: c.lead_date ? c.lead_date.slice(5).replace('-', '') : '' }))
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
  if (ringAnimTimer) clearTimeout(ringAnimTimer)
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
.card-title { font-size: 14px; font-weight: 600; color: #1D1D1F; }

/* Ring Grid */
.ring-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
.ring-card { display: flex; flex-direction: column; align-items: center; padding: 10px; background: rgba(255,255,255,0.5); border-radius: 10px; border: 1px solid rgba(0,0,0,0.04); }
.ring-chart { position: relative; width: 72px; height: 72px; margin-bottom: 6px; }
.ring-canvas { display: block; }
.ring-value { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); font-size: 15px; font-weight: 700; color: #1D1D1F; }
.ring-label { font-size: 11px; color: rgba(29,29,31,0.55); font-weight: 500; margin-bottom: 2px; }
.ring-trend { font-size: 10px; font-weight: 600; }
.ring-trend.up { color: #34C759; }
.ring-trend.down { color: #FF3B30; }
.ring-trend.flat { color: rgba(29,29,31,0.55); }

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

  /* 环形图 4 列一行 */
  .ring-grid {
    grid-template-columns: repeat(4, 1fr);
    gap: 14px;
  }

  .ring-card {
    padding: 16px 14px;
  }

  .ring-chart {
    width: 96px;
    height: 96px;
  }

  .ring-value {
    font-size: 18px;
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

  /* 环形图卡片彩色底，呼应环形图配色 */
  .ring-grid .ring-card:nth-child(1) { background: var(--blue-light); border-color: rgba(0,122,255,0.12); }
  .ring-grid .ring-card:nth-child(2) { background: var(--green-light); border-color: rgba(52,199,89,0.12); }
  .ring-grid .ring-card:nth-child(3) { background: var(--orange-light); border-color: rgba(255,149,0,0.12); }
  .ring-grid .ring-card:nth-child(4) { background: var(--red-light); border-color: rgba(255,59,48,0.12); }
  .ring-card { transition: transform 0.15s ease; }
  .ring-card:hover { transform: translateY(-2px); }

  /* 半宽卡内列表收为单列，避免拥挤 */
  .priority-list { grid-template-columns: 1fr; }
  .priority-list.expanded { grid-template-columns: repeat(2, 1fr); }
  .customer-list { grid-template-columns: 1fr; }

  /* 图表加高 */
  .chart-container { height: 170px; }
}
</style>
