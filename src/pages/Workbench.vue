<template>
  <div class="page wb-page">
    <!-- 顶部 Bloom Hero：问候 + KPI 三格 -->
    <header class="bloom-hero wb-hero">
      <div class="blob b-coral b-sm" style="top:-40px;right:18%;width:200px;height:200px;"></div>
      <div class="blob b-sun b-sm" style="top:30%;left:-30px;width:180px;height:180px;"></div>

      <div class="wb-hero-row">
        <div>
          <div class="wb-hero-eyebrow">{{ heroEyebrow }}</div>
          <h1 class="wb-hero-h1">{{ heroTitle }}<span class="wb-hero-comma">，</span>{{ heroSuffix }}</h1>
          <div class="wb-hero-sub" v-if="loaded">
            共 {{ priorityCustomers.length }} 位重点客户 · {{ healthCounts.need }} 位需回访 · {{ healthCounts.none }} 位未回访
          </div>
        </div>
        <div class="wb-hero-mark" aria-hidden="true">
          <span class="wb-hero-mark-dot t-coral"></span>
          <span class="wb-hero-mark-dot t-mint"></span>
          <span class="wb-hero-mark-dot t-sun"></span>
        </div>
      </div>

      <div class="wb-kpi-row" v-if="loaded">
        <div class="bloom-kpi tint-coral">
          <div class="bloom-kpi-label">Priority</div>
          <div class="bloom-kpi-value">{{ priorityCustomers.length }}<span class="unit">位</span></div>
          <div class="wb-kpi-cap">重点客户总数</div>
        </div>
        <div class="bloom-kpi tint-sun">
          <div class="bloom-kpi-label">Need Follow</div>
          <div class="bloom-kpi-value">{{ healthCounts.need }}<span class="unit">位</span></div>
          <div class="wb-kpi-cap">超过 7 天未跟进</div>
        </div>
        <div class="bloom-kpi tint-lavender">
          <div class="bloom-kpi-label">No Contact</div>
          <div class="bloom-kpi-value">{{ healthCounts.none }}<span class="unit">位</span></div>
          <div class="wb-kpi-cap">从未回访</div>
        </div>
      </div>
    </header>

    <!-- 搜索框 -->
    <div class="searchbar">
      <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">
        <circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line>
      </svg>
      <input
        ref="searchInputRef"
        class="search-input"
        v-model="searchQuery"
        placeholder="搜索客户名称或备注，支持 日期/姓名"
        @input="onSearchInput"
        @keyup.enter="doSearch"
      />
      <button v-if="searchQuery" class="search-clear" @click="clearSearch">✕</button>
      <span class="search-kbd" v-if="isDesktop">Ctrl K</span>
    </div>
    <div class="hist-row" v-if="!searchQuery && searchHistory.length">
      <span class="hist-label">最近</span>
      <span class="hist-chip" v-for="h in searchHistory" :key="h" @click="applyHistory(h)">{{ h }}</span>
      <span class="hist-clear" @click="clearHistory">清空</span>
    </div>

    <!-- 搜索结果模式 -->
    <div v-if="searchQuery" class="results-section">
      <div class="results-header" v-if="searchResults.length">找到 {{ searchResults.length }} 条结果</div>
      <div class="result-card" v-for="c in searchResults" :key="c.id" @click="onResultTap(c)">
        <div class="result-avatar" :style="{ background: c.avatarColor.bg, color: c.avatarColor.color }">
          {{ c.customer_name?.charAt(0) || '?' }}
        </div>
        <div class="result-info">
          <div class="result-name">
            <span class="lead-date" v-if="c.lead_date_short">{{ c.lead_date_short }}/</span>{{ c.customer_name }}
            <span v-if="c.is_priority" class="tag-bloom t-coral t-sm">重点</span>
          </div>
          <div class="result-meta">{{ c.current_needs || '—' }}</div>
        </div>
        <div class="result-visit" v-if="c.is_priority && c.visitStatus" :class="c.visitStatus.class">
          {{ visitBadgeText(c) }}
        </div>
        <span class="action-arrow">›</span>
      </div>
      <div v-if="searchResults.length === 0 && hasSearched">
        <EmptyState icon="search" text="未找到相关客户" desc="试试其他关键字，或直接录入新客户" />
      </div>
    </div>

    <!-- 列表模式 -->
    <template v-else>
      <div class="filter-chips">
        <button class="f-chip" :class="{ on: filter === 'all' }" @click="filter = 'all'">
          全部 <span class="cnt">{{ priorityCustomers.length }}</span>
        </button>
        <button class="f-chip f-warn" :class="{ on: filter === 'need' }" @click="filter = 'need'">
          需回访 <span class="cnt">{{ healthCounts.need }}</span>
        </button>
        <button class="f-chip f-dang" :class="{ on: filter === 'none' }" @click="filter = 'none'">
          未回访 <span class="cnt">{{ healthCounts.none }}</span>
        </button>
        <span class="sort-hint">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
            <line x1="12" y1="19" x2="12" y2="5"></line><polyline points="5 12 12 5 19 12"></polyline>
          </svg>
          按最久未回访排序
        </span>
      </div>

      <div v-if="loaded && filteredCustomers.length === 0">
        <template v-if="loadFailed">
          <EmptyState icon="alert" text="加载失败" desc="网络异常或登录过期，请重试">
            <button class="empty-retry" @click="loadAll">重新加载</button>
          </EmptyState>
        </template>
        <template v-else>
          <EmptyState
            icon="clipboard"
            :text="filter === 'all' ? '暂无重点客户' : '该筛选下暂无客户'"
            :desc="filter === 'all' ? '在上方搜索客户后标注重点，或录入新客户' : '换一个筛选条件看看'"
          />
        </template>
      </div>

      <div class="cust-grid" v-else>
        <div
          v-for="c in filteredCustomers"
          :key="c.id"
          class="cust-card bloom-card"
          @click="onCardTap(c)"
        >
          <div class="cc-head">
            <div class="cc-avatar" :style="{ background: c.avatarColor.bg, color: c.avatarColor.color }">{{ c.customer_name?.charAt(0) }}</div>
            <div class="cc-head-meta">
              <div class="cc-name">
                <span class="lead-date" v-if="c.lead_date_short">{{ c.lead_date_short }}/</span>{{ c.customer_name }}
              </div>
              <div class="cc-tags-row">
                <span class="tag-bloom t-sm" :class="visitTagClass(c)">{{ visitBadgeText(c) }}</span>
                <span v-if="c.is_priority" class="tag-bloom t-coral t-sm">重点</span>
              </div>
            </div>
            <span
              class="cc-copy"
              :class="{ copied: copiedId === c.id }"
              @click.stop="copyName(c)"
              title="复制 日期/姓名"
            >
              <svg v-if="copiedId !== c.id" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
              </svg>
              <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </span>
          </div>
          <div class="cc-need" :class="{ empty: !c.current_needs }">
            <div class="cc-need-label">当前需求</div>
            <div class="cc-need-text">{{ c.current_needs || '暂无需求，点击补充' }}</div>
          </div>
          <div class="cc-act-row" v-if="c.last_activity">
            <span class="tag-bloom t-sm" :class="c.last_activity.type === 'visit' ? 't-mint' : 't-sky'">
              {{ c.last_activity.type === 'visit' ? '到店' : '跟进' }}
            </span>
            <span class="cc-act-text">{{ c.last_activity.content }}</span>
          </div>
        </div>
      </div>
    </template>

    <CustomerDetailPanel
      v-model:show="showDetailPanel"
      :customer="activeCustomer"
      :readonly="isAdmin"
      @updated="onPanelUpdated"
    />

    <div class="toast" v-if="toast.show">{{ toast.message }}</div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import api from '../utils/api'
