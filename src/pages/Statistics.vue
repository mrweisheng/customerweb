<template>
  <div class="stats-page">
    <header class="st-top">
      <h1 class="st-title">统计</h1>
      <div class="st-sub" v-if="isAdmin">数据范围：{{ scopeUserName }}</div>
    </header>

    <!-- 数据总览：Bento 大数字矩阵 -->
    <div class="card overview-card">
      <div class="card-header">
        <div class="card-title"><span class="title-chip ti-blue"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg></span>数据总览</div>
      </div>
      <div class="bento-grid">
        <!-- 主卡：历史客户 + sparkline -->
        <div class="bento-card bento-main tint-blue">
          <div class="bento-head">
            <div class="bento-label-wrap">
              <span class="bento-icon bi-blue"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg></span>
              <span class="bento-label">历史客户</span>
            </div>
            <span class="bento-tag">ALL</span>
          </div>
          <div class="bento-value">{{ formatNumber(bigNumbers.history) }}</div>
          <div class="bento-spark-wrap">
            <BaseChart :option="sparkOption" height="36px" />
          </div>
          <div class="bento-trend-row">
            <span class="bento-trend-dot"></span>
            <span class="bento-trend-text">{{ historyTrendText }}</span>
          </div>
        </div>

        <!-- 上月客户：对比条 -->
        <div class="bento-card tint-purple">
          <div class="bento-head">
            <div class="bento-label-wrap">
              <span class="bento-icon bi-purple"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg></span>
              <span class="bento-label">上月客户</span>
            </div>
          </div>
          <div class="bento-value">{{ formatNumber(bigNumbers.lastMonth) }}</div>
          <div class="bento-compare-bar">
            <div class="bento-compare-fill last" :style="{ width: compareBars.lastMonth + '%' }"></div>
          </div>
          <div class="bento-trend-text flat">— 持平</div>
        </div>

        <!-- 本月客户：对比条 + 趋势 -->
        <div class="bento-card tint-green">
          <div class="bento-head">
            <div class="bento-label-wrap">
              <span class="bento-icon bi-green"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg></span>
              <span class="bento-label">本月客户</span>
            </div>
          </div>
          <div class="bento-value">{{ formatNumber(bigNumbers.month) }}</div>
          <div class="bento-compare-bar">
            <div class="bento-compare-fill current" :style="{ width: compareBars.month + '%' }"></div>
          </div>
          <div class="bento-trend-text" :class="monthTrendDir">{{ monthTrendText }}</div>
        </div>

        <!-- 重点客户：dot grid -->
        <div class="bento-card tint-orange">
          <div class="bento-head">
            <div class="bento-label-wrap">
              <span class="bento-icon bi-orange"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg></span>
              <span class="bento-label">重点客户</span>
            </div>
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
          <div class="card-title"><span class="title-chip ti-green"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg></span>客户趋势</div>
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
        <BaseChart :option="trendOption" :height="trendChartHeight" />
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
          <div class="card-title"><span class="title-chip ti-purple"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg></span>更新日历</div>
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
            <div class="cal-summary-label"><svg class="cal-label-icon c-updated" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>已更新天数</div>
          </div>
          <div class="cal-summary-divider"></div>
          <div class="cal-summary-item">
            <div class="cal-summary-value cal-text-missed">{{ calendarData.missed_count }}</div>
            <div class="cal-summary-label"><svg class="cal-label-icon c-missed" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>未更新天数</div>
          </div>
          <div class="cal-summary-divider"></div>
          <div class="cal-summary-item">
            <div class="cal-summary-value cal-text-rate">{{ calendarData.update_rate }}%</div>
            <div class="cal-summary-label"><svg class="cal-label-icon c-rate" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="5" x2="5" y2="19"/><circle cx="6.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/></svg>更新率</div>
          </div>
        </div>
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

    <!-- 成交统计 -->
    <div class="card deal-stats-card">
      <div class="card-header">
        <div class="card-title"><span class="title-chip ti-orange"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg></span>成交统计</div>
      </div>

      <!-- 成交总览 4 格（客户数/单数/车辆/两地牌） -->
      <div class="deal-grid">
        <div class="deal-cell">
          <span class="deal-cell-icon di-blue"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg></span>
          <div class="deal-val">{{ dealStats.customer_count }}</div>
          <div class="deal-lbl">成交客户数</div>
        </div>
        <div class="deal-cell">
          <span class="deal-cell-icon di-green"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg></span>
          <div class="deal-val">{{ dealStats.total_count }}</div>
          <div class="deal-lbl">成交单数</div>
        </div>
        <div class="deal-cell">
          <span class="deal-cell-icon di-purple"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9-1.8-.5-4.5-1.1-4.5-1.1s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.5 2.8C1.4 12.4 1 13.2 1 14v2c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/><path d="M9 17h6"/></svg></span>
          <div class="deal-val">{{ dealStats.vehicle_count }}</div>
          <div class="deal-lbl">车辆</div>
        </div>
        <div class="deal-cell">
          <span class="deal-cell-icon di-orange"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="20" height="12" rx="2"/><line x1="6" y1="10" x2="10" y2="10"/><line x1="6" y1="14" x2="9" y2="14"/><line x1="14" y1="14" x2="18" y2="14"/></svg></span>
          <div class="deal-val">{{ dealStats.plate_count }}</div>
          <div class="deal-lbl">两地牌</div>
        </div>
      </div>

      <template v-if="dealStats.total_count">
        <!-- 月度成交单数（ECharts 柱状图） -->
        <div class="deal-section">
          <div class="deal-sub-title">月度成交单数</div>
          <BaseChart :option="dealMonthlyOption" :height="dealChartHeight" />
        </div>

        <!-- 成交结构 -->
        <div class="deal-section">
          <div class="deal-sub-title">成交结构</div>
          <div class="deal-row">
            <span class="deal-row-name"><span class="row-dot vehicle"></span>车辆</span>
            <div class="deal-row-bar"><div class="fill vehicle" :style="{ width: pct(dealStats.vehicle_count, dealStats.total_count) + '%' }"></div></div>
            <span class="deal-row-num">{{ dealStats.vehicle_count }}</span>
          </div>
          <div class="deal-row">
            <span class="deal-row-name"><span class="row-dot plate"></span>两地牌</span>
            <div class="deal-row-bar"><div class="fill plate" :style="{ width: pct(dealStats.plate_count, dealStats.total_count) + '%' }"></div></div>
            <span class="deal-row-num">{{ dealStats.plate_count }}</span>
          </div>
          <template v-if="dealStats.plate_count">
            <div class="deal-row" v-for="(c, port) in dealStats.by_port" :key="'port-' + port">
              <span class="deal-row-name"><span class="row-dot port"></span>{{ port }}</span>
              <div class="deal-row-bar"><div class="fill port" :style="{ width: pct(c, dealStats.plate_count) + '%' }"></div></div>
              <span class="deal-row-num">{{ c }}</span>
            </div>
          </template>
          <template v-if="dealStats.plate_count">
            <div class="deal-row" v-for="(c, kind) in dealStats.by_plate_kind" :key="'kind-' + kind">
              <span class="deal-row-name"><span class="row-dot kind"></span>{{ kind }}</span>
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
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import api from '../utils/api'
import { useToast } from '../composables/useToast'
import { useScope } from '../composables/useScope'
import CustomerDetailPanel from '../components/CustomerDetailPanel.vue'
import BaseChart from '../components/BaseChart.vue'

