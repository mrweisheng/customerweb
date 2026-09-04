<template>
  <div class="stats-page">
    <header class="st-top">
      <h1 class="st-title">统计</h1>
      <div class="st-sub" v-if="isAdmin">数据范围：{{ scopeUserName }}</div>
    </header>

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

        <!-- 重点客户：dot grid -->
        <div class="bento-card">
          <div class="bento-head">
            <span class="bento-label">重点客户</span>
            <span class="bento-dot-mark priority"></span>
          </div>
          <div class="bento-value">{{ formatNumber(bigNumbers.priority) }}</div>
          <div class="bento-dot-grid">
            <span v-for="i in Math.min(bigNumbers.priority, 8)" :key="i" class="bento-dot-cell filled"></span>
            <span v-for="i in Math.max(0, 8 - Math.min(bigNumbers.priority, 8))" :key="'e' + i" class="bento-dot-cell empty"></span>
          </div>
          <div class="bento-trend-text flat">待回访优先</div>
        </div>
      </div>
    </div>

    <!-- 客户趋势 + 更新日历 -->
    <div class="two-col">
      <!-- 客户趋势（自首页迁入，全系统唯一趋势图） -->
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

      <!-- 更新日历（自首页迁入） -->
      <div class="card calendar-card">
        <div class="card-header">
          <div class="card-title"><svg class="title-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>更新日历</div>
          <div class="cal-nav">
            <div class="cal-nav-btn" @click="prevMonth">‹</div>
            <div class="cal-month-label">{{ calendarYear }}年{{ calendarMonth }}月</div>
            <div class="cal-nav-btn" :class="{ disabled: isCurrentMonth }" @click="nextMonth">›</div>
          </div>
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
      </template>

      <div v-else class="empty-box">
        <div class="empty-icon">💰</div>
        <div class="empty-text">暂无成交记录</div>
        <div class="empty-desc">在客户编辑面板记录成交后，这里展示统计</div>
      </div>
    </div>

    <!-- 成交 / 到店明细（吸收原重点页月度面板，可切月；点行打开编辑面板） -->
    <div class="card detail-card">
      <div class="card-header">
        <div class="dt-tabs">
          <div class="dt-tab" :class="{ active: detailTab === 'deal' }" @click="detailTab = 'deal'">成交明细</div>
          <div class="dt-tab" :class="{ active: detailTab === 'visit' }" @click="detailTab = 'visit'">到店明细</div>
        </div>
        <div class="dt-month">
          <div class="dt-month-btn" @click="shiftMonth(-1)">‹</div>
          <div class="dt-month-text">{{ viewMonthText }}</div>
          <div class="dt-month-btn" :class="{ disabled: monthIsCurrent }" @click="shiftMonth(1)">›</div>
        </div>
      </div>

      <!-- 成交明细 -->
      <template v-if="detailTab === 'deal'">
        <div v-if="monthDeals.length === 0" class="empty-box">
          <div class="empty-icon">🚗</div>
          <div class="empty-text">该月暂无成交</div>
        </div>
        <div v-else class="dt-list">
          <div class="dt-row" v-for="d in monthDeals" :key="d.id" @click="onDealRowTap(d)">
            <span class="dt-date">{{ d.deal_time?.slice(5) || '—' }}</span>
            <span class="dt-name"><span class="lead" v-if="d.lead_date_short">{{ d.lead_date_short }}/</span>{{ d.customer_name || '—' }}</span>
            <span class="dt-tag" :class="d.deal_type">{{ d.deal_type === 'vehicle' ? '🚗 车辆' : '🚦 两地牌' }}</span>
            <span class="dt-desc">{{ dealDesc(d) }}</span>
            <span class="dt-amount" v-if="d.amount !== null && d.amount !== undefined">¥{{ formatAmount(d.amount) }}</span>
          </div>
        </div>
      </template>

      <!-- 到店明细 -->
      <template v-else>
        <div v-if="monthVisits.length === 0" class="empty-box">
          <div class="empty-icon">📍</div>
          <div class="empty-text">该月暂无到店</div>
        </div>
        <div v-else class="dt-list">
          <div class="dt-row" v-for="v in monthVisits" :key="v.id" @click="onVisitRowTap(v)">
            <span class="dt-date">{{ v.visit_time?.slice(5) || '—' }}</span>
            <span class="dt-name"><span class="lead" v-if="v.lead_date_short">{{ v.lead_date_short }}/</span>{{ v.customer_name || '—' }}</span>
            <span class="dt-tag" :class="v.is_deal ? 'ok' : 'no'">{{ v.is_deal ? '✓ 已成交' : '未成交' }}</span>
            <span class="dt-desc">{{ visitDesc(v) }}</span>
          </div>
        </div>
      </template>
    </div>

    <!-- 客户编辑面板 -->
    <CustomerDetailPanel
      v-model:show="showDetailPanel"
      :customer="activeCustomer"
      @updated="refreshAfterPanelUpdate"
    />

    <div class="toast" v-if="toast.show">{{ toast.message }}</div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import api from '../utils/api'