import { AVATAR_COLORS, calcVisitStatus, leadDateShort } from '../utils/constants'
import { useDevice } from '../composables/useDevice'
import { useToast } from '../composables/useToast'
import { useScope } from '../composables/useScope'
import CustomerDetailPanel from '../components/CustomerDetailPanel.vue'
import EmptyState from '../components/EmptyState.vue'
const { isDesktop } = useDevice()
const { toast, showToast } = useToast()
const { scopeUserId, isAdmin, scopeParams, loadUsers } = useScope()

const priorityCustomers = ref([])
const loaded = ref(false)
const filter = ref('all')
const copiedId = ref(null)

const searchQuery = ref('')
const searchResults = ref([])
const hasSearched = ref(false)
let searchTimer = null
const searchInputRef = ref(null)
const HISTORY_KEY = 'search_history'
const searchHistory = ref(readHistory())

const showDetailPanel = ref(false)
const activeCustomer = ref({})

const healthCounts = computed(() => {
  let need = 0, none = 0
  for (const c of priorityCustomers.value) {
    if (!c.last_visit_at) none++
    else if (c.visitStatus.class !== 'success') need++
  }
  return { need, none }
})

const filteredCustomers = computed(() => {
  if (filter.value === 'need') return priorityCustomers.value.filter((c) => c.last_visit_at && c.visitStatus.class !== 'success')
  if (filter.value === 'none') return priorityCustomers.value.filter((c) => !c.last_visit_at)
  return priorityCustomers.value
})

