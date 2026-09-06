<template>
  <div class="page wb-page">
    <!-- 顶部：标题 + 唯一录入入口（PC） -->
    <header class="wb-top">
      <div class="wb-top-info">
        <h1 class="wb-title">工作台</h1>
        <div class="wb-sub" v-if="loaded">
          共 {{ priorityCustomers.length }} 位重点客户 · {{ healthCounts.need }} 位需回访 · {{ healthCounts.none }} 位未回访
        </div>
      </div>
      <button class="btn-import" @click="goImport">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
          <line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line>
        </svg>
        录入客户
      </button>
    </header>

    <!-- 录入客户弹窗（PC）：选图/识别/提交在弹窗内完成，不再跳页 -->
    <div class="imp-modal-mask" v-if="showImportModal" @click.self="closeImportModal">
      <div class="imp-modal-box">
        <div class="imp-modal-head">
          <div class="imp-modal-title">录入客户</div>
          <button class="imp-modal-close" @click="closeImportModal" aria-label="关闭">✕</button>
        </div>
        <div class="imp-modal-body">
          <ImportFlow ref="importFlowRef" @close="closeImportModal" />
        </div>
      </div>
    </div>

    <!-- 搜索框（原搜索页 + 重点页内嵌搜索合一，附搜索历史） -->
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

    <!-- 搜索结果模式：替代客户网格 -->
    <div v-if="searchQuery" class="results-section">
      <div class="results-header" v-if="searchResults.length">找到 {{ searchResults.length }} 条结果</div>
      <div class="result-card" v-for="c in searchResults" :key="c.id" @click="onResultTap(c)">
        <div class="result-avatar" :style="{ background: c.avatarColor.bg, color: c.avatarColor.color }">
          {{ c.customer_name?.charAt(0) || '?' }}
        </div>
        <div class="result-info">
          <div class="result-name">
            <span class="lead-date" v-if="c.lead_date_short">{{ c.lead_date_short }}/</span>{{ c.customer_name }}
            <span v-if="c.is_priority" class="priority-badge">重点</span>
          </div>
          <div class="result-meta">{{ c.remark || c.current_needs || '—' }}</div>
        </div>
        <div class="result-visit" v-if="c.is_priority && c.visitStatus" :class="c.visitStatus.class">
          {{ c.visitStatus.text }}
        </div>
        <span class="action-arrow">›</span>
      </div>
      <div v-if="searchResults.length === 0 && hasSearched">
        <EmptyState icon="search" text="未找到相关客户" desc="试试其他关键字，或直接录入新客户" />
      </div>
    </div>

    <!-- 列表模式：筛选 + 重点客户网格 -->
    <template v-else>
      <div class="filter-chips">
        <button class="f-chip" :class="{ on: filter === 'all' }" @click="filter = 'all'">
          全部 <span class="cnt">{{ priorityCustomers.length }}</span>
        </button>
        <button class="f-chip warn" :class="{ on: filter === 'need' }" @click="filter = 'need'">
          需回访 <span class="cnt">{{ healthCounts.need }}</span>
        </button>
        <button class="f-chip dang" :class="{ on: filter === 'none' }" @click="filter = 'none'">
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
          class="cust-card"
          @click="onCardTap(c)"
        >
          <div class="cc-head">
            <div class="cc-avatar" :style="{ background: c.avatarColor.bg, color: c.avatarColor.color }">
              {{ c.customer_name?.charAt(0) || '?' }}
            </div>
            <div class="cc-name">{{ c.customer_name }}<span class="cc-lead" v-if="c.lead_date_short">{{ c.lead_date_short }}</span></div>
            <span class="cc-visit" :class="c.visitStatus.class">{{ c.visitStatus.text }}</span>
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
          <!-- 需求是卡片的核心信息：浅蓝底衬主展示，无需求时给引导性占位 -->
          <div class="cc-need" :class="{ empty: !c.current_needs }">
            <div class="cc-need-label">当前需求</div>
            <div class="cc-need-text">{{ c.current_needs || '暂无需求，点击补充' }}</div>
          </div>
          <!-- 备注独立次要行：只在有内容时出现，不与需求互相遮挡 -->
          <div class="cc-remark-row" v-if="c.remark">
            <span class="cc-remark-tag">备注</span>
            <span class="cc-remark-text">{{ c.remark }}</span>
          </div>
        </div>
      </div>
    </template>

    <!-- 录入入口（移动端悬浮按钮） -->
    <button class="wb-fab" v-if="!isDesktop && !searchQuery" @click="goImport" aria-label="录入客户">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
        <line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line>
      </svg>
    </button>

    <!-- 客户编辑面板（跟进 / 需求 / 到店 / 成交 / 重点） -->
    <CustomerDetailPanel
      v-model:show="showDetailPanel"
      :customer="activeCustomer"
      @updated="onPanelUpdated"
    />

    <div class="toast" v-if="toast.show">{{ toast.message }}</div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import api from '../utils/api'
