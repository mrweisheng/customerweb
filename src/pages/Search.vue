<template>
  <div class="search-page">
    <div class="search-header">
      <div class="search-bar">
        <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20">
          <circle cx="11" cy="11" r="8"></circle>
          <path d="M21 21l-4.35-4.35"></path>
        </svg>
        <input
          class="search-input"
          placeholder="搜索客户名称或备注"
          v-model="searchQuery"
          @input="onSearchInput"
          @keyup.enter="doSearch"
        />
        <div v-if="searchQuery" class="search-clear" @click="clearSearch">×</div>
      </div>
      <div class="search-cancel" @click="goBack">取消</div>
    </div>

    <!-- 搜索历史 -->
    <div v-if="!searchQuery && searchHistory.length > 0" class="search-section">
      <div class="section-label"><svg class="title-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>最近搜索</div>
      <div class="history-tags">
        <div
          v-for="(item, index) in searchHistory"
          :key="index"
          class="history-tag"
          @click="searchFromHistory(item)"
        >
          {{ item }}
        </div>
      </div>
      <div class="clear-history" @click="clearHistory">清除历史</div>
    </div>

    <!-- 搜索结果 -->
    <div v-if="searchQuery && searchResults.length > 0" class="search-results">
      <div class="results-header">
        <span><svg class="title-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><path d="M7 12l4-4 4 4 5-5"/></svg>找到 {{ searchResults.length }} 条结果</span>
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
            <span v-if="customer.visitStatus" class="visit-badge" :style="{ color: customer.visitStatus.color, background: customer.visitStatus.bgColor }">
              {{ customer.visitStatus.text }}
            </span>
          </div>
          <div class="result-meta">{{ customer.lead_date_short }}</div>
        </div>
        <div class="result-action">
          <span class="action-arrow">›</span>
        </div>
      </div>
    </div>

    <!-- 无结果 -->
    <div v-if="searchQuery && searchResults.length === 0 && hasSearched" class="empty-state">
      <div class="empty-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg></div>
      <div class="empty-title">未找到相关客户</div>
      <div class="empty-desc">试试其他关键字</div>
    </div>

    <!-- 未登录提示 -->
    <div v-if="!loggedIn" class="login-prompt">
      <div class="prompt-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg></div>
      <div class="prompt-title">需要登录</div>
      <div class="prompt-desc">登录后即可搜索客户</div>
      <button class="btn-login" @click="goToLogin">立即登录</button>
    </div>

    <!-- 回访弹窗 -->
    <div class="modal-mask" v-if="showVisitModal" @click="closeVisitModal">
      <div class="modal-sheet" @click.stop>
        <div class="modal-handle"></div>
        <div class="modal-title">{{ visitModalMode === 'visit' ? '记录回访' : '标注重点客户' }}</div>
        <div class="visit-customer-name">{{ visitCustomerName }}</div>
        <div v-if="visitModalMode === 'visit'" class="visit-info">
          <div class="visit-last-remark" v-if="visitLastRemark">上次备注: {{ visitLastRemark }}</div>
          <div class="visit-days-ago">{{ visitDaysAgo }}</div>
        </div>
        <textarea
          class="visit-textarea"
          :placeholder="visitModalMode === 'visit' ? '请输入回访记录...' : '请输入备注原因...'"
          v-model="visitRemark"
        ></textarea>
        <div class="visit-actions">
          <button v-if="visitModalMode === 'visit'" class="btn-remove" @click="removePriority">取消重点</button>
          <button class="btn-save" @click="visitModalMode === 'visit' ? saveVisit() : confirmAddPriority()">
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
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import api from '../utils/api'
import { isLoggedIn as checkLoggedIn, getUserInfo } from '../utils/auth'
import { AVATAR_COLORS, calcVisitStatus } from '../utils/constants'
import ConfirmDialog from '../components/ConfirmDialog.vue'

const router = useRouter()
const loggedIn = ref(false)

const searchQuery = ref('')
const searchResults = ref([])
const searchHistory = ref([])
const hasSearched = ref(false)
const isAdmin = ref(false)
const showVisitModal = ref(false)
const visitModalMode = ref('visit')
const visitCustomerId = ref(null)
const visitCustomerName = ref('')
const visitRemark = ref('')
const visitLastRemark = ref('')
const visitDaysAgo = ref('')
const toast = reactive({ show: false, message: '' })
const showConfirmRemove = ref(false)

let searchTimer = null

function showToast(message, duration = 2000) {
  toast.message = message
  toast.show = true
  setTimeout(() => {
    toast.show = false
  }, duration)
}

function goBack() {
  router.back()
}

function goToLogin() {
  router.push('/login')
}

function onSearchInput() {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    if (searchQuery.value.trim()) {
      doSearch()
    } else {
      searchResults.value = []
      hasSearched.value = false
    }
  }, 300)
}