// Bloom Hero 文案：按时段问候
const heroEyebrow = computed(() => {
  const h = new Date().getHours()
  if (h < 6)  return '凌晨好'
  if (h < 12) return '早上好'
  if (h < 14) return '中午好'
  if (h < 18) return '下午好'
  return '晚上好'
})
const heroTitle = computed(() => heroEyebrow.value)
const heroSuffix = computed(() => '今天有 ' + healthCounts.value.need + ' 位需要回访')

const loadFailed = ref(false)

function decorateCustomer(c, idx) {
  return {
    ...c,
    lead_date_short: leadDateShort(c.lead_date),
    avatarColor: AVATAR_COLORS[idx % AVATAR_COLORS.length],
    visitStatus: calcVisitStatus(c.last_visit_at),
    visitDay: c.last_visit_at ? String(c.last_visit_at).slice(5, 10) : '',
  }
}

function visitBadgeText(c) {
  return c.visitDay ? `${c.visitDay} · ${c.visitStatus.text}` : c.visitStatus.text
}

function visitTagClass(c) {
  if (!c.last_visit_at) return 't-lavender'
  return c.visitStatus.class === 'success' ? 't-mint' : 't-sun'
}

async function loadAll() {
  loadFailed.value = false
  try {
    const listRes = await api.get('/customers/priority', { params: scopeParams() })
    priorityCustomers.value = (Array.isArray(listRes) ? listRes : []).map(decorateCustomer)
  } catch (e) {
    loadFailed.value = true
    showToast(e.message || '加载失败')
  } finally {
    loaded.value = true
  }
}

async function onPanelUpdated() {
  await loadAll()
  const fresh = priorityCustomers.value.find((c) => c.id === activeCustomer.value.id)
  if (fresh) activeCustomer.value = fresh
}

watch(scopeUserId, () => { loadAll() })

function onSearchInput() {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    if (searchQuery.value.trim()) doSearch()
    else clearSearch()
  }, 300)
}

async function doSearch() {
  const query = searchQuery.value.trim()
  if (!query) return
  try {
    const res = await api.get('/customers/search', { params: { keyword: query, ...scopeParams() } })
    searchResults.value = (Array.isArray(res) ? res : []).map(decorateCustomer)
    hasSearched.value = true
    saveHistory(query)
  } catch (e) {
    showToast(e.message || '搜索失败')
  }
}