import { AVATAR_COLORS, calcVisitStatus } from '../utils/constants'
import { useDevice } from '../composables/useDevice'
import { useToast } from '../composables/useToast'
import { useScope } from '../composables/useScope'
import { onContactsImported } from '../utils/events'
import CustomerDetailPanel from '../components/CustomerDetailPanel.vue'
import EmptyState from '../components/EmptyState.vue'
import ImportFlow from '../components/ImportFlow.vue'

const router = useRouter()
const { isDesktop } = useDevice()
const { toast, showToast } = useToast()
const { scopeUserId, isAdmin, scopeParams, loadUsers } = useScope()

// ── 状态 ────────────────────────────────────────────────
const priorityCustomers = ref([])
const loaded = ref(false)
const filter = ref('all') // all | need（>7天未跟进）| none（从未回访）
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

// ── 健康度统计（复用 calcVisitStatus 判定）──────────────
// need：超过 7 天未跟进（warning / 有日期的 danger）；none：从未回访
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

// ── 数据加载 ────────────────────────────────────────────
// /priority 返回顺序即「最久未回访优先」（last_visit_at IS NULL 最前、其后 ASC）
const loadFailed = ref(false)

async function loadAll() {
  loadFailed.value = false
  try {
    const listRes = await api.get('/customers/priority', { params: scopeParams() })
    priorityCustomers.value = (Array.isArray(listRes) ? listRes : []).map((c, idx) => ({
      ...c,
      lead_date_short: c.lead_date ? c.lead_date.slice(3).replace(/-/g, '') : '',
      avatarColor: AVATAR_COLORS[idx % AVATAR_COLORS.length],
      visitStatus: calcVisitStatus(c.last_visit_at),
    }))
  } catch (e) {
    loadFailed.value = true
    showToast(e.message || '加载失败')
  } finally {
    loaded.value = true
  }
}

// 面板内数据变更：刷新列表，并把 activeCustomer 重新指向列表中的最新对象
async function onPanelUpdated() {
  await loadAll()
  const fresh = priorityCustomers.value.find((c) => c.id === activeCustomer.value.id)
  if (fresh) activeCustomer.value = fresh
}

// 管理员切换数据范围 → 联动刷新
watch(scopeUserId, () => {
  loadAll()
})

// ── 搜索（含历史，原搜索页唯一增量）────────────────────
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
    searchResults.value = (Array.isArray(res) ? res : []).map((c, idx) => ({
      ...c,
      lead_date_short: c.lead_date ? c.lead_date.slice(3).replace(/-/g, '') : '',
      avatarColor: AVATAR_COLORS[idx % AVATAR_COLORS.length],
      visitStatus: calcVisitStatus(c.last_visit_at),
    }))
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
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY)) || []
  } catch (_) {
    return []
  }
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

// ── 复制 日期/姓名 ─────────────────────────────────────
function leadName(c) {
  return c.lead_date_short ? `${c.lead_date_short}/${c.customer_name}` : (c.customer_name || '')
}

