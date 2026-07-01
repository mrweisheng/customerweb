<template>
  <div class="page">
    <!-- 示例数据提示 -->
    <div class="demo-banner" v-if="!loggedIn">
      <div class="demo-banner-text">
        <div class="demo-banner-badge">示例</div>
        <span class="demo-banner-label">當前為示例數據</span>
      </div>
      <div class="demo-banner-btn" @click="onAccountLogin">立即登錄</div>
    </div>

    <!-- 管理员用户切换 -->
    <div v-if="loggedIn && isAdmin" class="admin-user-select">
      <div class="user-select-trigger" @click="showUserPicker = true">
        <span class="user-select-label">查看用戶:</span>
        <div class="user-select-value">
          {{ currentUserName }}
          <span class="user-select-arrow">▼</span>
        </div>
      </div>
    </div>

    <!-- 用户选择弹窗 -->
    <div class="modal-mask" v-if="showUserPicker" @click="showUserPicker = false">
      <div class="modal-sheet" @click.stop>
        <div class="modal-handle"></div>
        <div class="modal-title">選擇用戶</div>
        <div class="user-picker-list">
          <div
            v-for="(user, index) in userPickerList"
            :key="user.id"
            class="user-picker-item"
            :class="{ active: currentUserPickerIndex === index }"
            @click="selectUser(index)"
          >
            {{ user.label }}
          </div>
        </div>
      </div>
    </div>

    <div class="greeting-section">
      <div class="greeting-hi">{{ greetingTime }}</div>
      <div class="greeting-quote">{{ greetingQuote }}</div>
    </div>

    <!-- 重点优先客户 -->
    <div class="hero-stat-card">
      <div>
        <div class="hero-label">重點優先客戶</div>
        <div class="hero-value">{{ priorityCount }}</div>
      </div>
      <div class="hero-icon-wrap">★</div>
    </div>

    <div class="secondary-stats-grid">
      <div class="sec-stat-card">
        <div class="sec-content-row">
          <div class="sec-label-new">
            <div class="sec-label-line1">昨日</div>
            <div class="sec-label-line2">新增</div>
          </div>
          <div class="sec-value-wrap">
            <div class="sec-value">{{ yesterdayCount }}</div>
            <div v-if="yesterdayCompareAbs > 0" class="trend-text" :class="yesterdayComparePercent >= 0 ? 'up' : 'down'">
              {{ yesterdayComparePercent >= 0 ? '↑' : '↓' }}{{ yesterdayCompareAbs }}%
            </div>
          </div>
        </div>
      </div>
      <div class="sec-stat-card">
        <div class="sec-content-row">
          <div class="sec-label-new">
            <div class="sec-label-line1">本月</div>
            <div class="sec-label-line2">新增</div>
          </div>
          <div class="sec-value-wrap">
            <div class="sec-value">{{ monthCount }}</div>
            <div v-if="monthCompareAbs > 0" class="trend-text" :class="monthComparePercent >= 0 ? 'up' : 'down'">
              {{ monthComparePercent >= 0 ? '↑' : '↓' }}{{ monthCompareAbs }}%
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="tertiary-stats">
      <div class="tertiary-stat">上月客資<span class="tertiary-value">{{ lastMonthCount }}</span></div>
      <div class="tertiary-divider"></div>
      <div class="tertiary-stat">歷史客資<span class="tertiary-value">{{ totalCount }}</span></div>
    </div>

    <div class="quick-actions" v-if="loggedIn && !isAdmin">
      <div class="action-card ai-card" @click="goToAiImport">
        <div class="action-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="#32ADE6" stroke-width="2" width="20" height="20">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
            <circle cx="8.5" cy="8.5" r="1.5"></circle>
            <polyline points="21 15 16 10 5 21"></polyline>
          </svg>
        </div>
        <div class="action-text-group">
          <div class="action-title">截圖導入</div>
          <div class="action-desc">截圖智能識別</div>
        </div>
      </div>
    </div>

    <div class="section-block">
      <div class="section-header">
        <div class="section-title">客資趨勢</div>
        <div class="trend-pills">
          <div class="trend-pill" :class="{ active: trendDays === 7 }" @click="switchTrendDays(7)">7天</div>
          <div class="trend-pill" :class="{ active: trendDays === 15 }" @click="switchTrendDays(15)">15天</div>
          <div class="trend-pill" :class="{ active: trendDays === 30 }" @click="switchTrendDays(30)">30天</div>
        </div>
      </div>
      <div class="trend-legend">
        <div class="trend-legend-item"><div class="trend-legend-dot current"></div>本期</div>
        <div class="trend-legend-item"><div class="trend-legend-dot previous"></div>上期</div>
      </div>
      <div class="trend-chart-wrapper">
        <canvas ref="trendCanvas" class="trend-canvas"></canvas>
      </div>
      <div class="trend-x-labels" v-if="trendDateLabels.length > 0">
        <span class="trend-x-label" v-for="(label, index) in trendDateLabels" :key="index">{{ label }}</span>
      </div>
      <div class="trend-summary" v-if="trendSummary">
        <div class="trend-summary-item">
          <div class="trend-summary-value">{{ trendSummary.currentTotal }}</div>
          <div class="trend-summary-label">本期合計</div>
          <div class="trend-summary-compare" :class="trendSummary.compareDir">{{ trendSummary.compareText }}</div>
        </div>
        <div class="trend-summary-item">
          <div class="trend-summary-value secondary">{{ trendSummary.prevTotal }}</div>
          <div class="trend-summary-label">上期合計</div>
          <div class="trend-summary-label" style="margin-top:0">—</div>
        </div>
        <div class="trend-summary-item">
          <div class="trend-summary-value">{{ trendSummary.todayCount }}</div>
          <div class="trend-summary-label">今日新增</div>
          <div class="trend-summary-compare" :class="trendSummary.compareDir">{{ trendSummary.compareText }}</div>
        </div>
      </div>
    </div>

    <div class="section-block">
      <div class="section-header">
        <div class="section-title">更新日曆</div>
        <div class="cal-nav">
          <div class="cal-nav-btn" @click="prevMonth">◀</div>
          <div class="cal-month-label">{{ calendarYear }}年{{ calendarMonth }}月</div>
          <div class="cal-nav-btn" :class="{ disabled: isCurrentMonth }" @click="nextMonth">▶</div>
        </div>
      </div>
      <div class="cal-legend">
        <div class="cal-legend-item"><div class="cal-legend-dot cal-dot-updated"></div>已更新</div>
        <div class="cal-legend-item"><div class="cal-legend-dot cal-dot-missed"></div>未更新</div>
      </div>
      <div class="cal-grid cal-header">
        <div class="cal-cell-header" v-for="day in calWeekdays" :key="day">{{ day }}</div>
      </div>
      <div class="cal-grid cal-body">
        <div class="cal-cell" v-for="(item, index) in calendarDays" :key="index">
          <div v-if="item !== null" class="cal-day">
            <div class="cal-day-inner" :class="item.status === 'updated' ? 'cal-updated' : item.status === 'missed' ? 'cal-missed' : ''">
              <span class="cal-day-num">{{ item.day }}</span>
            </div>
          </div>
        </div>
      </div>
      <div class="cal-summary" v-if="calendarData">
        <div class="cal-summary-item">
          <div class="cal-summary-value cal-text-updated">{{ calendarData.updated_count }}</div>
          <div class="cal-summary-label">已更新天數</div>
        </div>
        <div class="cal-summary-divider"></div>
        <div class="cal-summary-item">
          <div class="cal-summary-value cal-text-missed">{{ calendarData.missed_count }}</div>
          <div class="cal-summary-label">未更新天數</div>
        </div>
        <div class="cal-summary-divider"></div>
        <div class="cal-summary-item">
          <div class="cal-summary-value cal-text-rate">{{ calendarData.update_rate }}%</div>
          <div class="cal-summary-label">更新率</div>
        </div>
      </div>
    </div>

    <!-- 设置优先弹窗 -->
    <div class="modal-mask" v-if="showPriorityModal" @click="closePriorityModal">
      <div class="modal-sheet" @click.stop>
        <div class="modal-handle"></div>
        <div class="modal-title">設為優先客戶</div>
        <input class="priority-input" placeholder="請輸入備註原因" v-model="priorityRemark" />
        <div class="btn-full primary" @click="confirmPriority">確認設置</div>
      </div>
    </div>

    <div class="toast" v-if="toast.show">{{ toast.message }}</div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onUnmounted, computed, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import api from '../utils/api'
