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
    <div v-if="loggedIn && isAdmin" class="admin-user-select">
      <div class="user-select-trigger" @click="showUserPicker = true">
        <span class="user-select-label">查看用户:</span>
        <div class="user-select-value">
          {{ currentUserName }}
          <span class="user-select-arrow">▾</span>
        </div>
      </div>
    </div>

    <!-- 用户选择弹窗 -->
    <div class="modal-mask" v-if="showUserPicker" @click="showUserPicker = false">
      <div class="modal-sheet" @click.stop>
        <div class="modal-handle"></div>
        <div class="modal-title">切换用户</div>
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

    <!-- 顶部行：问候 + 操作 -->
    <div class="page-top-row">
      <div class="greeting-section">
        <div class="greeting-hi">{{ greetingTime }}</div>
        <div class="greeting-quote">{{ greetingQuote }}</div>
      </div>

      <div class="quick-actions" v-if="loggedIn && !isAdmin">
        <div class="action-card ai-card" @click="scrollToHomeImport">
          <div class="action-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="#32ADE6" stroke-width="2" width="20" height="20">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
              <circle cx="8.5" cy="8.5" r="1.5"></circle>
              <polyline points="21 15 16 10 5 21"></polyline>
            </svg>
          </div>
          <div class="action-text-group">
            <div class="action-title">图片导入</div>
            <div class="action-desc">图片智能识别</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 统计卡片行：4 个等宽 KPI 卡 -->
    <div class="stats-row">
      <div class="kpi-card kpi-orange">
        <div class="kpi-icon">
          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.94 6.26L22 9.27l-5 4.87L18.18 21 12 17.77 5.82 21 7 14.14l-5-4.87 7.06-1.01L12 2z"/></svg>
        </div>
        <div class="kpi-body">
          <div class="kpi-label">重点优先</div>
          <div class="kpi-value">{{ priorityCount }}</div>
        </div>
      </div>

      <div class="kpi-card kpi-green">
        <div class="kpi-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
        </div>
        <div class="kpi-body">
          <div class="kpi-label">昨日新增</div>
          <div class="kpi-value">{{ yesterdayCount }}</div>
          <div class="kpi-trend" :class="yesterdayComparePercent >= 0 ? 'up' : 'down'" v-if="yesterdayCompareAbs > 0">{{ yesterdayComparePercent >= 0 ? '↑' : '↓' }}{{ yesterdayCompareAbs }}%</div>
        </div>
      </div>

      <div class="kpi-card kpi-blue">
        <div class="kpi-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
        </div>
        <div class="kpi-body">
          <div class="kpi-label">本月新增</div>
          <div class="kpi-value">{{ monthCount }}</div>
          <div class="kpi-trend" :class="monthComparePercent >= 0 ? 'up' : 'down'" v-if="monthCompareAbs > 0">{{ monthComparePercent >= 0 ? '↑' : '↓' }}{{ monthCompareAbs }}%</div>
        </div>
      </div>

      <div class="kpi-card kpi-cyan">
        <div class="kpi-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
        </div>
        <div class="kpi-body">
          <div class="kpi-label">历史客户</div>
          <div class="kpi-value">{{ totalCount }}</div>
          <div class="kpi-sub">上月 +{{ lastMonthCount }}</div>
        </div>
      </div>
    </div>

    <!-- 快速导入（移动端 + PC 端都内嵌显示，不再跳转新页面） -->
    <div ref="homeImportRef" class="home-import" v-if="loggedIn && !isAdmin">
      <div class="section-header">
        <div class="section-title">
          <svg class="title-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
          快速导入
        </div>
        <div class="import-progress" v-if="importQueue.length">{{ importDoneCount }}/{{ importQueue.length }} 已识别</div>
      </div>

      <!-- 选图区：点击 / 拖拽 / 全局粘贴 -->
      <div
        class="import-dropzone"
        :class="{ dragging: importDragging }"
        @click="chooseImportImage"
        @dragover.prevent="importDragging = true"
        @dragleave.prevent="importDragging = false"
        @drop.prevent="onImportDrop"
      >
        <div class="dropzone-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
        </div>
        <div class="dropzone-text">
          <span class="dropzone-text-pc">粘贴截图 · 点击选择 · 拖拽到此处</span>
          <span class="dropzone-text-mobile">点击选择 / 拍照</span>
        </div>
        <div class="dropzone-hint">支持 JPG / PNG，最多 {{ IMPORT_MAX }} 张，可分多次添加</div>
      </div>

      <!-- 缩略图队列 -->
      <div class="import-thumbs" v-if="importQueue.length">
        <div class="import-thumb" v-for="item in importQueue" :key="item.id" :class="item.status">
          <img v-if="item.thumb" :src="item.thumb" />
          <div class="import-thumb-status">
            <span v-if="item.status === 'pending'">等待中</span>
            <span v-else-if="item.status === 'processing'" class="processing">识别中…</span>
            <span v-else-if="item.status === 'done'" class="done">{{ item.contactsFound }} 人</span>
            <span v-else class="error">失败</span>
          </div>
          <button v-if="item.status === 'error'" class="import-thumb-retry" @click.stop="retryImportItem(item.id)">重试</button>
          <button class="import-thumb-remove" @click.stop="removeImportItem(item.id)">✕</button>
        </div>
      </div>

      <!-- 识别结果原地展开 -->
      <div class="import-contacts" v-if="importContacts.length">
        <div class="import-contacts-header">
          <span>识别到 {{ importContacts.length }} 位联系人<span v-if="importDuplicateCount > 0" class="dup-tag">（{{ importDuplicateCount }} 位重複）</span></span>
          <span class="import-valid-count">已选 {{ importValidCount }} 位有效</span>
        </div>
        <div class="import-contact-list">
          <label class="import-contact" v-for="(c, i) in importContacts" :key="i" :class="{ invalid: !c.date }">
            <input type="checkbox" v-model="c.selected" :disabled="!c.date" />
            <span class="import-contact-name">{{ c.name }}</span>
            <span v-if="isImportDuplicate(c)" class="dup-badge">已存在</span>
            <span class="import-contact-date" v-if="c.date">{{ c.date }}</span>
            <span class="import-contact-date invalid" v-else>日期无效</span>
          </label>
        </div>
        <div class="import-actions">
          <button class="btn-import-secondary" @click="clearImport">清空</button>
          <button class="btn-import-primary" :disabled="importValidCount === 0 || importing" @click="startHomeImport">
            {{ importing ? '导入中…' : `导入 ${importValidCount} 位` }}
          </button>
        </div>
      </div>

      <!-- 导入结果反馈 -->
      <div v-if="importResult" :class="['import-result', importResultCls]">
        <div class="import-result-summary">
          <template v-if="importResult.success && importResult.added > 0">
            ✓ 新增 {{ importResult.added }} 位，跳過 {{ importResult.skipped }} 位重複
          </template>
          <template v-else-if="importResult.success && importResult.skipped > 0">
            全部為重複聯繫人（{{ importResult.skipped }} 位）
          </template>
          <template v-else-if="importResult.success">
            ✓ 成功导入 {{ importResult.added }} 位联系人
          </template>
          <template v-else>
            ✗ {{ importResult.error }}
          </template>
        </div>
        <details v-if="importResult.success && importResult.skipped_names && importResult.skipped_names.length > 0" class="import-result-detail">
          <summary>查看重複名單（{{ importResult.skipped_names.length }}）</summary>
          <div class="skip-row" v-for="name in importResult.skipped_names" :key="name">
            <span>{{ name }}</span><span class="skip-reason">已存在</span>
          </div>
        </details>
      </div>
    </div>

    <!-- 趋势 + 日历 -->
    <div class="home-grid-2col">
    <div class="section-block trend-block">
      <div class="section-header">
        <div class="section-title">
          <svg class="title-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
          客户趋势
        </div>
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
          <div class="trend-summary-label">本期合计</div>
          <div class="trend-summary-compare" :class="trendSummary.compareDir">{{ trendSummary.compareText }}</div>
        </div>
        <div class="trend-summary-item">
          <div class="trend-summary-value secondary">{{ trendSummary.prevTotal }}</div>
          <div class="trend-summary-label">上期合计</div>
          <div class="trend-summary-label" style="margin-top:0">—</div>
        </div>
        <div class="trend-summary-item">
          <div class="trend-summary-value">{{ trendSummary.todayCount }}</div>
          <div class="trend-summary-label">今日新增</div>
          <div class="trend-summary-compare" :class="trendSummary.compareDir">{{ trendSummary.compareText }}</div>
        </div>
      </div>
    </div>

    <!-- 更新日集 -->
    <div class="section-block calendar-block">
      <div class="section-header">
        <div class="section-title">
          <svg class="title-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          更新日集
        </div>
        <div class="cal-nav">
          <div class="cal-nav-btn" @click="prevMonth">‹</div>
          <div class="cal-month-label">{{ calendarYear }}年{{ calendarMonth }}月</div>
          <div class="cal-nav-btn" :class="{ disabled: isCurrentMonth }" @click="nextMonth">›</div>
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
          <div class="cal-summary-label">已更新天数</div>
        </div>
        <div class="cal-summary-divider"></div>
        <div class="cal-summary-item">
          <div class="cal-summary-value cal-text-missed">{{ calendarData.missed_count }}</div>
          <div class="cal-summary-label">未更新天数</div>
        </div>
        <div class="cal-summary-divider"></div>
        <div class="cal-summary-item">
          <div class="cal-summary-value cal-text-rate">{{ calendarData.update_rate }}%</div>
          <div class="cal-summary-label">更新率</div>
        </div>
      </div>
    </div>
    </div><!-- /.home-grid-2col -->

    <!-- 设置重点弹窗 -->
    <div class="modal-mask" v-if="showPriorityModal" @click="closePriorityModal">
      <div class="modal-sheet" @click.stop>
        <div class="modal-handle"></div>
        <div class="modal-title">备注重点客户</div>
        <input class="priority-input" placeholder="请输入备注原因" v-model="priorityRemark" />
        <div class="btn-full primary" @click="confirmPriority">确认设置</div>
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
import { recognizeImage } from '../utils/aiRecognize'
import { onContactsImported } from '../utils/events'
import { useDevice } from '../composables/useDevice'