async function copyName(c) {
  const text = leadName(c)
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text)
    } else {
      // 非安全上下文降级：隐藏 textarea 中转
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

// ── 打开编辑面板 ────────────────────────────────────────
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

// ── 录入 ────────────────────────────────────────────────
// PC：弹窗内完成；移动端：跳整页（小屏弹窗塞不下三步流程）
const showImportModal = ref(false)

function goImport() {
  if (isDesktop.value) showImportModal.value = true
  else router.push('/import')
}

function closeImportModal() {
  showImportModal.value = false
}

// ── Ctrl+K 聚焦搜索（PC）───────────────────────────────
function onGlobalKeydown(e) {
  if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
    e.preventDefault()
    searchInputRef.value?.focus()
  }
}

// ── 生命周期 ────────────────────────────────────────────
let offImported = null
onMounted(() => {
  loadAll()
  if (isAdmin.value) loadUsers()
  window.addEventListener('keydown', onGlobalKeydown)
  // 导入流程完成后联动刷新列表
  offImported = onContactsImported(() => loadAll())
})

onUnmounted(() => {
  window.removeEventListener('keydown', onGlobalKeydown)
  if (searchTimer) clearTimeout(searchTimer)
  if (offImported) offImported()
})
</script>

<style scoped>
.wb-page {
  padding-top: 18px;
}

/* ── 顶部 ── */
.wb-top {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 14px;
  margin-bottom: 14px;
}
.wb-title {
  font-size: 24px;
  font-weight: 700;
  color: var(--text-primary);
  letter-spacing: 0.3px;
  line-height: 1.2;
}
.wb-sub {
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: 3px;
}
.btn-import {
  display: none;
}

/* ── 搜索 ── */
.searchbar {
  display: flex;
  align-items: center;
  gap: 10px;
  background: var(--bg-glass);
  border: 1px solid var(--border-glass);
  border-radius: 14px;
  padding: 11px 14px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03);
}
.search-icon { width: 17px; height: 17px; color: var(--text-tertiary); flex-shrink: 0; }
.search-input {
  flex: 1;
  min-width: 0;
  font-size: 13.5px;
  color: var(--text-primary);
  font-family: inherit;
  background: transparent;
}
.search-input::placeholder { color: var(--text-tertiary); }
.search-clear {
  width: 22px; height: 22px; border-radius: 50%;
  background: var(--bg-primary); color: var(--text-secondary);
  font-size: 11px; flex-shrink: 0;
}
.search-kbd {
  display: none;
  font-size: 10px; font-weight: 700; color: var(--text-tertiary);
  border: 1px solid var(--border-glass); border-radius: 6px;
  padding: 2px 6px; background: var(--bg-primary);
  font-family: inherit;
}
.hist-row {
  display: flex; align-items: center; gap: 7px;
  margin-top: 9px; font-size: 11.5px; color: var(--text-tertiary);
  flex-wrap: wrap;
}
.hist-label { font-weight: 600; }
.hist-chip {
  background: var(--primary-light); color: var(--primary);
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
  font-size: 12px; font-weight: 600; color: var(--text-secondary);
  background: var(--bg-glass);
  border: 1px solid var(--border-glass);
  font-family: inherit; cursor: pointer;
}
.f-chip .cnt { opacity: 0.65; font-weight: 700; margin-left: 2px; font-size: 11px; }
.f-chip.on {
  background: var(--primary); color: #fff; border-color: transparent;
  box-shadow: 0 3px 10px rgba(0, 122, 255, 0.3);
}
.f-chip.warn.on { background: var(--warning); box-shadow: 0 3px 10px rgba(255, 149, 0, 0.3); }
.f-chip.dang.on { background: var(--danger); box-shadow: 0 3px 10px rgba(255, 59, 48, 0.3); }
.sort-hint {
  margin-left: auto; font-size: 11px; color: var(--text-tertiary);
  display: flex; align-items: center; gap: 5px;
}
.sort-hint svg { width: 12px; height: 12px; }