import { isLoggedIn as checkLoggedIn, getUserInfo } from '../utils/auth'

const router = useRouter()

const loggedIn = ref(false)
const greetingTime = ref('')
const greetingQuote = ref('')
const totalCount = ref(0)
const lastMonthCount = ref(0)
const monthCount = ref(0)
const yesterdayCount = ref(0)
const priorityCount = ref(0)
const lastMonthSameDay = ref(0)
const monthComparePercent = ref(0)
const monthCompareAbs = ref(0)
const yesterdayComparePercent = ref(0)
const yesterdayCompareAbs = ref(0)
const trendDays = ref(7)
const trendDateLabels = ref([])
const trendSummary = ref(null)
const calendarYear = ref(0)
const calendarMonth = ref(0)
const calendarDays = ref([])
const calendarData = ref(null)
const calWeekdays = ['日', '一', '二', '三', '四', '五', '六']
const showPriorityModal = ref(false)
const currentCustomerId = ref(null)
const priorityRemark = ref('')
const trendCanvas = ref(null)
const isAdmin = ref(false)
const currentUserId = ref(null)
const usersList = ref([])
const showUserPicker = ref(false)
const currentUserPickerIndex = ref(0)
const userPickerList = ref([{ id: 0, label: '全部用戶', value: null }])
const toast = reactive({ show: false, message: '' })