function clearSearch() {
  searchQuery.value = ''
  searchResults.value = []
  hasSearched.value = false
}

function applyHistory(keyword) {
  searchQuery.value = keyword
  doSearch()
}

function readHistory() {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY)) || [] } catch (_) { return [] }
}

function saveHistory(keyword) {
  const list = [keyword, ...searchHistory.value.filter((h) => h !== keyword)].slice(0, 8)
  searchHistory.value = list
  localStorage.setItem(HISTORY_KEY, JSON.stringify(list))
}

function clearHistory() {
  searchHistory.value = []
  localStorage.removeItem(HISTORY_KEY)
}

function leadName(c) {
  return c.lead_date_short ? `${c.lead_date_short}/${c.customer_name}` : (c.customer_name || '')
}

async function copyName(c) {
  const text = leadName(c)
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text)
    } else {
      const ta = document.createElement('textarea')
      ta.value = text
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
    }
    showToast(`已复制 ${text}`)
    copiedId.value = c.id
    setTimeout(() => {
      if (copiedId.value === c.id) copiedId.value = null
    }, 1500)
  } catch (_) {
    showToast('复制失败，请手动选取')
  }
}

function tryOpenPanel(c) {
  if (isAdmin.value) {
    showToast('管理员仅查看，不可编辑')
    return
  }
  activeCustomer.value = c
  showDetailPanel.value = true
}

function onCardTap(c) { tryOpenPanel(c) }
function onResultTap(c) { tryOpenPanel(c) }

function onGlobalKeydown(e) {
  if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
    e.preventDefault()
    searchInputRef.value?.focus()
  }
}

onMounted(() => {
  loadAll()
  if (isAdmin.value) loadUsers()
  window.addEventListener('keydown', onGlobalKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', onGlobalKeydown)
  if (searchTimer) clearTimeout(searchTimer)
})
</script>

<style scoped>
.wb-page { padding-top: 18px; padding-bottom: 16px; }

/* ── Bloom Hero ── */
.wb-hero {
  position: relative;
  padding: 26px 26px 22px;
  margin-bottom: 16px;
  border-radius: 20px;
}
.wb-hero-row {
  position: relative;
  z-index: 2;
  display: flex; align-items: flex-start; justify-content: space-between; gap: 16px;
}
.wb-hero-eyebrow {
  font-family: "JetBrains Mono", ui-monospace, monospace;
  font-size: 11px; font-weight: 700; letter-spacing: 0.18em;
  color: var(--bloom-coral); margin-bottom: 8px;
}
.wb-hero-h1 {
  font-family: "DM Serif Display", "Noto Serif SC", Georgia, serif;
  font-size: 32px; font-weight: 400; letter-spacing: -0.01em;
  color: var(--bloom-ink); line-height: 1.1;
}
.wb-hero-comma { color: var(--bloom-coral); }
.wb-hero-sub {
  margin-top: 8px;
  font-size: 12.5px; color: var(--bloom-ink-2);
}
.wb-hero-mark { display: flex; gap: 6px; padding-top: 6px; }
.wb-hero-mark-dot {
  width: 10px; height: 10px; border-radius: 999px;
}
.t-coral { background: var(--bloom-coral); }
.t-mint  { background: var(--bloom-mint); }
.t-sun   { background: var(--bloom-sun); }

.wb-kpi-row {
  position: relative; z-index: 2;
  display: grid; grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px; margin-top: 18px;
}
.wb-kpi-cap {
  font-size: 11px; color: var(--bloom-ink-3); font-weight: 500;
}

/* ── 搜索 ── */
.searchbar {
  display: flex; align-items: center; gap: 10px;
  background: var(--bloom-surface);
  border: 1px solid var(--bloom-rule);
  border-radius: 14px;
  padding: 11px 14px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03);
}
.search-icon { width: 17px; height: 17px; color: var(--bloom-ink-3); flex-shrink: 0; }
.search-input {
  flex: 1; min-width: 0;
  font-size: 16px; color: var(--bloom-ink);
  font-family: inherit; background: transparent;
}
.search-input::placeholder { color: var(--bloom-ink-4); }
.search-clear {
  width: 32px; height: 32px; margin-right: -8px; border-radius: 50%;
  background: var(--bloom-canvas-tint); color: var(--bloom-ink-2);
  font-size: 11px; flex-shrink: 0; border: none;
}
.search-kbd {
  display: none;
  font-size: 10px; font-weight: 700; color: var(--bloom-ink-3);
  border: 1px solid var(--bloom-rule); border-radius: 6px;
  padding: 2px 6px; background: var(--bloom-canvas);
  font-family: "JetBrains Mono", ui-monospace, monospace;
}
.hist-row {
  display: flex; align-items: center; gap: 7px;
  margin-top: 9px; font-size: 11.5px; color: var(--bloom-ink-3);
  flex-wrap: wrap;
}
.hist-label { font-weight: 600; }
.hist-chip {
  background: var(--bloom-coral-soft); color: var(--bloom-coral-ink);
  padding: 3px 11px; border-radius: 99px;
  font-weight: 600; font-size: 11px; cursor: pointer;
}
.hist-clear { cursor: pointer; margin-left: 2px; }