import { useToast } from '../composables/useToast'
import { useScope } from '../composables/useScope'
import CustomerDetailPanel from '../components/CustomerDetailPanel.vue'

const { toast, showToast } = useToast()
const { scopeUserId, isAdmin, scopeParams, scopeUserName, loadUsers } = useScope()

// ── 数据总览 ────────────────────────────────────────────
const bigNumbers = ref({ history: 0, lastMonth: 0, month: 0, priority: 0 })
const compareBars = ref({ lastMonth: 0, month: 0 })
const monthTrendText = ref('—')
const monthTrendDir = ref('flat')
const historyTrendText = ref('累计增长中')
const historySparkData = ref([])

function formatNumber(n) {
  if (n === null || n === undefined || Number.isNaN(n)) return '0'
  return Number(n).toLocaleString('en-US')
}
function formatAmount(n) { return Number(n).toLocaleString() }

// ── 趋势 ────────────────────────────────────────────────
const trendDays = ref(7)
const trendDateLabels = ref([])
const trendSummary = ref(null)
const trendCanvasRef = ref(null)
const historySparkRef = ref(null)

// ── 更新日历 ────────────────────────────────────────────
const calWeekdays = ['日', '一', '二', '三', '四', '五', '六']
const calendarYear = ref(new Date().getFullYear())
const calendarMonth = ref(new Date().getMonth() + 1)
const calendarDays = ref([])
const calendarData = ref(null)
const isCurrentMonth = computed(() =>
  calendarYear.value === new Date().getFullYear() && calendarMonth.value === new Date().getMonth() + 1
)

// ── 成交统计 ────────────────────────────────────────────
const dealStats = ref({
  total_count: 0, customer_count: 0, vehicle_count: 0, plate_count: 0, month_count: 0,
  monthly: { months: [], counts: [] }, by_port: {}, by_plate_kind: {}, recent: [],
})
const dealMonthLabels = computed(() => (dealStats.value.monthly?.months || []).map((ym) => ym.slice(5) + '月'))
const dealMaxCount = computed(() => Math.max(...(dealStats.value.monthly?.counts || [0]), 1))
function pct(part, total) { return total > 0 ? Math.round((part / total) * 100) : 0 }
function dealDesc(d) {
  if (d.deal_type === 'vehicle') return d.vehicle_desc || d.vin || '车辆'
  return [d.port, d.plate_kind, d.plate_number].filter(Boolean).join(' · ')
}
function visitDesc(v) {
  if (v.is_deal) {
    if (v.deal_type === 'vehicle') return v.vehicle_desc ? `成交 · ${v.vehicle_desc}` : '成交 · 车辆'
    const p = [v.port, v.plate_kind].filter(Boolean).join(' ')
    return `成交 · ${p || '两地牌'}`
  }
  return v.needs || '（未填写需求）'
}

// ── 成交/到店明细（月份切换）────────────────────────────
const detailTab = ref('deal') // 'deal' | 'visit'
const viewMonth = ref(currentYM())
const monthDeals = ref([])
const monthVisits = ref([])