const { toast, showToast } = useToast()
const { scopeUserId, isAdmin, scopeParams, scopeUserName, loadUsers } = useScope()

// ── 数据总览 ────────────────────────────────────────────
const bigNumbers = ref({ history: 0, lastMonth: 0, month: 0, priority: 0 })
const compareBars = ref({ lastMonth: 0, month: 0 })
const monthTrendText = ref('—')
const monthTrendDir = ref('flat')
const historyTrendText = ref('累计增长中')

function formatNumber(n) {
  if (n === null || n === undefined || Number.isNaN(n)) return '0'
  return Number(n).toLocaleString('en-US')
}
function formatAmount(n) { return Number(n).toLocaleString() }

// ── 趋势 ────────────────────────────────────────────────
const trendDays = ref(7)
const trendDates = ref([])
const trendCounts = ref([])
const trendPrevCounts = ref([])
const trendSummary = ref(null)

// PC / 移动端分别给图表不同的展示高度
const isPC = ref(window.innerWidth >= 1024)
const onWindowResize = () => { isPC.value = window.innerWidth >= 1024 }
const trendChartHeight = computed(() => (isPC.value ? '170px' : '120px'))
const dealChartHeight = computed(() => (isPC.value ? '150px' : '120px'))

// 三张图共用的悬浮提示样式：PC 悬停 / 移动端点按都会显示数值
const tooltipStyle = {
  trigger: 'axis',
  confine: true,
  backgroundColor: 'rgba(255,255,255,0.98)',
  borderColor: 'rgba(0,0,0,0.06)',
  borderRadius: 10,
  padding: [8, 12],
  textStyle: { color: '#1D1D1F', fontSize: 12 },
  extraCssText: 'box-shadow: 0 4px 16px rgba(0,0,0,0.10);',
}