let animTimer = null

const currentUserName = computed(() => {
  return userPickerList.value[currentUserPickerIndex.value]?.label || '全部用戶'
})

const isCurrentMonth = computed(() => {
  const today = new Date()
  return calendarYear.value === today.getFullYear() && calendarMonth.value === today.getMonth() + 1
})

function showToast(message, duration = 2000) {
  toast.message = message
  toast.show = true
  setTimeout(() => {
    toast.show = false
  }, duration)
}

function setGreeting() {
  const hour = new Date().getHours()
  let g = '早上好'
  if (hour >= 12 && hour < 18) g = '下午好'
  else if (hour >= 18) g = '晚上好'

  const quotes = [
    '每一步，都算數',
    '相信過程，靜待花開',
    '積跬步，至千里',
    '好的關係，值得用心經營',
    '每一次回訪，都是新的開始',
    '客喺邊，專業喺邊',
    '日拱一卒，功不唐捐',
  ]
  const dayQuote = quotes[new Date().getDay()]

  greetingTime.value = g
  greetingQuote.value = dayQuote
}

function loadMockData() {
  setGreeting()
  totalCount.value = 1286
  lastMonthCount.value = 342
  monthCount.value = 156
  yesterdayCount.value = 12
  priorityCount.value = 28
  lastMonthSameDay.value = 8
  monthComparePercent.value = 15
  monthCompareAbs.value = 15
  yesterdayComparePercent.value = 50
  yesterdayCompareAbs.value = 50

  const today = new Date()
  const dates = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    dates.push(`${d.getMonth() + 1}/${d.getDate()}`)
  }
  const labels = dates.map((d, i) => {
    if (i === 0 || i === dates.length - 1) return d
    if (i === Math.floor(dates.length / 2)) return d
    return ''
  })
  trendDateLabels.value = labels
  trendSummary.value = {
    currentTotal: 68,
    prevTotal: 52,
    todayCount: 12,
    compareDir: 'up',
    compareText: '↑ 31%',
  }

  nextTick(() => {
    setTimeout(() => {
      drawTrendCanvas([5, 8, 12, 6, 15, 10, 12], [3, 6, 9, 8, 11, 7, 8])
    }, 100)
  })

  const year = today.getFullYear()
  const month = today.getMonth() + 1
  const firstDay = new Date(year, month - 1, 1).getDay()
  const daysInMonth = new Date(year, month, 0).getDate()
  const gridDays = []
  for (let i = 0; i < firstDay; i++) {
    gridDays.push(null)
  }
  let updatedCount = 0
  let missedCount = 0
  const currentDay = today.getDate()
  for (let d = 1; d <= daysInMonth; d++) {
    let status = ''
    if (d <= currentDay) {
      const mod = d % 7
      if (mod < 4) {
        status = 'updated'
        updatedCount++
      } else if (mod < 6) {
        status = 'missed'
        missedCount++
      }
    }
    gridDays.push({ day: d, status })
  }
  const totalPast = updatedCount + missedCount
  const updateRate = totalPast > 0 ? Math.round((updatedCount / totalPast) * 100) : 0
  calendarYear.value = year
  calendarMonth.value = month
  calendarDays.value = gridDays
  calendarData.value = {
    updated_count: updatedCount,
    missed_count: missedCount,
    update_rate: updateRate,
  }
}