function currentYM() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}
// 不允许切到未来月份（>= 当前月即禁用右箭头）
const monthIsCurrent = computed(() => viewMonth.value >= currentYM())
const viewMonthText = computed(() => {
  const [y, m] = viewMonth.value.split('-').map(Number)
  return m === new Date().getMonth() + 1 && y === new Date().getFullYear() ? `${y}年${m}月（本月）` : `${y}年${m}月`
})

function shiftMonth(delta) {
  const [y, m] = viewMonth.value.split('-').map(Number)
  const d = new Date(y, m - 1 + delta, 1)
  viewMonth.value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  loadMonthData()
}

async function loadMonthData() {
  try {
    const params = scopeParams({ month: viewMonth.value })
    const [dealsRes, visitsRes] = await Promise.all([
      api.get('/customers/deal-list', { params }),
      api.get('/customers/visit-list', { params }),
    ])
    monthDeals.value = (dealsRes || []).map((d) => ({
      ...d,
      lead_date_short: d.lead_date ? d.lead_date.slice(3).replace(/-/g, '') : '',
    }))
    monthVisits.value = (visitsRes || []).map((v) => ({
      ...v,
      lead_date_short: v.lead_date ? v.lead_date.slice(3).replace(/-/g, '') : '',
    }))
  } catch (e) {
    showToast(e.message || '加载明细失败')
  }
}

// ── 编辑面板（明细行点击打开；is_priority 按业务规则推定，面板内列表为准）──
const showDetailPanel = ref(false)
const activeCustomer = ref({})

function tryOpenPanel(c) {
  if (isAdmin.value) {
    showToast('管理员仅查看，不可编辑')
    return
  }
  activeCustomer.value = c
  showDetailPanel.value = true
}

function onDealRowTap(d) {
  // 成交后自动移出重点 → is_priority 推定为 false
  tryOpenPanel({
    id: d.customer_id,
    customer_name: d.customer_name,
    lead_date: d.lead_date,
    lead_date_short: d.lead_date_short,
    is_priority: false,
    last_visit_at: d.deal_time || null,
  })
}

function onVisitRowTap(v) {
  // 到店登记自动标重点 → is_priority 推定为 true
  tryOpenPanel({
    id: v.customer_id,
    customer_name: v.customer_name,
    lead_date: v.lead_date,
    lead_date_short: v.lead_date_short,
    is_priority: true,
    last_visit_at: v.visit_time || null,
  })
}

// ── 数据加载 ────────────────────────────────────────────
async function loadAll() {
  await Promise.all([loadStats(), loadTrend(), loadDealStats(), loadCalendar(), loadMonthData()])
}

async function loadStats() {
  try {
    const res = await api.get('/customers/stats', { params: scopeParams() })
    const totalCount = res.total_count || 0
    const lastMonthTotal = res.last_month_total || 0
    const lastMonthCount = res.last_month_count || 0
    const monthCount = res.month_count || 0
    const priorityCount = res.priority_count || 0

    const lastMonthBar = totalCount > 0 ? Math.min(100, (lastMonthTotal / totalCount) * 100) : 0
    const monthBar = totalCount > 0 ? Math.min(100, (monthCount / totalCount) * 100) : 0

    let mTrendText = '— 持平', mTrendDir = 'flat'
    if (lastMonthCount > 0) {
      const diff = monthCount - lastMonthCount
      if (diff > 0) { mTrendText = `↑ 多 ${diff} 位`; mTrendDir = 'up' }
      else if (diff < 0) { mTrendText = `↓ 少 ${Math.abs(diff)} 位`; mTrendDir = 'down' }
    } else if (monthCount > 0) {
      mTrendText = '↑ 新增'
      mTrendDir = 'up'
    }

    const historyText = lastMonthTotal > 0
      ? `累计 ${formatNumber(totalCount)}，上月 ${formatNumber(lastMonthTotal)}`
      : `累计 ${formatNumber(totalCount)}`

    compareBars.value = { lastMonth: Math.round(lastMonthBar), month: Math.round(monthBar) }
    monthTrendText.value = mTrendText
    monthTrendDir.value = mTrendDir
    historyTrendText.value = historyText

    animateBigNumbers({ history: totalCount, lastMonth: lastMonthTotal, month: monthCount, priority: priorityCount })
  } catch (e) {
    showToast(e.message || '加载统计失败')
  }
}