/* ── 客户卡片 ── */
.cust-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 10px;
}
.cust-card {
  background: var(--bg-card);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid var(--border-glass);
  border-radius: 15px;
  padding: 12px 13px 11px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
  cursor: pointer;
  transition: transform 0.18s ease, box-shadow 0.18s ease;
  display: flex;
  flex-direction: column;
  gap: 9px;
}
.cust-card:active { transform: scale(0.985); }
.cc-head { display: flex; align-items: center; gap: 9px; }
.cc-avatar {
  width: 34px; height: 34px; border-radius: 11px; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  font-size: 15px; font-weight: 700;
}
.cc-name {
  font-size: 14.5px; font-weight: 700; color: var(--text-primary);
  min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.cc-lead {
  font-size: 10px; font-weight: 700; color: var(--text-tertiary);
  background: var(--bg-primary); border-radius: 5px; padding: 1px 6px;
  vertical-align: 1px; margin-left: 5px;
}
.cc-visit {
  margin-left: auto; flex-shrink: 0;
  font-size: 10.5px; font-weight: 700; padding: 3px 9px; border-radius: 99px;
}
.cc-visit.success { background: var(--green-light); color: var(--success); }
.cc-visit.warning { background: var(--orange-light); color: var(--warning); }
.cc-visit.danger { background: var(--red-light); color: var(--danger); }
.cc-copy {
  width: 24px; height: 24px; border-radius: 7px;
  background: var(--bg-primary); color: var(--text-tertiary);
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.cc-copy:active { opacity: 0.5; }
.cc-copy.copied { background: var(--green-light); color: var(--success); }
.cc-copy svg { width: 12px; height: 12px; }
/* 需求主体：卡片的核心信息 */
.cc-need { background: var(--primary-light); border-radius: 10px; padding: 9px 11px; }
.cc-need.empty { background: transparent; border: 1px dashed var(--border-glass); }
.cc-need-label { font-size: 10px; font-weight: 700; color: var(--primary); letter-spacing: 0.5px; margin-bottom: 3px; }
.cc-need.empty .cc-need-label { color: var(--text-tertiary); }
.cc-need-text {
  font-size: 13px; line-height: 1.55; color: var(--text-primary);
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  word-break: break-all;
}
.cc-need.empty .cc-need-text { color: var(--text-tertiary); font-size: 12px; }
/* 备注独立次要行：只在有内容时渲染 */
.cc-remark-row { display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--text-secondary); min-width: 0; }
.cc-remark-tag {
  flex-shrink: 0; font-size: 10px; font-weight: 700; color: var(--text-tertiary);
  background: var(--bg-primary); border-radius: 5px; padding: 1px 6px;
}
.cc-remark-text { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

/* ── 搜索结果 ── */
.results-section { margin-top: 4px; }
.results-header {
  font-size: 12px; color: var(--text-secondary);
  margin: 10px 2px; font-weight: 600;
}
.result-card {
  display: flex; align-items: center; gap: 12px;
  background: var(--bg-card);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid var(--border-glass);
  border-radius: 14px; padding: 12px 14px; margin-bottom: 8px;
  cursor: pointer; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03);
}
.result-card:active { background: var(--surface); }
.result-avatar {
  width: 40px; height: 40px; border-radius: 12px; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  font-size: 16px; font-weight: 700;
}
.result-info { flex: 1; min-width: 0; }
.result-name { font-size: 14.5px; font-weight: 700; color: var(--text-primary); }
.priority-badge {
  display: inline-block; margin-left: 6px; padding: 1px 7px;
  font-size: 10px; font-weight: 700; border-radius: 99px;
  background: var(--orange-light); color: var(--warning);
  vertical-align: 1px;
}
.result-meta {
  font-size: 12px; color: var(--text-secondary); margin-top: 2px;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.result-visit { font-size: 11px; font-weight: 700; flex-shrink: 0; }
.result-visit.success { color: var(--success); }
.result-visit.warning { color: var(--warning); }
.result-visit.danger { color: var(--danger); }
.action-arrow { color: var(--text-tertiary); font-size: 18px; flex-shrink: 0; }

/* ── 空态 ── */
.empty-retry {
  margin-top: 14px; padding: 9px 26px; border-radius: 99px;
  background: var(--primary); color: #fff;
  font-size: 13px; font-weight: 600; font-family: inherit;
  border: none; cursor: pointer;
}

/* ── 移动端 FAB ── */
.wb-fab {
  position: fixed;
  right: 16px;
  bottom: 76px;
  width: 54px; height: 54px; border-radius: 18px;
  background: linear-gradient(135deg, #007AFF, #32ADE6);
  color: #fff;
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 10px 24px rgba(0, 122, 255, 0.45);
  z-index: var(--z-nav);
  cursor: pointer;
}
.wb-fab:active { transform: scale(0.94); }
.wb-fab svg { width: 24px; height: 24px; }

/* ── 平板 ── */
@media (min-width: 768px) {
  .cust-grid { grid-template-columns: repeat(2, 1fr); gap: 12px; }
}

/* ── 录入客户弹窗（仅 PC 使用）── */
.imp-modal-mask {
  position: fixed; inset: 0; z-index: var(--z-modal);
  background: rgba(15, 23, 42, 0.45);
  display: flex; align-items: center; justify-content: center;
  animation: imp-fade 0.18s ease;
}
.imp-modal-box {
  width: 760px; max-width: calc(100vw - 48px);
  max-height: calc(100vh - 64px);
  background: var(--surface);
  border-radius: 16px;
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.25);
  display: flex; flex-direction: column;
  overflow: hidden;
  animation: imp-pop 0.2s ease;
}
.imp-modal-head {
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 18px 10px;
  border-bottom: 1px solid var(--border-glass);
  flex-shrink: 0;
}
.imp-modal-title { font-size: 16px; font-weight: 700; color: var(--text-primary); }
.imp-modal-close {
  width: 28px; height: 28px; border-radius: 8px; border: none;
  background: var(--bg-primary); color: var(--text-secondary);
  font-size: 13px; cursor: pointer; font-family: inherit;
}
.imp-modal-close:hover { background: var(--bg-hover); }
.imp-modal-body {
  flex: 1; min-height: 0;
  padding: 14px 18px 18px;
  overflow-y: auto;
}
@keyframes imp-fade { from { opacity: 0; } to { opacity: 1; } }
@keyframes imp-pop { from { opacity: 0; transform: scale(1.03); } to { opacity: 1; transform: scale(1); } }

/* ── PC ── */
@media (min-width: 1024px) {
  .wb-page { padding-top: 24px; }
  .wb-top { margin-bottom: 18px; }
  .wb-title { font-size: 26px; }
  .btn-import {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 11px 20px;
    border-radius: 12px;
    background: var(--primary);
    color: #fff;
    font-size: 14px;
    font-weight: 600;
    font-family: inherit;
    box-shadow: 0 4px 12px rgba(0, 122, 255, 0.28);
    cursor: pointer;
  }
  .btn-import:hover { filter: brightness(1.05); }
  .btn-import svg { width: 15px; height: 15px; }
  .searchbar { padding: 12px 16px; }
  .search-kbd { display: inline-block; }
  .cust-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 10px 26px -8px rgba(15, 23, 42, 0.18);
  }
  .cust-grid { grid-template-columns: repeat(3, 1fr); gap: 13px; }
  .wb-fab { display: none; }
  .result-card:hover { transform: translateY(-1px); box-shadow: 0 6px 18px rgba(15, 23, 42, 0.1); }
  .f-chip:hover { border-color: var(--text-tertiary); }
  .hist-chip:hover { filter: brightness(0.96); }
}

/* ── 超宽屏 ── */
@media (min-width: 1440px) {
  .cust-grid { grid-template-columns: repeat(4, 1fr); }
}
</style>