// 客户趋势：本期/上期双折线
const trendOption = computed(() => ({
  grid: { left: 6, right: 12, top: 14, bottom: 2, containLabel: true },
  tooltip: { ...tooltipStyle, valueFormatter: (v) => `${v ?? 0} 位` },
  xAxis: {
    type: 'category',
    boundaryGap: false,
    data: trendDates.value.map((d) => d.slice(5)),
    axisTick: { show: false },
    axisLine: { lineStyle: { color: 'rgba(0,0,0,0.08)' } },
    axisLabel: { color: '#8E8E93', fontSize: 10 },
  },
  yAxis: {
    type: 'value',
    minInterval: 1,
    axisLabel: { color: '#8E8E93', fontSize: 10 },
    splitLine: { lineStyle: { color: 'rgba(0,0,0,0.05)' } },
  },
  series: [
    {
      name: '上期',
      type: 'line',
      smooth: true,
      data: trendPrevCounts.value,
      showSymbol: false,
      symbol: 'circle',
      symbolSize: 6,
      lineStyle: { width: 2, color: '#C7C7CC' },
      itemStyle: { color: '#C7C7CC' },
      areaStyle: { color: 'rgba(199,199,204,0.10)' },
    },
    {
      name: '本期',
      type: 'line',
      smooth: true,
      data: trendCounts.value,
      showSymbol: false,
      symbol: 'circle',
      symbolSize: 6,
      lineStyle: { width: 2, color: '#007AFF' },
      itemStyle: { color: '#007AFF' },
      areaStyle: {
        color: {
          type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [
            { offset: 0, color: 'rgba(0,122,255,0.16)' },
            { offset: 1, color: 'rgba(0,122,255,0)' },
          ],
        },
      },
    },
  ],
}))

// 历史客户卡片：最近 7 天新增迷你曲线
const sparkCounts = computed(() => trendCounts.value.slice(-7))
const sparkOption = computed(() => ({
  grid: { left: 2, right: 2, top: 5, bottom: 5 },
  tooltip: { ...tooltipStyle, valueFormatter: (v) => `${v ?? 0} 位` },
  xAxis: { type: 'category', boundaryGap: false, data: trendDates.value.slice(-7).map((d) => d.slice(5)), show: false },
  yAxis: { type: 'value', show: false },
  series: [
    {
      type: 'line',
      smooth: true,
      data: sparkCounts.value,
      showSymbol: false,
      symbol: 'circle',
      symbolSize: 6,
      lineStyle: { width: 1.5, color: '#007AFF' },
      itemStyle: { color: '#007AFF' },
      areaStyle: {
        color: {
          type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [
            { offset: 0, color: 'rgba(0,122,255,0.18)' },
            { offset: 1, color: 'rgba(0,122,255,0)' },
          ],
        },
      },
    },
  ],
}))