function drawTrendCanvas(counts, prevCounts) {
  const canvas = trendCanvas.value
  if (!canvas) return

  const ctx = canvas.getContext('2d')
  const dpr = window.devicePixelRatio || 1
  
  const container = canvas.parentElement
  const width = container.clientWidth
  const height = 120
  
  canvas.width = width * dpr
  canvas.height = height * dpr
  canvas.style.width = width + 'px'
  canvas.style.height = height + 'px'
  ctx.scale(dpr, dpr)

  const padding = { top: 10, right: 10, bottom: 10, left: 10 }
  const chartWidth = width - padding.left - padding.right
  const chartHeight = height - padding.top - padding.bottom

  const allValues = [...counts, ...prevCounts]
  const maxValue = Math.max(...allValues, 1)

  ctx.clearRect(0, 0, width, height)

  function drawLine(data, color, fillColor) {
    if (data.length < 2) return
    
    ctx.beginPath()
    ctx.strokeStyle = color
    ctx.lineWidth = 2
    ctx.lineJoin = 'round'
    ctx.lineCap = 'round'

    const points = data.map((value, index) => ({
      x: padding.left + (index / (data.length - 1)) * chartWidth,
      y: padding.top + chartHeight - (value / maxValue) * chartHeight,
    }))

    ctx.moveTo(points[0].x, points[0].y)
    for (let i = 1; i < points.length; i++) {
      const prevPoint = points[i - 1]
      const currPoint = points[i]
      const cpx = (prevPoint.x + currPoint.x) / 2
      ctx.bezierCurveTo(cpx, prevPoint.y, cpx, currPoint.y, currPoint.x, currPoint.y)
    }
    ctx.stroke()

    if (fillColor) {
      ctx.lineTo(points[points.length - 1].x, padding.top + chartHeight)
      ctx.lineTo(points[0].x, padding.top + chartHeight)
      ctx.closePath()
      ctx.fillStyle = fillColor
      ctx.fill()
    }
  }

  drawLine(prevCounts, '#C7C7CC', 'rgba(199, 199, 204, 0.1)')
  drawLine(counts, '#007AFF', 'rgba(0, 122, 255, 0.1)')
}

async function loadUsersList() {
  try {
    const res = await api.get('/customers/users/list')
    const users = res || []
    const pickerList = [{ id: 0, label: '全部用戶', value: null }]
    users.forEach((user) => {
      pickerList.push({
        id: user.id,
        label: user.nickname,
        value: user.id,
      })
    })
    usersList.value = users
    userPickerList.value = pickerList
  } catch (e) {
    console.error('加载用户列表失败', e)
  }
}

function selectUser(index) {
  currentUserPickerIndex.value = index
  currentUserId.value = userPickerList.value[index].value
  showUserPicker.value = false
  loadStats()
  loadTrend()
  loadCalendar()
}

function onAccountLogin() {
  router.push('/login')
}

async function loadStats() {
  try {
    const params = {}
    if (isAdmin.value && currentUserId.value) {
      params.target_user_id = currentUserId.value
    }

    const res = await api.get('/customers/stats', { params })
    const lastMonthSamePeriod = res.last_month_count || 0
    const lastMonthTotal = res.last_month_total || 0
    const lastMonthSameDayVal = res.last_month_same_day || 0
    const monthCountVal = res.month_count || 0
    const yesterdayCountVal = res.yesterday_count || 0

    let monthComparePercentVal = 0
    let monthCompareAbsVal = 0
    if (lastMonthSamePeriod > 0) {
      monthComparePercentVal = Math.round(((monthCountVal - lastMonthSamePeriod) / lastMonthSamePeriod) * 100)
      monthCompareAbsVal = Math.abs(monthComparePercentVal)
    } else if (monthCountVal > 0) {
      monthComparePercentVal = 100
      monthCompareAbsVal = 100
    }

    let yesterdayComparePercentVal = 0
    let yesterdayCompareAbsVal = 0
    if (lastMonthSameDayVal > 0) {
      yesterdayComparePercentVal = Math.round(((yesterdayCountVal - lastMonthSameDayVal) / lastMonthSameDayVal) * 100)
      yesterdayCompareAbsVal = Math.abs(yesterdayComparePercentVal)
    } else if (yesterdayCountVal > 0) {
      yesterdayComparePercentVal = 100
      yesterdayCompareAbsVal = 100
    }

    const targetData = {
      totalCount: res.total_count || 0,
      lastMonthCount: lastMonthTotal,
      monthCount: monthCountVal,
      yesterdayCount: yesterdayCountVal,
      priorityCount: res.priority_count || 0,
      lastMonthSameDay: lastMonthSameDayVal,
      monthComparePercent: monthComparePercentVal,
      monthCompareAbs: monthCompareAbsVal,
      yesterdayComparePercent: yesterdayComparePercentVal,
      yesterdayCompareAbs: yesterdayCompareAbsVal,
    }

    animateNumbers(targetData)
  } catch (e) {
    showToast('加載統計失敗')
  }
}