let bigNumberAnimTimer = null

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

async function loadTrend() {
  try {
    const res = await api.get('/customers/trend', { params: scopeParams({ days: trendDays.value }) })
    const counts = res.counts || []
    const prevCounts = res.prev_counts || []
    const dates = res.dates || []

    const labels = dates.map((d, i) => (i === 0 || i === dates.length - 1 || i === Math.floor(dates.length / 2)) ? d : '')
    const currentTotal = counts.reduce((a, b) => a + b, 0)
    const prevTotal = prevCounts.reduce((a, b) => a + b, 0)
    let compareDir = 'up', compareText = '—'
    if (prevTotal > 0) {
      const p = Math.round(((currentTotal - prevTotal) / prevTotal) * 100)
      compareDir = p >= 0 ? 'up' : 'down'
      compareText = `${p >= 0 ? '↑' : '↓'} ${Math.abs(p)}%`
    } else {
      compareText = currentTotal > 0 ? '↑新增' : '—'
    }

    trendDateLabels.value = labels
    trendSummary.value = { currentTotal, prevTotal, todayCount: counts[counts.length - 1] || 0, compareDir, compareText }
    // 历史客户 sparkline：最近 7 天每日新增
    historySparkData.value = counts.slice(-7)
    nextTick(() => setTimeout(() => {
      drawTrendCanvas(counts, prevCounts)
      drawHistorySpark()
    }, 50))
  } catch (e) {
    showToast(e.message || '加载趋势失败')
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

  ctx.beginPath()
  ctx.strokeStyle = '#007AFF'
  ctx.lineWidth = 1.5
  ctx.lineJoin = 'round'
  ctx.lineCap = 'round'
  pts.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y))
  ctx.stroke()

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

function switchTrendDays(days) {
  trendDays.value = days
  loadTrend()
}

// ── 更新日历 ────────────────────────────────────────────
function prevMonth() {
  let year = calendarYear.value
  let month = calendarMonth.value - 1
  if (month < 1) { month = 12; year-- }
  loadCalendar(year, month)
}

function nextMonth() {
  const today = new Date()
  if (calendarYear.value > today.getFullYear() ||
      (calendarYear.value === today.getFullYear() && calendarMonth.value >= today.getMonth() + 1)) {
    return
  }
  let year = calendarYear.value
  let month = calendarMonth.value + 1
  if (month > 12) { month = 1; year++ }
  loadCalendar(year, month)
}

async function loadCalendar(year, month) {
  try {
    const params = scopeParams()
    if (year && month) { params.year = year; params.month = month }
    const res = await api.get('/customers/calendar', { params })

    const firstDay = new Date(res.year, res.month - 1, 1).getDay()
    const days = res.days || []
    const gridDays = []
    for (let i = 0; i < firstDay; i++) gridDays.push(null)
    for (const d of days) gridDays.push(d)

    calendarYear.value = res.year
    calendarMonth.value = res.month
    calendarDays.value = gridDays
    calendarData.value = {
      updated_count: res.updated_count,
      missed_count: res.missed_count,
      update_rate: res.update_rate,
    }
  } catch (e) {
    showToast(e.message || '加载日历失败')
  }
}

// ── 成交统计 ────────────────────────────────────────────
async function loadDealStats() {
  try {
    dealStats.value = await api.get('/customers/deal-stats', { params: scopeParams() })
  } catch (e) {
    showToast(e.message || '加载成交统计失败')
  }
}

// 面板内数据变更后刷新统计与明细
function refreshAfterPanelUpdate() {
  loadStats()
  loadDealStats()
  loadMonthData()
}

// ── 生命周期 ────────────────────────────────────────────
watch(scopeUserId, () => loadAll())