const router = useRouter()
let offContactsImported = null
const { isDesktop } = useDevice()

// PC 端内嵌导入区域
const IMPORT_MAX = 20
const homeImportRef = ref(null)
const importQueue = ref([])
const importContacts = ref([])
const importing = ref(false)
const importResult = ref(null)
// 内嵌导入查重结果：key = `${date}|${name}` -> 是否已存在
const importDuplicateMap = ref({})
const importDragging = ref(false)
const activeImportControllers = new Map()
let importProcessing = false

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
const userPickerList = ref([{ id: 0, label: '全部用户', value: null }])
const toast = reactive({ show: false, message: '' })

let animTimer = null

const currentUserName = computed(() => {
  return userPickerList.value[currentUserPickerIndex.value]?.label || '全部用户'
})

const isCurrentMonth = computed(() => {
  const today = new Date()
  return calendarYear.value === today.getFullYear() && calendarMonth.value === today.getMonth() + 1
})

const importDoneCount = computed(() => importQueue.value.filter(i => i.status === 'done').length)
const importValidCount = computed(() => importContacts.value.filter(c => c.selected && c.date).length)
const importDuplicateCount = computed(() => Object.values(importDuplicateMap.value).filter(Boolean).length)
const isImportDuplicate = (c) => !!importDuplicateMap.value[`${c.date || ''}|${c.name || ''}`]
const importResultCls = computed(() => {
  if (!importResult.value) return ''
  if (!importResult.value.success) return 'error'
  if ((importResult.value.added || 0) === 0 && (importResult.value.skipped || 0) > 0) return 'warn'
  return 'success'
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
    '每一步，都算数',
    '相信过程，静待花开',
    '笃行者，至千里',
    '好的开始，值得用心经营',
    '每一次回访，都是新的开始',
    '客户至上，用心服务',
    '日积一卒，功不唐捐',
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
    compareText: '↑31%',
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
  const height = window.innerWidth >= 1024 ? 200 : 120

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
    const pickerList = [{ id: 0, label: '全部用户', value: null }]
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
    showToast('加载统计失败')
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
      compareText = currentTotal > 0 ? '↑新增' : '—'
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
    showToast('加载趋势失败')
  }
}