function animateNumbers(targetData) {
  if (animTimer) clearTimeout(animTimer)
  const duration = 1000
  const frameDuration = 32
  const steps = duration / frameDuration
  let step = 0

  const interpolateValue = (start, end, factor) => {
    return Math.round(start + (end - start) * factor)
  }

  const animateStep = () => {
    step++
    const progress = Math.min(step / steps, 1)
    const easeProgress = 1 - Math.pow(1 - progress, 3)

    totalCount.value = interpolateValue(0, targetData.totalCount, easeProgress)
    lastMonthCount.value = interpolateValue(0, targetData.lastMonthCount, easeProgress)
    monthCount.value = interpolateValue(0, targetData.monthCount, easeProgress)
    yesterdayCount.value = interpolateValue(0, targetData.yesterdayCount, easeProgress)
    priorityCount.value = interpolateValue(0, targetData.priorityCount, easeProgress)
    lastMonthSameDay.value = interpolateValue(0, targetData.lastMonthSameDay, easeProgress)
    monthComparePercent.value = interpolateValue(0, targetData.monthComparePercent, easeProgress)
    monthCompareAbs.value = interpolateValue(0, targetData.monthCompareAbs, easeProgress)
    yesterdayComparePercent.value = interpolateValue(0, targetData.yesterdayComparePercent, easeProgress)
    yesterdayCompareAbs.value = interpolateValue(0, targetData.yesterdayCompareAbs, easeProgress)

    if (step < steps) {
      animTimer = setTimeout(animateStep, frameDuration)
    }
  }

  animateStep()
}

async function loadTrend() {
  try {
    const params = { days: trendDays.value }
    if (isAdmin.value && currentUserId.value) {
      params.target_user_id = currentUserId.value
    }

    const res = await api.get('/customers/trend', { params })
    const counts = res.counts || []
    const prevCounts = res.prev_counts || []
    const dates = res.dates || []

    const labels = dates.map((d, i) => {
      if (i === 0 || i === dates.length - 1) return d
      if (i === Math.floor(dates.length / 2)) return d
      return ''
    })

    const currentTotal = counts.reduce((a, b) => a + b, 0)
    const prevTotal = prevCounts.reduce((a, b) => a + b, 0)
    let compareDir = ''
    let compareText = ''
    if (prevTotal > 0) {
      const pct = Math.round(((currentTotal - prevTotal) / prevTotal) * 100)
      compareDir = pct >= 0 ? 'up' : 'down'
      compareText = `${pct >= 0 ? '↑' : '↓'} ${Math.abs(pct)}%`
    } else {
      compareDir = 'up'
      compareText = currentTotal > 0 ? '↑ 新增' : '—'
    }

    trendDateLabels.value = labels
    trendSummary.value = {
      currentTotal,
      prevTotal,
      todayCount: counts[counts.length - 1] || 0,
      compareDir,
      compareText,
    }

    nextTick(() => {
      setTimeout(() => {
        drawTrendCanvas(counts, prevCounts)
      }, 100)
    })
  } catch (e) {
    showToast('加載趨勢失敗')
  }
}

function switchTrendDays(days) {
  if (!loggedIn.value) {
    showToast('請先登錄')
    return
  }
  trendDays.value = days
  loadTrend()
}

function prevMonth() {
  if (!loggedIn.value) {
    showToast('請先登錄')
    return
  }
  let year = calendarYear.value
  let month = calendarMonth.value - 1
  if (month < 1) {
    month = 12
    year--
  }
  loadCalendar(year, month)
}