onMounted(() => {
  loadAll()
  if (isAdmin.value) loadUsers()
})

onUnmounted(() => {
  if (bigNumberAnimTimer) clearTimeout(bigNumberAnimTimer)
})
</script>

<style scoped>
.stats-page {
  padding: 18px 14px 80px;
  min-height: 100vh;
  background: var(--bg-primary);
}

.st-top { margin-bottom: 14px; }
.st-title { font-size: 24px; font-weight: 700; color: var(--text-primary); letter-spacing: 0.3px; line-height: 1.2; }
.st-sub { font-size: 12px; color: var(--text-secondary); margin-top: 3px; }

.card {
  background: var(--bg-card);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid var(--border-glass);
  border-radius: 16px;
  padding: 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
  margin-bottom: 13px;
}
.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}
.card-title {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 15px;
  font-weight: 700;
  color: var(--text-primary);
}
.title-icon { width: 16px; height: 16px; color: var(--primary); }

/* ── Bento 总览 ── */
.bento-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.bento-card {
  background: #fff;
  border: 1px solid var(--border-glass);
  border-radius: 14px;
  padding: 14px;
  display: flex;
  flex-direction: column;
}
.bento-main { grid-column: 1 / -1; }
.bento-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
.bento-label { font-size: 12px; color: var(--text-secondary); font-weight: 600; }
.bento-tag {
  font-size: 9px; font-weight: 800; letter-spacing: 1px;
  color: var(--primary); background: var(--primary-light);
  padding: 2px 7px; border-radius: 99px;
}
.bento-value { font-size: 32px; font-weight: 700; color: var(--text-primary); letter-spacing: -0.5px; line-height: 1.1; }
.bento-main .bento-value { font-size: 38px; }
.bento-spark-wrap { margin-top: 8px; height: 36px; }
.bento-spark-canvas { display: block; }
.bento-trend-row { display: flex; align-items: center; gap: 6px; margin-top: 8px; }
.bento-trend-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--success); }
.bento-trend-text { font-size: 11px; color: var(--text-secondary); font-weight: 500; }
.bento-trend-text.up { color: #28a745; }
.bento-trend-text.down { color: #d70015; }
.bento-compare-bar {
  height: 6px; border-radius: 99px; background: var(--bg-primary);
  margin-top: auto; overflow: hidden;
}
.bento-compare-fill { height: 100%; border-radius: 99px; }
.bento-compare-fill.last { background: rgba(0, 122, 255, 0.3); }
.bento-compare-fill.current { background: var(--primary); }
.bento-dot-mark { width: 8px; height: 8px; border-radius: 50%; }
.bento-dot-mark.month { background: rgba(0, 122, 255, 0.3); }
.bento-dot-mark.current { background: var(--primary); }
.bento-dot-mark.priority { background: var(--warning); }
.bento-dot-grid { display: flex; gap: 4px; margin-top: auto; flex-wrap: wrap; }
.bento-dot-cell { width: 8px; height: 8px; border-radius: 2px; }
.bento-dot-cell.filled { background: var(--warning); }
.bento-dot-cell.empty { background: var(--bg-primary); }

/* ── 趋势 ── */
.trend-pills { display: flex; gap: 3px; background: var(--bg-primary); padding: 3px; border-radius: 9px; }
.pill { font-size: 11px; font-weight: 700; padding: 5px 12px; border-radius: 7px; color: var(--text-secondary); cursor: pointer; }
.pill.active { background: #fff; color: var(--primary); box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1); }
.legend { display: flex; gap: 14px; font-size: 11px; color: var(--text-secondary); margin-bottom: 6px; }
.legend-item { display: flex; align-items: center; gap: 5px; }
.legend-dot { width: 8px; height: 8px; border-radius: 2px; }
.legend-dot.current { background: var(--primary); }
.legend-dot.previous { background: #C7C7CC; }
.chart-container { width: 100%; }
.chart-container canvas { display: block; width: 100%; }
.x-labels {
  display: flex; justify-content: space-between;
  font-size: 10px; color: var(--text-tertiary);
  padding: 6px 4px 0;
}
.summary { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-top: 12px; }
.summary-item { background: var(--bg-primary); border-radius: 10px; padding: 10px 12px; text-align: center; }
.summary-value { font-size: 18px; font-weight: 700; color: var(--text-primary); }
.summary-value.secondary { color: var(--text-secondary); }
.summary-label { font-size: 10px; color: var(--text-tertiary); margin-top: 2px; font-weight: 600; }
.summary-compare { font-size: 11px; font-weight: 700; margin-top: 3px; }
.summary-compare.up { color: #28a745; }
.summary-compare.down { color: #d70015; }

/* ── 更新日历 ── */
.cal-nav { display: flex; align-items: center; gap: 6px; }
.cal-nav-btn {
  width: 26px; height: 26px; border-radius: 8px;
  background: var(--bg-primary); color: var(--text-secondary);
  display: flex; align-items: center; justify-content: center;
  font-size: 14px; cursor: pointer;
}
.cal-nav-btn.disabled { opacity: 0.3; }
.cal-month-label { font-size: 12px; font-weight: 700; color: var(--text-primary); min-width: 66px; text-align: center; }
.cal-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; }
.cal-cell-header { text-align: center; font-size: 10px; color: var(--text-tertiary); font-weight: 700; padding-bottom: 4px; }
.cal-day-inner {
  aspect-ratio: 1; border-radius: 8px;
  display: flex; align-items: center; justify-content: center;
  font-size: 11px; font-weight: 600; color: var(--text-secondary);
  background: var(--bg-primary);
}
.cal-updated { background: rgba(52, 199, 89, 0.14); color: #28a745; }
.cal-missed { background: rgba(255, 59, 48, 0.06); color: rgba(255, 59, 48, 0.45); }
.cal-summary {
  display: flex; align-items: center;
  margin-top: 14px; padding: 10px;
  background: var(--bg-primary); border-radius: 10px;
}
.cal-summary-item { flex: 1; text-align: center; }
.cal-summary-value { font-size: 17px; font-weight: 700; }
.cal-text-updated { color: #28a745; }
.cal-text-missed { color: #d70015; }
.cal-text-rate { color: var(--primary); }
.cal-summary-label { font-size: 10px; color: var(--text-tertiary); margin-top: 1px; font-weight: 600; }
.cal-summary-divider { width: 1px; height: 26px; background: var(--border-glass); }

/* ── 成交统计 ── */
.deal-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
.deal-cell { background: var(--bg-primary); border-radius: 11px; padding: 11px 8px; text-align: center; }
.deal-val { font-size: 20px; font-weight: 700; color: var(--text-primary); }
.deal-lbl { font-size: 10.5px; color: var(--text-secondary); margin-top: 2px; font-weight: 600; }
.deal-section { margin-top: 16px; }
.deal-sub-title { font-size: 13px; font-weight: 700; color: var(--text-primary); margin-bottom: 10px; }
.deal-bars { display: flex; align-items: flex-end; gap: 10px; height: 110px; }
.deal-bar-item { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 5px; height: 100%; justify-content: flex-end; }
.deal-bar-num { font-size: 10px; font-weight: 700; color: var(--text-secondary); }
.deal-bar-track { width: 100%; max-width: 40px; height: 100%; background: var(--bg-primary); border-radius: 7px 7px 3px 3px; display: flex; align-items: flex-end; overflow: hidden; }
.deal-bar-fill { width: 100%; background: linear-gradient(180deg, #5AC8FA, #007AFF); border-radius: 7px 7px 3px 3px; }
.deal-bar-label { font-size: 10px; color: var(--text-tertiary); font-weight: 600; }
.deal-row { display: flex; align-items: center; gap: 10px; margin-bottom: 9px; }
.deal-row:last-child { margin-bottom: 0; }
.deal-row-name { width: 64px; flex-shrink: 0; font-size: 12px; color: var(--text-secondary); font-weight: 600; }
.deal-row-bar { flex: 1; height: 8px; border-radius: 99px; background: var(--bg-primary); overflow: hidden; }
.deal-row-bar .fill { height: 100%; border-radius: 99px; }
.fill.vehicle { background: var(--primary); }
.fill.plate { background: var(--purple); }
.fill.port { background: var(--teal); }
.fill.kind { background: var(--warning); }
.deal-row-num { width: 26px; flex-shrink: 0; text-align: right; font-size: 12px; font-weight: 700; color: var(--text-primary); }

/* ── 明细 ── */
.dt-tabs { display: flex; gap: 3px; background: var(--bg-primary); padding: 3px; border-radius: 10px; }
.dt-tab { font-size: 12px; font-weight: 700; padding: 6px 14px; border-radius: 8px; color: var(--text-secondary); cursor: pointer; }
.dt-tab.active { background: #fff; color: var(--primary); box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1); }
.dt-month { display: flex; align-items: center; gap: 6px; }
.dt-month-btn {
  width: 26px; height: 26px; border-radius: 8px;
  background: var(--bg-primary); color: var(--text-secondary);
  display: flex; align-items: center; justify-content: center;
  font-size: 14px; cursor: pointer;
}
.dt-month-btn.disabled { opacity: 0.3; }
.dt-month-text { font-size: 12px; font-weight: 700; color: var(--text-primary); white-space: nowrap; }
.dt-list { display: flex; flex-direction: column; }
.dt-row {
  display: flex; align-items: center; gap: 9px;
  padding: 11px 2px; border-bottom: 1px solid var(--border-glass);
  font-size: 13px; cursor: pointer;
}
.dt-row:last-child { border-bottom: none; }
.dt-row:active { background: rgba(0, 0, 0, 0.02); }
.dt-date { font-size: 11px; font-weight: 800; color: var(--text-tertiary); width: 36px; flex-shrink: 0; }
.dt-name { font-weight: 600; color: var(--text-primary); flex-shrink: 0; max-width: 110px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.dt-name .lead { color: var(--text-tertiary); font-weight: 600; font-size: 10.5px; }
.dt-tag { font-size: 10px; font-weight: 800; padding: 2px 8px; border-radius: 99px; flex-shrink: 0; }
.dt-tag.vehicle { background: rgba(0, 122, 255, 0.1); color: var(--primary); }
.dt-tag.plate { background: rgba(175, 82, 222, 0.1); color: var(--purple); }
.dt-tag.ok { background: rgba(52, 199, 89, 0.12); color: #28a745; }
.dt-tag.no { background: rgba(255, 149, 0, 0.12); color: #c77700; }
.dt-desc { flex: 1; min-width: 0; color: var(--text-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.dt-amount { font-weight: 800; font-size: 12.5px; color: #EA580C; flex-shrink: 0; }

/* ── 空态 ── */
.empty-box { text-align: center; padding: 32px 20px; }
.empty-icon { font-size: 34px; margin-bottom: 10px; }
.empty-text { font-size: 14px; font-weight: 600; color: var(--text-primary); }
.empty-desc { font-size: 12px; color: var(--text-tertiary); margin-top: 5px; }

/* ── PC ── */
@media (min-width: 1024px) {
  .stats-page { padding: 24px 28px 40px; }
  .st-title { font-size: 26px; }
  .card { padding: 20px 22px; border-radius: 18px; }
  .two-col { display: grid; grid-template-columns: 1.55fr 1fr; gap: 13px; margin-bottom: 0; }
  .two-col .card { margin-bottom: 13px; }
  .bento-grid { grid-template-columns: repeat(4, 1fr); gap: 12px; }
  .bento-main { grid-column: auto; }
  .deal-grid { gap: 10px; }
  .deal-cell { padding: 14px 10px; }
  .deal-bars { gap: 16px; height: 130px; }
  .dt-row:hover { background: rgba(0, 0, 0, 0.02); border-radius: 8px; }
}

/* ── 超宽屏 ── */
@media (min-width: 1440px) {
  .deal-grid { grid-template-columns: repeat(4, 1fr); }
}
</style>