function switchTrendDays(days) {
  if (!loggedIn.value) {
    showToast('请先登录')
    return
  }
  trendDays.value = days
  loadTrend()
}

function prevMonth() {
  if (!loggedIn.value) {
    showToast('请先登录')
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
    showToast('请先登录')
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
    showToast('加载日集失败')
  }
}

function openPriorityModal(id) {
  if (!loggedIn.value) {
    showToast('请先登录')
    return
  }
  if (isAdmin.value) {
    showToast('管理员禁止此操作')
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
    showToast('请先登录')
    return
  }
  if (isAdmin.value) {
    showToast('管理员禁止此操作')
    return
  }
  if (!priorityRemark.value.trim()) {
    showToast('请填写备注')
    return
  }
  try {
    await api.put(`/customers/${currentCustomerId.value}/priority`, {
      is_priority: true,
      remark: priorityRemark.value,
    })
    showToast('设置成功')
    closePriorityModal()
    loadStats()
  } catch (e) {
    showToast('设置失败')
  }
}

function goToAiImport() {
  if (!loggedIn.value) {
    showToast('请先登录')
    return
  }
  if (isAdmin.value) {
    showToast('管理员禁止此操作')
    return
  }
  scrollToHomeImport()
}

// 移动端 / PC 端共用：滚动到内嵌的快速导入区域，不再跳转新页面
function scrollToHomeImport() {
  if (!loggedIn.value) {
    showToast('请先登录')
    return
  }
  if (isAdmin.value) {
    showToast('管理员禁止此操作')
    return
  }
  // 等下一帧 DOM 更新（v-if 可能刚切到显示）
  nextTick(() => {
    const el = homeImportRef.value
    if (!el) return
    // 移动端用 smooth 滚动；PC 端也用 smooth，体验一致
    el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    // 选中 dropzone 聚焦一下，PC 端提示可粘贴
    const dropzone = el.querySelector('.import-dropzone')
    if (dropzone) {
      dropzone.classList.add('flash')
      setTimeout(() => dropzone.classList.remove('flash'), 800)
    }
  })
}