async function doSearch() {
  const query = searchQuery.value.trim()
  if (!query) return

  if (!loggedIn.value) {
    showToast('请先登录')
    return
  }

  try {
    const res = await api.get('/customers/search', { params: { keyword: query } })
    searchResults.value = (res || []).map((c, idx) => ({
      ...c,
      lead_date_short: c.lead_date ? c.lead_date.slice(5).replace('-', '') : '',
      avatarColor: AVATAR_COLORS[idx % AVATAR_COLORS.length],
      visitStatus: calcVisitStatus(c.last_visit_at),
    }))
    hasSearched.value = true

    // 保存搜索历史
    if (!searchHistory.value.includes(query)) {
      searchHistory.value.unshift(query)
      if (searchHistory.value.length > 10) {
        searchHistory.value.pop()
      }
      localStorage.setItem('searchHistory', JSON.stringify(searchHistory.value))
    }
  } catch (e) {
    showToast('搜索失败')
  }
}

function clearSearch() {
  searchQuery.value = ''
  searchResults.value = []
  hasSearched.value = false
}

function searchFromHistory(item) {
  searchQuery.value = item
  doSearch()
}

function clearHistory() {
  searchHistory.value = []
  localStorage.removeItem('searchHistory')
}

function onResultTap(customer) {
  if (!loggedIn.value) {
    showToast('请先登录')
    return
  }
  if (isAdmin.value) return

  if (customer.is_priority) {
    const daysAgo = customer.last_visit_at
      ? Math.floor((Date.now() - new Date(customer.last_visit_at).getTime()) / 86400000)
      : null
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
  if (!visitRemark.value.trim()) {
    showToast('请填写回访记录')
    return
  }
  try {
    await api.put(`/customers/${visitCustomerId.value}/visit`, { remark: visitRemark.value })
    showToast('回访已记录')
    closeVisitModal()
    doSearch()
  } catch (e) {
    showToast('保存失败')
  }
}

function removePriority() {
  if (!visitRemark.value.trim()) {
    showToast('请填写取消原因')
    return
  }
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
    doSearch()
  } catch (e) {
    showToast('操作失败')
  }
}

async function confirmAddPriority() {
  if (!visitRemark.value.trim()) {
    showToast('请填写备注')
    return
  }
  try {
    await api.put(`/customers/${visitCustomerId.value}/priority`, { is_priority: true, remark: visitRemark.value })
    showToast('已标为重点')
    closeVisitModal()
    doSearch()
  } catch (e) {
    showToast('操作失败')
  }
}

onMounted(() => {
  loggedIn.value = checkLoggedIn()
  if (loggedIn.value) {
    const userInfo = getUserInfo()
    isAdmin.value = userInfo?.role === 'admin'
  }

  // 加载搜索历史
  const history = localStorage.getItem('searchHistory')
  if (history) {
    try {
      searchHistory.value = JSON.parse(history)
    } catch (e) {
      searchHistory.value = []
    }
  }
})
</script>

<style scoped>
.search-page {
  min-height: 100vh;
  background: var(--bg-primary);
  padding: 0 14px;
}

.search-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 0;
  position: sticky;
  top: 0;
  background: var(--bg-primary);
  z-index: 10;
}

.search-bar {
  flex: 1;
  position: relative;
  display: flex;
  align-items: center;
}

.search-icon {
  position: absolute;
  left: 12px;
  color: var(--text-secondary);
  pointer-events: none;
}

.search-input {
  width: 100%;
  padding: 10px 36px 10px 40px;
  background: white;
  border: 1px solid var(--border-glass);
  border-radius: 12px;
  font-size: 14px;
  color: var(--text-primary);
}

.search-input:focus {
  border-color: var(--primary);
  outline: none;
}

.search-clear {
  position: absolute;
  right: 10px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.08);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  color: var(--text-secondary);
  cursor: pointer;
}

.search-cancel {
  font-size: 14px;
  color: var(--primary);
  font-weight: 500;
  cursor: pointer;
  flex-shrink: 0;
}

.search-section {
  margin-top: 20px;
}

.section-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-bottom: 12px;
}

.history-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 16px;
}

.history-tag {
  padding: 6px 14px;
  background: white;
  border: 1px solid var(--border-glass);
  border-radius: 20px;
  font-size: 13px;
  color: var(--text-secondary);
  cursor: pointer;
}

.history-tag:active {
  background: var(--bg-primary);
}

.clear-history {
  font-size: 13px;
  color: var(--text-secondary);
  cursor: pointer;
  text-align: center;
}

.clear-history:active {
  color: var(--primary);
}

.search-results {
  margin-top: 16px;
}

.results-header {
  font-size: 12px;
  color: var(--text-secondary);
  margin-bottom: 12px;
}

.result-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px;
  background: white;
  border: 1px solid var(--border-glass);
  border-radius: 14px;
  margin-bottom: 10px;
  cursor: pointer;
  transition: all 0.2s;
}

.result-card:active {
  background: var(--bg-primary);
  transform: scale(0.99);
}

.result-avatar {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  font-weight: 700;
  flex-shrink: 0;
}

.result-info {
  flex: 1;
  min-width: 0;
}