/* ── 筛选 chips ── */
.filter-chips {
  display: flex; align-items: center; gap: 8px;
  margin: 14px 0; flex-wrap: wrap;
}
.f-chip {
  padding: 6px 14px; border-radius: 99px;
  font-size: 12px; font-weight: 600; color: var(--bloom-ink-2);
  background: var(--bloom-surface);
  border: 1px solid var(--bloom-rule);
  font-family: inherit; cursor: pointer;
}
.f-chip .cnt { opacity: 0.65; font-weight: 700; margin-left: 2px; font-size: 11px; }
.f-chip.on {
  background: var(--bloom-ink); color: var(--bloom-canvas);
  border-color: transparent;
  box-shadow: 0 3px 10px rgba(26, 22, 20, 0.18);
}
.f-chip.f-warn.on { background: var(--bloom-sun); color: var(--bloom-sun-ink); box-shadow: 0 3px 10px rgba(245, 201, 93, 0.4); }
.f-chip.f-dang.on { background: var(--bloom-coral); color: var(--bloom-ink-on-accent); box-shadow: 0 3px 10px rgba(255, 107, 71, 0.4); }
.sort-hint {
  margin-left: auto; font-size: 11px; color: var(--bloom-ink-3);
  display: flex; align-items: center; gap: 5px;
}
.sort-hint svg { width: 12px; height: 12px; }

/* ── 客户卡片 ── */
.cust-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 10px;
}
.cust-card {
  min-width: 0;
  padding: 14px 14px 12px;
  cursor: pointer;
  display: flex; flex-direction: column; gap: 10px;
}
.cust-card:active { transform: scale(0.985); }
.cc-head { display: flex; align-items: center; gap: 10px; }
.cc-avatar {
  width: 40px; height: 40px; border-radius: 12px;
  display: flex; align-items: center; justify-content: center;
  font-size: 16px; font-weight: 700; flex-shrink: 0;
}
.cc-head-meta { flex: 1; min-width: 0; }
.cc-name {
  font-size: 15px; font-weight: 700; color: var(--bloom-ink);
  min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.cc-name .lead-date { color: var(--bloom-ink-3); font-size: 12px; margin-right: 2px; }
.cc-tags-row { display: flex; gap: 5px; margin-top: 5px; flex-wrap: wrap; }
.cc-copy {
  width: 30px; height: 30px; border-radius: 9px;
  background: var(--bloom-canvas-tint); color: var(--bloom-ink-3);
  display: flex; align-items: center; justify-content: center; flex-shrink: 0; border: none;
}
.cc-copy:active { opacity: 0.5; }
.cc-copy.copied { background: var(--bloom-mint-soft); color: var(--bloom-mint-ink); }
.cc-copy svg { width: 13px; height: 13px; }
.cc-need {
  background: var(--bloom-canvas-tint);
  border-radius: 12px; padding: 10px 12px;
  border-left: 3px solid var(--bloom-coral);
}
.cc-need.empty { background: transparent; border: 1px dashed var(--bloom-rule); border-left-width: 1px; }
.cc-need-label {
  font-family: "JetBrains Mono", ui-monospace, monospace;
  font-size: 10px; font-weight: 700; color: var(--bloom-coral-ink);
  letter-spacing: 0.06em; text-transform: uppercase; margin-bottom: 4px;
}
.cc-need.empty .cc-need-label { color: var(--bloom-ink-3); }
.cc-need-text {
  font-size: 13px; line-height: 1.55; color: var(--bloom-ink);
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden; word-break: break-all;
}
.cc-need.empty .cc-need-text { color: var(--bloom-ink-3); font-size: 12px; }
.cc-act-row { display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--bloom-ink-2); min-width: 0; }
.cc-act-text { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1; }