// 月度成交单数柱状图
const dealMonthlyOption = computed(() => ({
  grid: { left: 6, right: 6, top: 22, bottom: 2, containLabel: true },
  tooltip: { ...tooltipStyle, valueFormatter: (v) => `${v ?? 0} 单` },
  xAxis: {
    type: 'category',
    data: (dealStats.value.monthly?.months || []).map((ym) => ym.slice(5) + '月'),
    axisTick: { show: false },
    axisLine: { lineStyle: { color: 'rgba(0,0,0,0.08)' } },
    axisLabel: { color: '#8E8E93', fontSize: 10 },
  },
  yAxis: {
    type: 'value',
    minInterval: 1,
    axisLabel: { color: '#8E8E93', fontSize: 10 },
    splitLine: { lineStyle: { color: 'rgba(0,0,0,0.05)' } },
  },
  series: [
    {
      type: 'bar',
      data: dealStats.value.monthly?.counts || [],
      barMaxWidth: 26,
      itemStyle: {
        borderRadius: [6, 6, 2, 2],
        color: {
          type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [
            { offset: 0, color: '#5AC8FA' },
            { offset: 1, color: '#007AFF' },
          ],
        },
      },
      label: { show: true, position: 'top', fontSize: 10, fontWeight: 700, color: '#6E6E73' },
    },
  ],
}))

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
    monthDeals.value = (Array.isArray(dealsRes) ? dealsRes : []).map((d) => ({
      ...d,
      lead_date_short: d.lead_date ? d.lead_date.slice(3).replace(/-/g, '') : '',
    }))
    monthVisits.value = (Array.isArray(visitsRes) ? visitsRes : []).map((v) => ({
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
    const counts = Array.isArray(res.counts) ? res.counts : []
    const prevCounts = Array.isArray(res.prev_counts) ? res.prev_counts : []
    const dates = Array.isArray(res.dates) ? res.dates : []

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

    trendDates.value = dates
    trendCounts.value = counts
    trendPrevCounts.value = prevCounts
    trendSummary.value = { currentTotal, prevTotal, todayCount: counts[counts.length - 1] || 0, compareDir, compareText }
  } catch (e) {
    showToast(e.message || '加载趋势失败')
  }
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
    const days = Array.isArray(res.days) ? res.days : []
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
  window.addEventListener('resize', onWindowResize)
  loadAll()
  if (isAdmin.value) loadUsers()
})