// ── PC 端内嵌导入（复用 aiRecognize 的 SSE 识别 + batch-import 入库） ──
function updateImportItem(id, patch) {
  const idx = importQueue.value.findIndex(it => it.id === id)
  if (idx < 0) return
  importQueue.value[idx] = { ...importQueue.value[idx], ...patch }
}

function addImportImages(files) {
  importResult.value = null
  const imgs = files.filter(f => f.type.startsWith('image/'))
  if (imgs.length === 0) return
  const remaining = IMPORT_MAX - importQueue.value.length
  if (remaining <= 0) {
    showToast(`最多 ${IMPORT_MAX} 张，请先删除部分`)
    return
  }
  const accepted = imgs.slice(0, remaining)
  if (imgs.length > remaining) showToast(`已添加 ${remaining} 张，达上限`)
  const baseId = Date.now()
  const newItems = accepted.map((file, i) => ({
    id: baseId + i,
    fileName: file.name || `pasted-${i}`,
    file,
    thumb: URL.createObjectURL(file),
    status: 'pending',
    contactsFound: 0,
    errorMsg: '',
  }))
  importQueue.value = [...importQueue.value, ...newItems]
  processImportQueue()
}

function chooseImportImage() {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'image/*'
  input.multiple = true
  input.onchange = (e) => addImportImages(Array.from(e.target.files))
  input.click()
}

function onImportDrop(e) {
  importDragging.value = false
  addImportImages(Array.from(e.dataTransfer?.files || []))
}

function onImportPaste(e) {
  // 端已登录非管理员、仅当剪贴板含图片时拦截；纯文本粘贴放行，不干扰输入框
  // 移动端 / PC 端都支持（部分 Android 浏览器在系统剪贴板有图片时也能捕获）
  if (!loggedIn.value || isAdmin.value) return
  const items = e.clipboardData?.items
  if (!items) return
  const files = []
  for (const it of items) {
    if (it.type.startsWith('image/')) {
      const f = it.getAsFile()
      if (f) files.push(f)
    }
  }
  if (files.length === 0) return
  e.preventDefault()
  addImportImages(files)
}

// 增量查重：写入 importDuplicateMap，命中的 contact.selected = false
async function checkImportDuplicatesFor(items) {
  const arr = Array.isArray(items) ? items : []
  if (arr.length === 0) return
  const payload = arr
    .filter(c => c && c.date && c.name)
    .map(({ selected, _sourceId, ...rest }) => rest)
  if (payload.length === 0) return
  try {
    const res = await api.post('/customers/check-duplicates', { contacts: payload })
    const results = Array.isArray(res?.results) ? res.results : []
    const newMap = { ...importDuplicateMap.value }
    for (const r of results) {
      if (!r) continue
      const key = `${r.date || ''}|${r.name || ''}`
      newMap[key] = !!r.exists
    }
    importDuplicateMap.value = newMap
    for (const c of arr) {
      if (!c) continue
      const key = `${c.date || ''}|${c.name || ''}`
      if (newMap[key]) c.selected = false
    }
  } catch (_) {
    // 接口未就绪/失败：静默降级，保持默认全选
  }
}

async function runImportItem(id) {
  const item = importQueue.value.find(it => it.id === id)
  if (!item) return
  const controller = new AbortController()
  activeImportControllers.set(id, controller)
  updateImportItem(id, { status: 'processing', errorMsg: '' })
  try {
    const extracted = await recognizeImage(item.file, controller.signal)
    // 识别期间用户可能已删除该图，丢弃结果
    if (!importQueue.value.find(it => it.id === id)) {
      activeImportControllers.delete(id)
      return
    }
    updateImportItem(id, { status: 'done', contactsFound: extracted.length })
    if (extracted.length) {
      const tagged = extracted.map(c => ({ ...c, _sourceId: id, selected: true }))
      importContacts.value = [...importContacts.value, ...tagged]
      // 增量查重：失败静默降级
      void checkImportDuplicatesFor(tagged)
    }
  } catch (err) {
    if (controller.signal.aborted) {
      activeImportControllers.delete(id)
      return
    }
    if (importQueue.value.find(it => it.id === id)) {
      updateImportItem(id, { status: 'error', errorMsg: err.message || '识别失败' })
    }
  } finally {
    activeImportControllers.delete(id)
  }
}