/* ── 搜索结果 ── */
.results-section { margin-top: 4px; }
.results-header { font-size: 12px; color: var(--bloom-ink-2); margin: 10px 2px; font-weight: 600; }
.result-card {
  display: flex; align-items: center; gap: 12px;
  background: var(--bloom-surface);
  border: 1px solid var(--bloom-rule);
  border-radius: 14px; padding: 12px 14px; margin-bottom: 8px;
  cursor: pointer; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03);
}
.result-card:active { background: var(--bloom-canvas-tint); }
.result-avatar {
  width: 40px; height: 40px; border-radius: 12px; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  font-size: 16px; font-weight: 700;
}
.result-info { flex: 1; min-width: 0; }
.result-name { font-size: 14.5px; font-weight: 700; color: var(--bloom-ink); }
.priority-badge {
  display: inline-block; margin-left: 6px; padding: 1px 7px;
  font-size: 10px; font-weight: 700; border-radius: 99px;
  background: var(--bloom-coral-soft); color: var(--bloom-coral-ink);
  vertical-align: 1px;
}
.result-meta { font-size: 12px; color: var(--bloom-ink-2); margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.result-visit { font-size: 11px; font-weight: 700; flex-shrink: 0; }
.result-visit.success { color: var(--bloom-mint-ink); }
.result-visit.warning { color: var(--bloom-sun-ink); }
.result-visit.danger { color: var(--bloom-coral-ink); }
.action-arrow { color: var(--bloom-ink-3); font-size: 18px; flex-shrink: 0; }

.empty-retry {
  margin-top: 14px; padding: 9px 26px; border-radius: 99px;
  background: var(--bloom-coral); color: var(--bloom-ink-on-accent);
  font-size: 13px; font-weight: 600; font-family: inherit; border: none; cursor: pointer;
}

/* ── 平板 ── */
@media (min-width: 768px) {
  .cust-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
}

/* ── PC ── */
@media (min-width: 1024px) {
  .wb-page { padding-top: 24px; }
  .wb-hero { padding: 32px 32px 26px; }
  .wb-hero-h1 { font-size: 40px; }
  .searchbar { padding: 12px 16px; }
  .search-kbd { display: inline-block; }
  .cust-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 10px 26px -8px rgba(26, 22, 20, 0.18);
  }
  .cust-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 13px; }
  .result-card:hover { transform: translateY(-1px); box-shadow: 0 6px 18px rgba(26, 22, 20, 0.1); }
  .f-chip:hover { border-color: var(--bloom-ink-3); }
  .hist-chip:hover { filter: brightness(0.96); }
}

/* ── 超宽屏 ── */
@media (min-width: 1440px) {
  .cust-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); }
  .wb-kpi-row { grid-template-columns: repeat(3, 280px); }
}
</style>