function nextMonth() {
  if (!loggedIn.value) {
    showToast('請先登錄')
    return
  }
  const today = new Date()
  const currentYear = today.getFullYear()
  const currentMonth = today.getMonth() + 1
  
  // 不允许查看未来月份
  if (calendarYear.value > currentYear || (calendarYear.value === currentYear && calendarMonth.value >= currentMonth)) {
    return
  }
  
  let year = calendarYear.value
  let month = calendarMonth.value + 1
  if (month > 12) {
    month = 1
    year++
  }
  loadCalendar(year, month)
}

async function loadCalendar(year, month) {
  try {
    const params = {}
    if (year && month) {
      params.year = year
      params.month = month
    }
    if (isAdmin.value && currentUserId.value) {
      params.target_user_id = currentUserId.value
    }

    const res = await api.get('/customers/calendar', { params })
    const today = new Date()
    const resultYear = res.year || year || today.getFullYear()
    const resultMonth = res.month || month || today.getMonth() + 1

    const firstDay = new Date(resultYear, resultMonth - 1, 1).getDay()
    const days = res.days || []
    const gridDays = []

    for (let i = 0; i < firstDay; i++) {
      gridDays.push(null)
    }
    for (const d of days) {
      gridDays.push(d)
    }

    calendarYear.value = resultYear
    calendarMonth.value = resultMonth
    calendarDays.value = gridDays
    calendarData.value = {
      updated_count: res.updated_count,
      missed_count: res.missed_count,
      update_rate: res.update_rate,
    }
  } catch (e) {
    showToast('加載日曆失敗')
  }
}

function openPriorityModal(id) {
  if (!loggedIn.value) {
    showToast('請先登錄')
    return
  }
  if (isAdmin.value) {
    showToast('管理員無此權限')
    return
  }
  currentCustomerId.value = id
  priorityRemark.value = ''
  showPriorityModal.value = true
}

function closePriorityModal() {
  showPriorityModal.value = false
  currentCustomerId.value = null
  priorityRemark.value = ''
}

async function confirmPriority() {
  if (!loggedIn.value) {
    showToast('請先登錄')
    return
  }
  if (isAdmin.value) {
    showToast('管理員無此權限')
    return
  }
  if (!priorityRemark.value.trim()) {
    showToast('請填寫備註')
    return
  }
  try {
    await api.put(`/customers/${currentCustomerId.value}/priority`, {
      is_priority: true,
      remark: priorityRemark.value,
    })
    showToast('設置成功')
    closePriorityModal()
    loadStats()
  } catch (e) {
    showToast('設置失敗')
  }
}

function goToAiImport() {
  if (!loggedIn.value) {
    showToast('請先登錄')
    return
  }
  if (isAdmin.value) {
    showToast('管理員無此權限')
    return
  }
  router.push('/ai-import')
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

    setGreeting()
    loadStats()
    loadTrend()
    loadCalendar()
  } else {
    loadMockData()
  }
})