async function processImportQueue() {
  // 串行识别，避免撞后端限流
  if (importProcessing) return
  importProcessing = true
  try {
    while (true) {
      const next = importQueue.value.find(it => it.status === 'pending')
      if (!next) return
      await runImportItem(next.id)
    }
  } finally {
    importProcessing = false
  }
}

function retryImportItem(id) {
  // 先清掉该图旧识别结果，避免重试后重复入库
  importContacts.value = importContacts.value.filter(c => c._sourceId !== id)
  updateImportItem(id, { status: 'pending', errorMsg: '', contactsFound: 0 })
  processImportQueue()
}

function removeImportItem(id) {
  const ctrl = activeImportControllers.get(id)
  if (ctrl) { ctrl.abort(); activeImportControllers.delete(id) }
  const item = importQueue.value.find(it => it.id === id)
  if (item?.thumb) URL.revokeObjectURL(item.thumb)
  importQueue.value = importQueue.value.filter(it => it.id !== id)
  importContacts.value = importContacts.value.filter(c => c._sourceId !== id)
}

function clearImport() {
  activeImportControllers.forEach(ctrl => ctrl.abort())
  activeImportControllers.clear()
  importQueue.value.forEach(it => { if (it.thumb) URL.revokeObjectURL(it.thumb) })
  importQueue.value = []
  importContacts.value = []
  importResult.value = null
  importDuplicateMap.value = {}
}

async function startHomeImport() {
  if (importing.value) return
  const valid = importContacts.value
    .filter(c => c.selected && c.date)
    // 入库前剥离前端字段，避免污染后端
    .map(({ selected, _sourceId, ...rest }) => rest)
  if (valid.length === 0) return
  importing.value = true
  try {
    const res = await api.post('/customers/batch-import', { contacts: valid })
    importResult.value = {
      success: true,
      added: res.added ?? 0,
      updated: res.updated ?? 0,
      skipped: res.skipped ?? 0,
      skipped_names: Array.isArray(res.skipped_names) ? res.skipped_names : [],
    }
    // 清空已导入的图与联系人（保留 importResult 反馈几秒）
    importQueue.value.forEach(it => { if (it.thumb) URL.revokeObjectURL(it.thumb) })
    importQueue.value = []
    importContacts.value = []
    importDuplicateMap.value = {}
    // 导入改变了统计、趋势和"更新日集"，三者都要刷新
    loadStats()
    loadTrend()
    loadCalendar()
  } catch (err) {
    importResult.value = { success: false, error: err.message || '导入失败' }
  } finally {
    importing.value = false
  }
}