onUnmounted(() => {
  window.removeEventListener('resize', onWindowResize)
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
.title-chip {
  width: 26px; height: 26px; border-radius: 8px;
  display: inline-flex; align-items: center; justify-content: center;
  background: rgba(0, 122, 255, 0.12); color: var(--primary);
  flex-shrink: 0;
}
.title-chip svg { width: 15px; height: 15px; }
.title-chip.ti-blue { background: rgba(0, 122, 255, 0.12); color: #007AFF; }
.title-chip.ti-green { background: rgba(52, 199, 89, 0.14); color: #34C759; }
.title-chip.ti-purple { background: rgba(175, 82, 222, 0.12); color: #AF52DE; }
.title-chip.ti-orange { background: rgba(255, 149, 0, 0.14); color: #FF9500; }

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
/* 每张指标卡一个专属色的角落光晕，低透明度不抢数据 */
.tint-blue { background: radial-gradient(110px 90px at top right, rgba(0, 122, 255, 0.10), transparent 70%), #fff; }
.tint-purple { background: radial-gradient(110px 90px at top right, rgba(175, 82, 222, 0.10), transparent 70%), #fff; }
.tint-green { background: radial-gradient(110px 90px at top right, rgba(52, 199, 89, 0.11), transparent 70%), #fff; }
.tint-orange { background: radial-gradient(110px 90px at top right, rgba(255, 149, 0, 0.11), transparent 70%), #fff; }
.bento-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
.bento-label-wrap { display: flex; align-items: center; gap: 6px; min-width: 0; }
.bento-label { font-size: 12px; color: var(--text-secondary); font-weight: 600; }
.bento-icon {
  width: 22px; height: 22px; border-radius: 7px;
  display: inline-flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.bento-icon svg { width: 13px; height: 13px; }
.bento-icon.bi-blue { background: rgba(0, 122, 255, 0.12); color: #007AFF; }
.bento-icon.bi-purple { background: rgba(175, 82, 222, 0.12); color: #AF52DE; }
.bento-icon.bi-green { background: rgba(52, 199, 89, 0.14); color: #34C759; }
.bento-icon.bi-orange { background: rgba(255, 149, 0, 0.14); color: #FF9500; }
.bento-tag {
  font-size: 9px; font-weight: 800; letter-spacing: 1px;
  color: var(--primary); background: var(--primary-light);
  padding: 2px 7px; border-radius: 99px;
}
.bento-value { font-size: 32px; font-weight: 700; color: var(--text-primary); letter-spacing: -0.5px; line-height: 1.1; }
.bento-main .bento-value { font-size: 38px; }
.bento-spark-wrap { margin-top: 8px; height: 36px; }
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
.cal-updated { background: #34c759; color: #fff; font-weight: 800; box-shadow: 0 2px 8px rgba(52, 199, 89, 0.35); }
.cal-missed { background: #ff3b30; color: #fff; font-weight: 800; box-shadow: 0 2px 8px rgba(255, 59, 48, 0.3); }
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
.cal-summary-label { display: flex; align-items: center; justify-content: center; gap: 4px; font-size: 10px; color: var(--text-tertiary); margin-top: 1px; font-weight: 600; }
.cal-label-icon { width: 11px; height: 11px; flex-shrink: 0; }
.cal-label-icon.c-updated { color: #28a745; }
.cal-label-icon.c-missed { color: #d70015; }
.cal-label-icon.c-rate { color: var(--primary); }
.cal-summary-divider { width: 1px; height: 26px; background: var(--border-glass); }

/* ── 成交统计 ── */
.deal-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
.deal-cell {
  background: var(--bg-primary); border-radius: 11px; padding: 12px 8px 11px;
  text-align: center;
  display: flex; flex-direction: column; align-items: center;
}
.deal-cell-icon {
  width: 26px; height: 26px; border-radius: 8px;
  display: inline-flex; align-items: center; justify-content: center;
  margin-bottom: 6px;
}
.deal-cell-icon svg { width: 14px; height: 14px; }
.deal-cell-icon.di-blue { background: rgba(0, 122, 255, 0.12); color: #007AFF; }
.deal-cell-icon.di-green { background: rgba(52, 199, 89, 0.14); color: #34C759; }
.deal-cell-icon.di-purple { background: rgba(175, 82, 222, 0.12); color: #AF52DE; }
.deal-cell-icon.di-orange { background: rgba(255, 149, 0, 0.14); color: #FF9500; }
.deal-val { font-size: 20px; font-weight: 700; color: var(--text-primary); }
.deal-lbl { font-size: 10.5px; color: var(--text-secondary); margin-top: 2px; font-weight: 600; }
.deal-section { margin-top: 16px; }
.deal-sub-title {
  display: flex; align-items: center; gap: 7px;
  font-size: 13px; font-weight: 700; color: var(--text-primary); margin-bottom: 10px;
}
.deal-sub-title::before {
  content: ''; width: 3px; height: 12px; border-radius: 2px;
  background: linear-gradient(180deg, #5AC8FA, #007AFF);
}
.deal-row { display: flex; align-items: center; gap: 10px; margin-bottom: 9px; }
.deal-row:last-child { margin-bottom: 0; }
.deal-row-name { width: 64px; flex-shrink: 0; display: inline-flex; align-items: center; gap: 5px; font-size: 12px; color: var(--text-secondary); font-weight: 600; }
.row-dot { width: 7px; height: 7px; border-radius: 2px; flex-shrink: 0; }
.row-dot.vehicle { background: var(--primary); }
.row-dot.plate { background: var(--purple); }
.row-dot.port { background: var(--teal); }
.row-dot.kind { background: var(--warning); }
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
  .dt-row:hover { background: rgba(0, 0, 0, 0.02); border-radius: 8px; }
}

/* ── 超宽屏 ── */
@media (min-width: 1440px) {
  .deal-grid { grid-template-columns: repeat(4, 1fr); }
}
</style>