onUnmounted(() => {
  if (animTimer) {
    clearTimeout(animTimer)
    animTimer = null
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

.demo-banner {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  background: linear-gradient(135deg, #FF9500 0%, #FF6B00 100%);
  padding: 10px 14px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.demo-banner-text {
  display: flex;
  align-items: center;
  gap: 8px;
}

.demo-banner-badge {
  background: rgba(255, 255, 255, 0.3);
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
  color: white;
}

.demo-banner-label {
  font-size: 13px;
  color: white;
  font-weight: 500;
}

.demo-banner-btn {
  background: white;
  color: #FF9500;
  padding: 6px 14px;
  border-radius: 16px;
  font-size: 13px;
  font-weight: 600;
}

.admin-user-select {
  width: 100%;
  margin-bottom: 6px;
  padding-top: 14px;
}

.user-select-trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  background: rgba(255, 255, 255, 0.72);
  border: 1px solid rgba(0, 0, 0, 0.06);
  border-radius: 12px;
}

.user-select-label {
  font-size: 13px;
  color: var(--text-secondary);
  font-weight: 500;
}

.user-select-value {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 14px;
  font-weight: 600;
  color: var(--primary);
}

.user-select-arrow {
  font-size: 10px;
}

.user-picker-list {
  max-height: 300px;
  overflow-y: auto;
}

.user-picker-item {
  padding: 14px 16px;
  font-size: 15px;
  color: var(--text-primary);
  border-bottom: 1px solid var(--border-glass);
  cursor: pointer;
}

.user-picker-item:active {
  background: var(--bg-primary);
}

.user-picker-item.active {
  color: var(--primary);
  font-weight: 600;
}

.greeting-section {
  margin-bottom: 14px;
  padding-top: 14px;
}

.greeting-hi {
  font-size: 11px;
  color: var(--text-secondary);
  font-weight: 400;
  letter-spacing: 1px;
  text-transform: uppercase;
  margin-bottom: 2px;
}

.greeting-quote {
  font-size: 18px;
  font-weight: 700;
  color: var(--text-primary);
  letter-spacing: 0.5px;
  line-height: 1.3;
}

.hero-stat-card {
  background: linear-gradient(145deg, #ffffff 0%, #fffcf8 100%);
  border-radius: 16px;
  padding: 16px;
  box-shadow: 0 4px 16px rgba(255, 149, 0, 0.06), 0 2px 4px rgba(0, 0, 0, 0.02);
  margin-bottom: 10px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border: 1px solid rgba(255, 149, 0, 0.15);
}

.hero-label {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.6);
  font-weight: 600;
  margin-bottom: 4px;
}

.hero-value {
  font-size: 36px;
  font-weight: 800;
  background: linear-gradient(135deg, #FF9500 0%, #FF5E3A 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  line-height: 1;
}

.hero-icon-wrap {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: linear-gradient(135deg, #FF9500 0%, #FF6B00 100%);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  box-shadow: 0 4px 12px rgba(255, 149, 0, 0.3);
}

.secondary-stats-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-bottom: 10px;
}

.sec-stat-card {
  background: linear-gradient(145deg, #ffffff 0%, #f8faff 100%);
  border-radius: 14px;
  padding: 14px 12px;
  box-shadow: 0 2px 8px rgba(0, 122, 255, 0.03);
  border: 1px solid rgba(0, 122, 255, 0.08);
}

.sec-content-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.sec-value-wrap {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.sec-value {
  font-size: 28px;
  font-weight: 800;
  background: linear-gradient(135deg, #007AFF 0%, #32ADE6 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  line-height: 1;
}

.trend-text {
  font-size: 10px;
  font-weight: 600;
  margin-top: 2px;
}

.trend-text.up {
  color: var(--success);
}

.trend-text.down {
  color: var(--danger);
}

.sec-label-new {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.sec-label-line1,
.sec-label-line2 {
  font-size: 13px;
  color: rgba(0, 0, 0, 0.55);
  font-weight: 600;
  line-height: 1.2;
}

.tertiary-stats {
  display: flex;
  justify-content: space-between;
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.85);
  border-radius: 14px;
  border: 1px solid rgba(0, 0, 0, 0.05);
  margin-bottom: 14px;
}

.tertiary-stat {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.5);
  font-weight: 600;
  display: flex;
  align-items: baseline;
}

.tertiary-value {
  font-weight: 800;
  color: #222;
  margin-left: 8px;
  font-size: 16px;
}

.tertiary-divider {
  width: 1px;
  background: rgba(0, 0, 0, 0.06);
}

.quick-actions {
  margin-bottom: 12px;
}

.action-card {
  background: var(--bg-card);
  border: 1px solid var(--border-glass);
  border-radius: 14px;
  padding: 14px 12px;
  display: flex;
  align-items: center;
  gap: 10px;
}

.action-icon {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background: rgba(50, 173, 230, 0.1);
}

.action-text-group {
  flex: 1;
}

.action-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
}

.action-desc {
  font-size: 11px;
  color: var(--text-secondary);
}

.section-block {
  background: var(--bg-card);
  border: 1px solid var(--border-glass);
  border-radius: 14px;
  padding: 14px;
  margin-bottom: 10px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}

.trend-pills {
  display: flex;
  gap: 2px;
  background: rgba(0, 0, 0, 0.04);
  border-radius: 12px;
  padding: 2px;
}

.trend-pill {
  font-size: 11px;
  padding: 4px 10px;
  border-radius: 10px;
  color: var(--text-secondary);
  font-weight: 500;
  cursor: pointer;
}

.trend-pill.active {
  background: var(--primary);
  color: white;
}

.trend-legend {
  display: flex;
  gap: 14px;
  margin-bottom: 8px;
}

.trend-legend-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: var(--text-secondary);
}

.trend-legend-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.trend-legend-dot.current {
  background: var(--primary);
}

.trend-legend-dot.previous {
  background: #C7C7CC;
}

.trend-chart-wrapper {
  width: 100%;
  height: 120px;
  margin-bottom: 4px;
}

.trend-canvas {
  display: block;
}

.trend-x-labels {
  display: flex;
  justify-content: space-between;
  padding: 0 2px;
}

.trend-x-label {
  font-size: 10px;
  color: var(--text-tertiary);
}

.trend-summary {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid var(--border-glass);
}

.trend-summary-item {
  text-align: center;
  flex: 1;
}

.trend-summary-value {
  font-size: 16px;
  font-weight: 700;
  color: var(--primary);
}

.trend-summary-value.secondary {
  color: rgba(29, 29, 31, 0.4);
}

.trend-summary-label {
  font-size: 10px;
  color: var(--text-secondary);
}

.trend-summary-compare {
  font-size: 11px;
  font-weight: 600;
}

.trend-summary-compare.up {
  color: var(--success);
}

.trend-summary-compare.down {
  color: var(--danger);
}

.cal-nav {
  display: flex;
  align-items: center;
  gap: 10px;
}

.cal-nav-btn {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  color: var(--primary);
  background: rgba(0, 122, 255, 0.08);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.cal-nav-btn:active {
  background: rgba(0, 122, 255, 0.15);
  transform: scale(0.95);
}

.cal-nav-btn.disabled {
  opacity: 0.3;
  pointer-events: none;
}

.cal-month-label {
  font-size: 12px;
  color: var(--text-primary);
  font-weight: 600;
  min-width: 80px;
  text-align: center;
}

.cal-legend {
  display: flex;
  gap: 14px;
  margin-bottom: 8px;
}

.cal-legend-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: var(--text-secondary);
}

.cal-legend-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.cal-dot-updated {
  background: var(--success);
}

.cal-dot-missed {
  background: var(--danger);
}

.cal-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 2px;
}

.cal-header {
  margin-bottom: 4px;
}

.cal-cell-header {
  text-align: center;
  font-size: 10px;
  font-weight: 600;
  color: var(--text-tertiary);
  padding: 4px 0;
}

.cal-cell {
  display: flex;
  align-items: center;
  justify-content: center;
  aspect-ratio: 1;
}

.cal-day {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.cal-day-inner {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.cal-updated {
  background: var(--success);
  color: #ffffff;
}

.cal-missed {
  background: var(--danger);
  color: #ffffff;
}

.cal-day-num {
  font-size: 11px;
  font-weight: 600;
}

.cal-summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid var(--border-glass);
}

.cal-summary-item {
  text-align: center;
  flex: 1;
}

.cal-summary-value {
  font-size: 22px;
  font-weight: 800;
  line-height: 1;
  margin-bottom: 4px;
}

.cal-text-updated {
  color: var(--success);
}

.cal-text-missed {
  color: var(--danger);
}

.cal-text-rate {
  color: var(--primary);
}

.cal-summary-label {
  font-size: 11px;
  color: var(--text-secondary);
  font-weight: 600;
}

.cal-summary-divider {
  width: 1px;
  height: 24px;
  background: var(--border-glass);
}

.modal-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.25);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  z-index: 1000;
}

.modal-sheet {
  width: 100%;
  background: #FFFFFF;
  border-radius: 16px 16px 0 0;
  padding: 14px;
  padding-bottom: calc(14px + env(safe-area-inset-bottom));
}

.modal-handle {
  width: 32px;
  height: 4px;
  border-radius: 2px;
  background: rgba(0, 0, 0, 0.12);
  margin: 0 auto 12px;
}

.modal-title {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 12px;
  color: var(--text-primary);
}

.priority-input {
  width: 100%;
  background: var(--bg-primary);
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 10px;
  padding: 10px 12px;
  font-size: 14px;
  color: var(--text-primary);
  margin-bottom: 12px;
}

.btn-full {
  width: 100%;
  padding: 12px;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  text-align: center;
}

.btn-full.primary {
  background: var(--primary);
  color: white;
}

.toast {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: rgba(0, 0, 0, 0.75);
  color: white;
  padding: 10px 20px;
  border-radius: 8px;
  font-size: 14px;
  z-index: 9999;
}

@media (min-width: 768px) {
  .page {
    max-width: 414px;
    margin: 0 auto;
  }
}
</style>