onMounted(() => {
  // PC 端全局粘贴监听：随时 Ctrl+V 截图即可加入导入队列
  window.addEventListener('paste', onImportPaste)
  // 监听 AiImport 批量导入完成，自动刷新更新日集
  offContactsImported = onContactsImported(() => loadCalendar())

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
  window.removeEventListener('paste', onImportPaste)
  // 中止还在跑的识别，释放缩略图 objectURL
  activeImportControllers.forEach(ctrl => ctrl.abort())
  if (offContactsImported) offContactsImported()
  activeImportControllers.clear()
  importQueue.value.forEach(it => { if (it.thumb) URL.revokeObjectURL(it.thumb) })

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

/* 顶部行 */
.page-top-row {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 14px;
  padding-top: 14px;
}

.greeting-section {
  margin-bottom: 0;
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

/* 统计行：移动端 2 列，PC 4 列等宽（见 @media） */
.stats-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-bottom: 10px;
}

.kpi-card {
  border-radius: 14px;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  position: relative;
  overflow: hidden;
}

.kpi-icon {
  width: 32px;
  height: 32px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

.kpi-icon svg {
  width: 18px;
  height: 18px;
}

.kpi-label {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.55);
  font-weight: 600;
}

.kpi-value {
  font-size: 28px;
  font-weight: 800;
  color: #1D1D1F;
  line-height: 1;
}

.kpi-trend {
  font-size: 11px;
  font-weight: 700;
}

.kpi-trend.up {
  color: var(--success);
}

.kpi-trend.down {
  color: var(--danger);
}

.kpi-sub {
  font-size: 11px;
  color: rgba(0, 0, 0, 0.45);
  font-weight: 600;
}

.kpi-orange {
  background: linear-gradient(145deg, #ffffff 0%, #fffcf6 100%);
  border: 1px solid rgba(255, 149, 0, 0.18);
  box-shadow: 0 2px 10px rgba(255, 149, 0, 0.05);
}

.kpi-orange .kpi-icon {
  background: linear-gradient(135deg, #FF9500 0%, #FF6B00 100%);
}

.kpi-green {
  background: linear-gradient(145deg, #ffffff 0%, #f5fdf7 100%);
  border: 1px solid rgba(52, 199, 89, 0.18);
  box-shadow: 0 2px 10px rgba(52, 199, 89, 0.05);
}

.kpi-green .kpi-icon {
  background: linear-gradient(135deg, #34C759 0%, #30D158 100%);
}

.kpi-blue {
  background: linear-gradient(145deg, #ffffff 0%, #f6faff 100%);
  border: 1px solid rgba(0, 122, 255, 0.18);
  box-shadow: 0 2px 10px rgba(0, 122, 255, 0.05);
}

.kpi-blue .kpi-icon {
  background: linear-gradient(135deg, #007AFF 0%, #32ADE6 100%);
}

.kpi-cyan {
  background: linear-gradient(145deg, #ffffff 0%, #f4fbfd 100%);
  border: 1px solid rgba(90, 200, 250, 0.2);
  box-shadow: 0 2px 10px rgba(90, 200, 250, 0.05);
}

.kpi-cyan .kpi-icon {
  background: linear-gradient(135deg, #5AC8FA 0%, #32ADE6 100%);
}

.quick-actions {
  margin-bottom: 0;
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
  display: flex;
  align-items: center;
}

/* 区块标题图标（移动端基础尺寸，PC 端 @media 中放大并调色） */
.title-icon {
  width: 16px;
  height: 16px;
  margin-right: 5px;
  color: var(--primary);
  flex-shrink: 0;
}

.calendar-block .title-icon {
  color: var(--success);
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

/* PC 适配 */
@media (min-width: 1024px) {
  /* 解除 768 断点的 414px 锁宽,PC 下铺满(由外层 .app-main 收口居中) */
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

  .admin-user-select {
    padding-top: 0;
    margin-bottom: 12px;
  }

  /* 顶部行：问候 + 操作横排 */
  .page-top-row {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    padding-top: 0;
    margin-bottom: 18px;
  }

  .greeting-hi {
    font-size: 12px;
  }

  .greeting-quote {
    font-size: 22px;
  }

  /* PC 端隐藏首页拍照导入入口（改用客户趋势下方的内嵌导入区域） */
  .quick-actions {
    display: none;
  }

  /* 统计行：4 列等宽 */
  .stats-row {
    grid-template-columns: repeat(4, 1fr);
    gap: 14px;
    margin-bottom: 16px;
  }

  .kpi-card {
    padding: 18px 16px;
    gap: 14px;
  }

  .kpi-icon {
    width: 38px;
    height: 38px;
  }

  .kpi-icon svg {
    width: 22px;
    height: 22px;
  }

  .kpi-value {
    font-size: 34px;
  }

  .kpi-label {
    font-size: 13px;
  }

  /* 趋势与日历区块在 PC 下卡片化 */
  .section-block {
    padding: 18px 22px;
  }

  .section-title {
    font-size: 16px;
  }

  /* 趋势图 + 更新日集并排:左图右历,1.2:1 */
  .home-grid-2col {
    display: grid;
    grid-template-columns: 1.2fr 1fr;
    gap: 14px;
    align-items: stretch;
    margin-bottom: 16px;
  }

  /* 并排后两个区块自身不再需要下边距 */
  .home-grid-2col .section-block {
    margin-bottom: 0;
  }

  /* 左列日集随右列等高，摘要沉底，视觉对齐（trend + import 已在 grid 之外） */
  .calendar-block {
    display: flex;
    flex-direction: column;
  }
  .calendar-block .cal-summary {
    margin-top: auto;
  }

  /* 弹窗改为居中卡片 */
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
  }

  .modal-handle {
    display: none;
  }

  .modal-title {
    font-size: 18px;
    text-align: center;
    margin-bottom: 16px;
  }

  .priority-input {
    font-size: 14px;
    padding: 12px 14px;
  }

  .btn-full {
    padding: 14px;
  }

  /* Toast 在 PC 下靠上提示 */
  .toast {
    top: 80px;
    bottom: auto;
  }
}

@keyframes pop-in {
  from { opacity: 0; transform: scale(1.05); }
  to { opacity: 1; transform: scale(1); }
}

/* ============ PC 端配色与密度增强（方案 A：丰富颜色 + 增加图标） ============ */
@media (min-width: 1024px) {
  /* 区块标题图标 */
  .section-title {
    display: flex;
    align-items: center;
  }
  .title-icon {
    width: 18px;
    height: 18px;
    margin-right: 7px;
    color: var(--primary);
    flex-shrink: 0;
  }
  .calendar-block .title-icon {
    color: var(--success);
  }

  /* 趋势图加高，曲线更舒展 */
  .trend-chart-wrapper {
    height: 200px;
  }

  /* 日历格自适应填充（去掉 30px 固定） */
  .cal-day-inner {
    width: 100%;
    height: auto;
    aspect-ratio: 1;
    max-width: 46px;
    margin: 0 auto;
  }
  .cal-day-num {
    font-size: 13px;
  }

  /* 趋势摘要：今日新增用绿色突出 */
  .trend-summary-item:nth-child(3) .trend-summary-value {
    color: var(--success);
  }
}

/* ============ 内嵌导入区域（移动端 + PC 端通用，按屏宽调整密度） ============ */
.home-import {
  display: block;
  background: var(--bg-card);
  backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
  border: 1px solid var(--border-glass);
  border-radius: 14px;
  padding: 14px;
  margin-bottom: 10px;
}

.import-progress {
  font-size: 11px;
  color: var(--primary);
  font-weight: 600;
}

/* dropzone：移动端紧凑、点击明显 */
.import-dropzone {
  border: 2px dashed var(--border-glass);
  border-radius: 12px;
  padding: 18px 14px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s;
  background: rgba(0, 122, 255, 0.02);
  margin-top: 10px;
}

.import-dropzone:hover,
.import-dropzone.dragging {
  border-color: var(--primary);
  background: rgba(0, 122, 255, 0.06);
}

.import-dropzone.flash {
  animation: dropzone-flash 0.8s ease;
}

@keyframes dropzone-flash {
  0%   { box-shadow: 0 0 0 0 rgba(0, 122, 255, 0.4); }
  60%  { box-shadow: 0 0 0 12px rgba(0, 122, 255, 0); }
  100% { box-shadow: 0 0 0 0 rgba(0, 122, 255, 0); }
}

.dropzone-icon {
  color: var(--primary);
  margin-bottom: 6px;
  display: flex;
  justify-content: center;
}

.dropzone-icon svg {
  width: 32px;
  height: 32px;
}

.dropzone-text {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 3px;
}

/* dropzone 文案：移动端显示拍照版，PC 端显示粘贴版 */
.dropzone-text-mobile { display: inline; }
.dropzone-text-pc { display: none; }

.dropzone-hint {
  font-size: 11px;
  color: var(--text-secondary);
}

/* 缩略图队列：移动端一行 3 张 */
.import-thumbs {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin-top: 12px;
}

.import-thumb {
  position: relative;
  border-radius: 8px;
  overflow: hidden;
  border: 2px solid var(--border-glass);
  aspect-ratio: 1;
  background: var(--bg-primary);
  transition: border-color 0.2s;
}

.import-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.import-thumb-status {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: linear-gradient(transparent, rgba(0, 0, 0, 0.72));
  color: white;
  font-size: 10px;
  font-weight: 600;
  padding: 12px 4px 4px;
  text-align: center;
}

.import-thumb.processing {
  border-color: var(--primary);
  animation: pulse-border 1.4s ease-in-out infinite;
}

.import-thumb.done {
  border-color: var(--success);
}

.import-thumb.error {
  border-color: var(--danger);
}

.import-thumb-status .processing { color: #5AC8FA; }
.import-thumb-status .done       { color: #34C759; }
.import-thumb-status .error      { color: #FF9500; }

.import-thumb-remove,
.import-thumb-retry {
  position: absolute;
  top: 4px;
  border: none;
  cursor: pointer;
  font-size: 10px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
}

.import-thumb-remove {
  right: 4px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.6);
  color: white;
}

.import-thumb-retry {
  right: 26px;
  padding: 2px 6px;
  border-radius: 5px;
  background: rgba(255, 255, 255, 0.92);
  color: var(--primary);
}

/* 联系人列表：移动端单列 */
.import-contacts {
  margin-top: 14px;
  padding-top: 12px;
  border-top: 1px dashed var(--border-glass);
}

.import-contacts-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  color: var(--text-secondary);
  margin-bottom: 8px;
}

.import-valid-count {
  color: var(--primary);
  font-weight: 600;
}

.import-contact-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 360px;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  padding-right: 2px;
}

.import-contact {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  background: rgba(255, 255, 255, 0.6);
  border: 1px solid var(--border-glass);
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.15s;
}

.import-contact.invalid {
  opacity: 0.5;
}

.import-contact input {
  width: 16px;
  height: 16px;
  accent-color: var(--primary);
  flex-shrink: 0;
}

.import-contact-name {
  flex: 1;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
}

.import-contact-date {
  font-size: 11px;
  color: var(--text-secondary);
  flex-shrink: 0;
}

.import-contact-date.invalid {
  color: var(--danger);
}

/* 操作区：移动端吸底，按钮加大方便点 */
.import-actions {
  display: flex;
  gap: 8px;
  margin-top: 12px;
}

.btn-import-secondary {
  padding: 10px 16px;
  border-radius: 10px;
  background: white;
  color: var(--text-primary);
  border: 1px solid var(--border-glass);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

.btn-import-primary {
  flex: 1;
  padding: 12px 16px;
  border-radius: 10px;
  background: var(--primary);
  color: white;
  font-size: 14px;
  font-weight: 600;
  box-shadow: 0 4px 12px rgba(0, 122, 255, 0.18);
  cursor: pointer;
  border: none;
  min-height: 44px; /* iOS 推荐触摸目标 */
}

.btn-import-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.import-result {
  margin-top: 12px;
  padding: 10px 14px;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 600;
}

.import-result.success { background: rgba(52, 199, 89, 0.1); color: var(--success); }
.import-result.error   { background: rgba(255, 59, 48, 0.1); color: var(--danger); }
.import-result.warn    { background: rgba(255, 149, 0, 0.1); color: #FF9500; }

.import-result-summary { font-size: 12px; font-weight: 600; }

.import-result-detail { margin-top: 6px; font-size: 11px; font-weight: 500; }
.import-result-detail summary {
  cursor: pointer;
  outline: none;
  list-style: none;
  opacity: 0.85;
}
.import-result-detail summary::before {
  content: '▸ ';
  display: inline-block;
  transition: transform 0.2s;
}
.import-result-detail[open] summary::before { content: '▾ '; }
.import-result-detail .skip-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 3px 0;
  color: var(--text-primary);
}
.import-result-detail .skip-reason {
  font-size: 10px;
  font-weight: 600;
  color: #FF9500;
  background: rgba(255, 149, 0, 0.12);
  padding: 1px 5px;
  border-radius: 4px;
}

/* 内嵌导入查重徽章 */
.dup-tag {
  margin-left: 4px;
  color: var(--text-secondary);
  font-weight: 500;
}
.dup-badge {
  display: inline-block;
  margin-left: 4px;
  padding: 1px 5px;
  font-size: 10px;
  font-weight: 600;
  color: #FF9500;
  background: rgba(255, 149, 0, 0.12);
  border-radius: 4px;
  flex-shrink: 0;
}

@keyframes pulse-border {
  0%, 100% { border-color: var(--primary); }
  50% { border-color: rgba(0, 122, 255, 0.35); }
}

/* ============ PC 端内嵌导入区域：密度加大、文案切换为粘贴版 ============ */
@media (min-width: 1024px) {
  .home-import {
    padding: 18px 22px;
    margin-bottom: 14px;
  }

  .import-progress { font-size: 12px; }

  .import-dropzone {
    border-radius: 14px;
    padding: 26px 20px;
    margin-top: 12px;
  }
  .import-dropzone:hover,
  .import-dropzone.dragging {
    transform: translateY(-1px);
  }

  .dropzone-icon { margin-bottom: 8px; }
  .dropzone-icon svg { width: 36px; height: 36px; }

  .dropzone-text { font-size: 14px; margin-bottom: 4px; }
  /* PC 端显示粘贴版文案 */
  .dropzone-text-mobile { display: none; }
  .dropzone-text-pc { display: inline; }

  .dropzone-hint { font-size: 12px; }

  .import-thumbs {
    grid-template-columns: repeat(auto-fill, minmax(96px, 1fr));
    gap: 10px;
    margin-top: 14px;
  }

  .import-thumb { border-radius: 10px; }
  .import-thumb-status {
    font-size: 11px;
    padding: 14px 6px 5px;
  }
  .import-thumb-remove,
  .import-thumb-retry { font-size: 11px; top: 5px; }
  .import-thumb-remove { width: 20px; height: 20px; right: 5px; }
  .import-thumb-retry { right: 30px; padding: 2px 8px; }

  .import-contacts { margin-top: 16px; padding-top: 14px; }
  .import-contacts-header { font-size: 13px; margin-bottom: 10px; }

  .import-contact-list {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 8px;
    max-height: none;
    overflow-y: visible;
  }

  .import-contact {
    padding: 10px 12px;
  }
  .import-contact:hover {
    border-color: var(--primary);
    background: rgba(0, 122, 255, 0.04);
  }
  .import-contact-name { font-size: 14px; }
  .import-contact-date { font-size: 12px; }

  .import-actions {
    gap: 10px;
    margin-top: 14px;
  }
  .btn-import-secondary { padding: 10px 20px; font-size: 14px; }
  .btn-import-primary { padding: 10px 18px; font-size: 14px; min-height: 0; }
  .btn-import-primary:hover:not(:disabled) { transform: translateY(-1px); }

  .import-result { margin-top: 14px; padding: 12px 16px; font-size: 13px; }
  .import-result-summary { font-size: 13px; }
  .import-result-detail { margin-top: 8px; font-size: 12px; }
  .import-result-detail .skip-row { padding: 4px 0; }
  .import-result-detail .skip-reason { font-size: 11px; padding: 1px 6px; }
  .dup-badge { font-size: 11px; padding: 1px 6px; }
}
</style>