.result-name {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.priority-badge {
  font-size: 10px;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 4px;
  background: rgba(255, 149, 0, 0.1);
  color: #FF9500;
}

.visit-badge {
  font-size: 10px;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 4px;
}

.result-meta {
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: 2px;
}

.result-action {
  flex-shrink: 0;
}

.action-arrow {
  font-size: 18px;
  color: var(--text-tertiary);
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
}

.empty-icon {
  margin-bottom: 16px;
}

.empty-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 8px;
}

.empty-desc {
  font-size: 14px;
  color: var(--text-secondary);
}

.empty-icon svg, .prompt-icon svg {
  width: 48px;
  height: 48px;
  color: var(--text-tertiary);
}
.prompt-icon svg { color: var(--primary); }

.login-prompt {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  padding: 20px;
}

.prompt-icon {
  margin-bottom: 16px;
}

.prompt-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 8px;
}

.prompt-desc {
  font-size: 14px;
  color: var(--text-secondary);
  margin-bottom: 24px;
}

.btn-login {
  width: 200px;
  padding: 12px;
  border-radius: 980px;
  background: var(--primary);
  color: white;
  font-size: 15px;
  font-weight: 600;
  box-shadow: 0 4px 12px rgba(0, 122, 255, 0.18);
}

.btn-login:active {
  transform: scale(0.98);
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
  border-radius: 18px 18px 0 0;
  padding: 14px 14px 0;
  padding-bottom: calc(14px + env(safe-area-inset-bottom));
  max-height: 85vh;
  display: flex;
  flex-direction: column;
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

.visit-customer-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 8px;
}

.visit-info {
  margin-bottom: 12px;
}

.visit-last-remark {
  font-size: 12px;
  color: var(--text-secondary);
  margin-bottom: 4px;
}

.visit-days-ago {
  font-size: 12px;
  color: var(--text-secondary);
}

.visit-textarea {
  width: 100%;
  min-height: 80px;
  padding: 12px;
  border: 1px solid var(--border-glass);
  border-radius: 12px;
  font-size: 14px;
  color: var(--text-primary);
  resize: none;
  margin-bottom: 12px;
}

.visit-textarea:focus {
  border-color: var(--primary);
  outline: none;
}

.visit-actions {
  display: flex;
  gap: 10px;
}

.btn-remove {
  flex: 1;
  padding: 12px;
  border-radius: 12px;
  background: white;
  color: var(--danger);
  font-size: 14px;
  font-weight: 600;
  border: 1px solid var(--border-glass);
}

.btn-save {
  flex: 1;
  padding: 12px;
  border-radius: 12px;
  background: var(--primary);
  color: white;
  font-size: 14px;
  font-weight: 600;
}
</style>

/* PC 适配 */
@media (min-width: 1024px) {
  .search-page {
    padding: 24px 28px 40px;
  }

  .search-header {
    padding: 8px 0 24px;
    position: relative;
    top: auto;
  }

  .search-bar {
    max-width: 640px;
    margin: 0 auto;
  }

  .search-input {
    padding: 12px 44px 12px 46px;
    font-size: 15px;
  }

  .search-cancel {
    font-size: 15px;
  }

  .search-section {
    max-width: 640px;
    margin-left: auto;
    margin-right: auto;
  }

  .section-label {
    font-size: 13px;
  }

  /* 搜索结果在 PC 下三列 */
  .search-results {
    margin-top: 24px;
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 14px;
  }

  .results-header {
    grid-column: 1 / -1;
    margin-bottom: 4px;
  }

  .result-card {
    padding: 16px;
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
  }

  .visit-customer-name {
    text-align: center;
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

/* ============ PC 端增强:去 iOS 取消键 + 彩色标签 + 卡片 hover（方案 A） ============ */
@media (min-width: 1024px) {
  /* PC 有侧边栏导航,隐藏 iOS 风格「取消」返回键 */
  .search-cancel { display: none; }

  /* 标题图标配色 */
  .title-icon { width: 14px; height: 14px; margin-right: 5px; vertical-align: -2px; }
  .section-label .title-icon { color: var(--primary); }
  .results-header .title-icon { color: var(--info); }

  /* 最近搜索标签:毛玻璃 + hover 高亮 */
  .history-tag {
    background: var(--bg-card);
    backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
    transition: all 0.2s;
  }
  .history-tag:hover {
    background: var(--blue-light);
    color: var(--primary);
    border-color: transparent;
    transform: translateY(-1px);
  }

  /* 结果卡片:毛玻璃 + hover 提升描边 */
  .result-card {
    background: var(--bg-card);
    backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
    transition: all 0.2s;
  }
  .result-card:hover {
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.06);
    border-color: rgba(0, 122, 255, 0.18);
    transform: translateY(-2px);
  }

  /* 搜索输入框毛玻璃 */
  .search-input {
    background: var(--bg-card);
    backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
  }

  /* 空状态 / 未登录大图标放大 */
  .empty-icon svg, .prompt-icon svg {
    width: 56px;
    height: 56px;
  }
}

/* 超宽屏:结果四列 */
@media (min-width: 1440px) {
  .search-results {
    grid-template-columns: repeat(4, 1fr);
  }
}


