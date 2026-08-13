<template>
  <div class="ai-import-page">
    <!-- 步骤指示器 -->
    <div class="step-indicator">
      <div class="step" :class="{ active: currentStep === 1, completed: currentStep > 1 }">
        <div class="step-number">1</div>
        <div class="step-text">選擇圖片</div>
      </div>
      <div class="step-line" :class="{ active: currentStep > 1 }"></div>
      <div class="step" :class="{ active: currentStep === 2, completed: currentStep > 2 }">
        <div class="step-number">2</div>
        <div class="step-text">確認信息</div>
      </div>
      <div class="step-line" :class="{ active: currentStep > 2 }"></div>
      <div class="step" :class="{ active: currentStep === 3 }">
        <div class="step-number">3</div>
        <div class="step-text">導入結果</div>
      </div>
    </div>

    <!-- 步骤1：选择图片 -->
    <div v-if="currentStep === 1" class="step-content step-1">
      <div class="upload-area" @click="chooseImage">
        <div class="upload-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="48" height="48">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
            <circle cx="8.5" cy="8.5" r="1.5"></circle>
            <polyline points="21 15 16 10 5 21"></polyline>
          </svg>
        </div>
        <div class="upload-text">點擊選擇截圖</div>
        <div class="upload-hint">支持 JPG、PNG 格式，最多 {{ MAX_IMAGES }} 張，可分多次添加</div>
      </div>

      <!-- 图片队列 -->
      <div v-if="imageQueue.length > 0" class="image-queue">
        <div class="queue-header">
          <span>已選擇 {{ imageQueue.length }} 張圖片</span>
          <span class="queue-progress">{{ queueDoneCount }}/{{ imageQueue.length }} 已處理</span>
        </div>
        <div
          v-for="item in imageQueue"
          :key="item.id"
          class="queue-item"
          :class="item.status"
        >
          <img v-if="item.thumb" :src="item.thumb" class="queue-item-thumb" />
          <div class="queue-item-info">
            <div class="queue-item-name">{{ item.fileName }}</div>
            <div class="queue-item-status">
              <span v-if="item.status === 'pending'">等待處理</span>
              <span v-else-if="item.status === 'processing'" class="processing">正在識別...</span>
              <span v-else-if="item.status === 'done'" class="done">完成 ({{ item.contactsFound }}個聯繫人)</span>
              <span v-else-if="item.status === 'error'" class="error">{{ item.errorMsg }}</span>
            </div>
          </div>
          <div class="queue-item-action">
            <button v-if="item.status === 'error'" class="btn-retry" @click="retryItem(item.id)">重試</button>
            <button class="btn-remove" @click="removeItem(item.id)">✕</button>
          </div>
        </div>
      </div>

      <!-- 操作按钮 -->
      <div v-if="imageQueue.length > 0" class="action-buttons">
        <button class="btn-secondary" @click="clearQueue">清空列表</button>
        <button
          class="btn-primary"
          :disabled="!canProceed"
          @click="proceedToConfirm"
        >
          下一步
        </button>
      </div>
    </div>

    <!-- 步骤2：确认信息 -->
    <div v-if="currentStep === 2" class="step-content">
      <div class="confirm-header">
        <div class="confirm-title">識別結果</div>
        <div class="confirm-subtitle">
          共 {{ contacts.length }} 個聯繫人，已選 {{ validContactCount }} 個有效可導入<span v-if="duplicateCount > 0" class="dup-tag">（{{ duplicateCount }} 位重複）</span>
        </div>
      </div>

      <div class="contacts-list">
        <div v-for="group in groupedContacts" :key="group.sourceId" class="contact-group">
          <div class="group-header">
            <img v-if="group.thumb" :src="group.thumb" class="group-thumb" />
            <div class="group-title">
              <div class="group-name">{{ group.fileName }}</div>
              <div class="group-count">{{ group.contacts.length }} 個聯繫人</div>
            </div>
            <button class="btn-group-action" @click="retryItem(group.sourceId)" v-if="group.status === 'error'">重試</button>
            <button class="btn-group-action" @click="removeItem(group.sourceId)">移除</button>
          </div>
          <div
            v-for="contact in group.contacts"
            :key="contact._sourceId + '-' + contact.name"
            class="contact-item"
            :class="{ invalid: !contact.date, disabled: !contact.selected }"
          >
            <label class="contact-check">
              <input type="checkbox" v-model="contact.selected" :disabled="!contact.date" />
            </label>
            <div class="contact-info">
              <div class="contact-name">
                {{ contact.name }}
                <span v-if="isDuplicate(contact)" class="dup-badge">已存在</span>
              </div>
              <div class="contact-date" v-if="contact.date">{{ contact.date }}</div>
              <div class="contact-date invalid" v-else>日期無效（不可導入）</div>
            </div>
            <div class="contact-action">
              <button class="btn-edit" @click="editContact(contacts.indexOf(contact))">編輯</button>
            </div>
          </div>
        </div>
      </div>

      <div class="action-buttons">
        <button class="btn-secondary" @click="goBack">返回</button>
        <button
          class="btn-primary"
          :disabled="validContactCount === 0 || importing"
          @click="startImport"
        >
          {{ importing ? '導入中...' : '開始導入' }}
        </button>
      </div>
    </div>

    <!-- 步骤3：导入结果 -->
    <div v-if="currentStep === 3" class="step-content">
      <div class="result-card" :class="resultCardClass">
        <div class="result-icon">
          <svg v-if="importResult?.success" viewBox="0 0 24 24" fill="none" stroke="#34C759" stroke-width="2" width="48" height="48">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
            <polyline points="22 4 12 14.01 9 11.01"></polyline>
          </svg>
          <svg v-else-if="isAllDuplicates" viewBox="0 0 24 24" fill="none" stroke="#FF9500" stroke-width="2" width="48" height="48">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          <svg v-else viewBox="0 0 24 24" fill="none" stroke="#FF3B30" stroke-width="2" width="48" height="48">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="15" y1="9" x2="9" y2="15"></line>
            <line x1="9" y1="9" x2="15" y2="15"></line>
          </svg>
        </div>
        <div class="result-title">
          {{ importResult?.success ? (isAllDuplicates ? '全部為重複聯繫人' : '導入成功') : '導入失敗' }}
        </div>

        <!-- 成功：新增/更新/跳过 三栏 -->
        <div v-if="importResult?.success && !isAllDuplicates" class="result-stats">
          <div class="result-stat added">
            <div class="result-stat-value">{{ importResult.added || 0 }}</div>
            <div class="result-stat-label">新增</div>
          </div>
          <div class="result-stat updated">
            <div class="result-stat-value">{{ importResult.updated || 0 }}</div>
            <div class="result-stat-label">更新</div>
          </div>
          <div class="result-stat skipped">
            <div class="result-stat-value">{{ importResult.skipped || 0 }}</div>
            <div class="result-stat-label">跳過（重複）</div>
          </div>
        </div>

        <!-- 全部重复态 -->
        <div v-else-if="importResult?.success && isAllDuplicates" class="result-desc">
          識別到的 {{ importResult.skipped }} 位聯繫人均已存在，未重複入庫
        </div>

        <div class="result-desc" v-else>
          {{ importResult?.error || '請稍後重試' }}
        </div>

        <!-- 重复名单 -->
        <div v-if="importResult?.success && importResult.skipped_names && importResult.skipped_names.length > 0" class="skip-detail">
          <div class="skip-detail-title">以下聯繫人已存在，已自動跳過：</div>
          <div class="skip-row" v-for="name in importResult.skipped_names" :key="name">
            <span class="skip-name">{{ name }}</span>
            <span class="skip-reason">已存在</span>
          </div>
        </div>
      </div>

      <div class="action-buttons">
        <button class="btn-secondary" @click="resetImport">繼續導入</button>
        <button class="btn-primary" @click="goHome">返回首頁</button>
      </div>
    </div>

    <!-- 编辑联系人弹窗 -->
    <div class="modal-mask" v-if="showEditModal" @click="closeEditModal">
      <div class="modal-sheet" @click.stop>
        <div class="modal-handle"></div>
        <div class="modal-title">編輯聯繫人</div>
        <div class="form-group">
          <label class="form-label">姓名</label>
          <input class="form-input" v-model="editingContact.name" placeholder="請輸入姓名" />
        </div>
        <div class="form-group">
          <label class="form-label">日期</label>
          <input class="form-input" type="date" v-model="editingContact.date" />
        </div>
        <div class="modal-actions">
          <button class="btn-secondary" @click="closeEditModal">取消</button>
          <button class="btn-primary" @click="saveContact">保存</button>
        </div>
      </div>
    </div>

    <div class="toast" v-if="toast.show">{{ toast.message }}</div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import api from '../utils/api'
import { isLoggedIn as checkLoggedIn, getUserInfo } from '../utils/auth'
import { recognizeImage } from '../utils/aiRecognize'
import { emitContactsImported } from '../utils/events'

const router = useRouter()

// ── 常量 ────────────────────────────────────────────────────────────
const MAX_IMAGES = 20

// ── 状态 ────────────────────────────────────────────────────────────
const currentStep = ref(1)
const imageQueue = ref([])
const contacts = ref([])
const importing = ref(false)
const importResult = ref(null)
const showEditModal = ref(false)
const editingContact = reactive({ index: -1, name: '', date: '' })
const toast = reactive({ show: false, message: '' })
// 查重结果：key = `${date}|${name}` -> 是否已存在；失败/未查时为空对象
const duplicateMap = ref({})

// 进行中的请求（itemId -> AbortController），用于 removeItem / clearQueue / 卸载时中止
const activeControllers = new Map()
// 串行识别锁：保证一次只跑一张图，避免撞后端限流
let processingRunning = false

// ── 计算属性 ────────────────────────────────────────────────────────
const queueDoneCount = computed(() => {
  return imageQueue.value.filter(i => i.status === 'done').length
})

// 按 sourceId（图片）分组的联系人，用于确认页按图展示
const groupedContacts = computed(() => {
  const groups = []
  const map = new Map()
  for (const c of contacts.value) {
    if (!map.has(c._sourceId)) {
      const img = imageQueue.value.find(it => it.id === c._sourceId)
      const group = {
        sourceId: c._sourceId,
        thumb: img?.thumb || '',
        fileName: img?.fileName || '',
        status: img?.status || '',
        contacts: [],
      }
      map.set(c._sourceId, group)
      groups.push(group)
    }
    map.get(c._sourceId).contacts.push(c)
  }
  return groups
})

const validContactCount = computed(() => {
  return contacts.value.filter(c => c.selected && c.date).length
})

const duplicateCount = computed(() => {
  return Object.values(duplicateMap.value).filter(Boolean).length
})

const isDuplicate = (c) => !!duplicateMap.value[`${c.date || ''}|${c.name || ''}`]

// 结果页：是否「全部重复」—— added=0 且 skipped>0
const isAllDuplicates = computed(() => {
  const r = importResult.value
  return !!(r && r.success && (r.added || 0) === 0 && (r.skipped || 0) > 0)
})

// 结果卡片态：成功（绿）/ 全部重复（橙）/ 失败（红）
const resultCardClass = computed(() => {
  if (!importResult.value) return ''
  if (!importResult.value.success) return 'error'
  if (isAllDuplicates.value) return 'warn'
  return 'success'
})

const canProceed = computed(() => {
  return queueDoneCount.value > 0 && !imageQueue.value.some(i => i.status === 'processing')
})

// ── 工具函数 ────────────────────────────────────────────────────────
function showToast(message, duration = 2000) {
  toast.message = message
  toast.show = true
  setTimeout(() => {
    toast.show = false
  }, duration)
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms))

// 通过 id 找到当前队列项并打补丁（避开下标错位问题）
function updateQueueItem(itemId, patch) {
  const idx = imageQueue.value.findIndex(it => it.id === itemId)
  if (idx < 0) return false
  imageQueue.value[idx] = { ...imageQueue.value[idx], ...patch }
  return true
}

// 给 contact 打上来源 itemId，方便后续按 itemId 清理（重试 / 删除图片）
// 默认选中（selected），确认页可逐条勾选
function mergeContacts(newContacts, sourceId) {
  if (!newContacts || newContacts.length === 0) return
  const tagged = newContacts.map(c => ({
    ...c,
    _sourceId: sourceId,
    selected: true,
  }))
  contacts.value = [...contacts.value, ...tagged]
}

function removeContactsBySource(sourceId) {
  contacts.value = contacts.value.filter(c => c._sourceId !== sourceId)
}

function getQueueItem(itemId) {
  return imageQueue.value.find(it => it.id === itemId) || null
}

// ── 队列调度 ────────────────────────────────────────────────────────
async function runOneItem(itemId) {
  const item = getQueueItem(itemId)
  if (!item) return

  const controller = new AbortController()
  activeControllers.set(itemId, controller)
  updateQueueItem(itemId, { status: 'processing', errorMsg: '' })

  try {
    const extracted = await recognizeImage(item.file, controller.signal)

    // 用户可能中途已 remove —— 该 item 不在队列里，直接丢弃结果
    if (!getQueueItem(itemId)) {
      activeControllers.delete(itemId)
      return
    }
    updateQueueItem(itemId, {
      status: 'done',
      contactsFound: extracted.length,
      errorMsg: '',
      statusMsg: '',
    })
    mergeContacts(extracted, itemId)
  } catch (e) {
    // 被 abort 的错误是正常路径，吞掉、不写错误状态
    if (controller.signal.aborted) {
      activeControllers.delete(itemId)
      return
    }
    if (getQueueItem(itemId)) {
      updateQueueItem(itemId, {
        status: 'error',
        errorMsg: e.message || '識別失敗',
        statusMsg: '',
      })
    }
  } finally {
    activeControllers.delete(itemId)
  }
}

async function processQueue() {
  // 串行锁：一次只处理一张图，避免撞后端限流，状态清晰、可逐张取消
  if (processingRunning) return
  processingRunning = true
  try {
    while (true) {
      const next = imageQueue.value.find(it => it.status === 'pending')
      if (!next) return
      await runOneItem(next.id)
    }
  } finally {
    processingRunning = false
  }
}

// ── 步骤切换 ────────────────────────────────────────────────────────
function goBack() {
  currentStep.value = 1
}

function goHome() {
  router.push('/index')
}

// ── 选择图片 ────────────────────────────────────────────────────────
function chooseImage() {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'image/*'
  input.multiple = true
  input.onchange = (e) => {
    const files = Array.from(e.target.files)
    if (files.length === 0) return

    const remaining = MAX_IMAGES - imageQueue.value.length
    if (remaining <= 0) {
      showToast(`最多 ${MAX_IMAGES} 張圖片，請先刪除部分再添加`)
      return
    }
    const accepted = files.slice(0, remaining)
    if (files.length > remaining) {
      showToast(`已添加 ${remaining} 張，達到上限 ${MAX_IMAGES} 張`)
    }

    // id 用 Date.now + 索引避免偶发碰撞；thumb 用 URL.createObjectURL 生成缩略图
    const baseId = Date.now()
    const newItems = accepted.map((file, i) => ({
      id: baseId + i,
      fileName: file.name,
      file,
      fileSize: file.size,
      thumb: URL.createObjectURL(file),
      status: 'pending',
      statusMsg: '',
      contactsFound: 0,
      errorMsg: '',
    }))

    imageQueue.value = [...imageQueue.value, ...newItems]
    processQueue() // 串行锁，重复调用安全
  }
  input.click()
}

function retryItem(itemId) {
  // 先清掉之前那次合并的 contacts，避免重复入库
  removeContactsBySource(itemId)
  updateQueueItem(itemId, {
    status: 'pending',
    errorMsg: '',
    statusMsg: '',
    contactsFound: 0,
  })
  processQueue()
}

function removeItem(itemId) {
  // 取消可能正在跑的请求
  const ctrl = activeControllers.get(itemId)
  if (ctrl) {
    ctrl.abort()
    activeControllers.delete(itemId)
  }
  const item = imageQueue.value.find(it => it.id === itemId)
  if (item?.thumb) URL.revokeObjectURL(item.thumb)
  imageQueue.value = imageQueue.value.filter(it => it.id !== itemId)
  removeContactsBySource(itemId)
}

function clearQueue() {
  // 中止所有进行中的请求
  activeControllers.forEach(ctrl => ctrl.abort())
  activeControllers.clear()
  // 释放缩略图 objectURL，避免内存泄漏
  imageQueue.value.forEach(it => {
    if (it.thumb) URL.revokeObjectURL(it.thumb)
  })
  imageQueue.value = []
  contacts.value = []
}

function proceedToConfirm() {
  if (contacts.value.length === 0) {
    showToast('沒有識別到聯繫人')
    return
  }
  // 进入确认页前查重：识别已完成但尚未标记重复项；接口失败静默降级
  duplicateMap.value = {}
  void checkDuplicatesFor(contacts.value)
  currentStep.value = 2
}

// 查重辅助：按 date+name 去重键，返回 [{date, name, ...}] 的入参（剥离前端字段）
// 返回一个 Map<key, exists>，合并写入 duplicateMap，并把命中的 contact.selected = false
async function checkDuplicatesFor(items) {
  const arr = Array.isArray(items) ? items : []
  if (arr.length === 0) return
  const payload = arr
    .filter(c => c && c.date && c.name)
    .map(({ _sourceId, selected, ...rest }) => rest)
  if (payload.length === 0) return
  try {
    const res = await api.post('/customers/check-duplicates', { contacts: payload })
    const results = Array.isArray(res?.results) ? res.results : []
    const newMap = { ...duplicateMap.value }
    for (const r of results) {
      if (!r) continue
      const key = `${r.date || ''}|${r.name || ''}`
      newMap[key] = !!r.exists
    }
    duplicateMap.value = newMap
    // 命中的项默认不勾选（所见即所得）
    for (const c of arr) {
      if (!c) continue
      const key = `${c.date || ''}|${c.name || ''}`
      if (newMap[key]) c.selected = false
    }
  } catch (_) {
    // 查重接口未就绪/失败：静默降级，duplicateMap 留空，保持默认全选
  }
}

// ── 编辑联系人 ──────────────────────────────────────────────────────
function editContact(index) {
  editingContact.index = index
  editingContact.name = contacts.value[index].name
  editingContact.date = contacts.value[index].date
  showEditModal.value = true
}

function closeEditModal() {
  showEditModal.value = false
}

function saveContact() {
  if (!editingContact.name.trim()) {
    showToast('請輸入姓名')
    return
  }
  // 原 contact 引用（保留 _sourceId 等元数据）
  const original = contacts.value[editingContact.index]
  contacts.value[editingContact.index] = {
    ...original,
    name: editingContact.name,
    date: editingContact.date,
  }
  closeEditModal()
}

// ── 导入 ────────────────────────────────────────────────────────────
async function startImport() {
  if (importing.value) return
  importing.value = true

  try {
    const validContacts = contacts.value
      .filter(c => c.selected && c.date)
      // 入库前剥离仅前端用的字段，避免污染后端
      .map(({ _sourceId, selected, ...rest }) => rest)
    if (validContacts.length === 0) {
      showToast('請至少選擇一個有效聯繫人')
      importing.value = false
      return
    }
    const res = await api.post('/customers/batch-import', { contacts: validContacts })

    importResult.value = {
      success: true,
      added: res.added ?? 0,
      updated: res.updated ?? 0,
      skipped: res.skipped ?? 0,
      skipped_names: Array.isArray(res.skipped_names) ? res.skipped_names : [],
    }
    emitContactsImported({ count: res.added ?? validContacts.length })
    currentStep.value = 3
  } catch (e) {
    importResult.value = {
      success: false,
      error: e.message || '導入失敗',
    }
    currentStep.value = 3
  } finally {
    importing.value = false
  }
}

function resetImport() {
  currentStep.value = 1
  imageQueue.value.forEach(it => {
    if (it.thumb) URL.revokeObjectURL(it.thumb)
  })
  imageQueue.value = []
  contacts.value = []
  importResult.value = null
  duplicateMap.value = {}
}

// ── 生命周期 ────────────────────────────────────────────────────────
onMounted(() => {
  if (!checkLoggedIn()) {
    showToast('請先登錄')
    setTimeout(() => {
      router.push('/login')
    }, 1500)
    return
  }

  const userInfo = getUserInfo()
  if (userInfo?.role === 'admin') {
    showToast('管理員無此權限')
    setTimeout(() => {
      router.back()
    }, 1500)
  }
})

onUnmounted(() => {
  // 离开页面时取消还在跑的识别，防止回调污染 / 内存泄漏
  activeControllers.forEach(ctrl => ctrl.abort())
  activeControllers.clear()
  // 释放缩略图 objectURL
  imageQueue.value.forEach(it => {
    if (it.thumb) URL.revokeObjectURL(it.thumb)
  })
})
</script>

<style scoped>
.ai-import-page {
  min-height: 100vh;
  background: var(--bg-primary);
  padding: 20px 14px;
}

.step-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 30px;
  padding: 0 20px;
}

.step {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}

.step-number {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--border-glass);
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 600;
  transition: all 0.3s;
}

.step.active .step-number {
  background: var(--primary);
  color: white;
}

.step.completed .step-number {
  background: var(--success);
  color: white;
}

.step-text {
  font-size: 12px;
  color: var(--text-secondary);
  font-weight: 500;
}

.step.active .step-text {
  color: var(--primary);
  font-weight: 600;
}

.step-line {
  flex: 1;
  height: 2px;
  background: var(--border-glass);
  margin: 0 8px;
  margin-bottom: 20px;
  transition: background 0.3s;
}

.step-line.active {
  background: var(--success);
}

.step-content {
  max-width: 400px;
  margin: 0 auto;
}

.upload-area {
  border: 2px dashed var(--border-glass);
  border-radius: 18px;
  padding: 40px 20px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s;
  background: white;
}

.upload-area:active {
  border-color: var(--primary);
  background: rgba(0, 122, 255, 0.02);
}

.upload-icon {
  color: var(--primary);
  margin-bottom: 12px;
}

.upload-text {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 6px;
}

.upload-hint {
  font-size: 13px;
  color: var(--text-secondary);
}

.image-queue {
  margin-top: 20px;
}

.queue-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  font-size: 14px;
  color: var(--text-secondary);
}

.queue-progress {
  color: var(--primary);
  font-weight: 600;
}

.queue-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  background: white;
  border: 1px solid var(--border-glass);
  border-radius: 12px;
  margin-bottom: 8px;
  gap: 12px;
}

.queue-item-thumb {
  width: 48px;
  height: 48px;
  object-fit: cover;
  border-radius: 8px;
  flex-shrink: 0;
  background: var(--bg-primary);
}

.queue-item.processing {
  border-color: var(--primary);
  background: rgba(0, 122, 255, 0.02);
}

.queue-item.done {
  border-color: var(--success);
  background: rgba(52, 199, 89, 0.02);
}

.queue-item.error {
  border-color: var(--danger);
  background: rgba(255, 59, 48, 0.02);
}

.queue-item-info {
  flex: 1;
  min-width: 0;
}

.queue-item-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 4px;
}

.queue-item-status {
  font-size: 12px;
  color: var(--text-secondary);
}

.queue-item-status .processing {
  color: var(--primary);
}

.queue-item-status .done {
  color: var(--success);
}

.queue-item-status .error {
  color: var(--danger);
}

.queue-item-action {
  display: flex;
  gap: 6px;
}

.btn-retry {
  padding: 4px 10px;
  border-radius: 6px;
  background: var(--primary);
  color: white;
  font-size: 12px;
  font-weight: 500;
}

.btn-remove {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--border-glass);
  color: var(--text-secondary);
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.action-buttons {
  display: flex;
  gap: 10px;
  margin-top: 20px;
}

.btn-secondary {
  flex: 1;
  padding: 12px;
  border-radius: 12px;
  background: white;
  color: var(--text-primary);
  font-size: 14px;
  font-weight: 600;
  border: 1px solid var(--border-glass);
}

.btn-primary {
  flex: 1;
  padding: 12px;
  border-radius: 12px;
  background: var(--primary);
  color: white;
  font-size: 14px;
  font-weight: 600;
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.confirm-header {
  text-align: center;
  margin-bottom: 20px;
}

.confirm-title {
  font-size: 18px;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 6px;
}

.confirm-subtitle {
  font-size: 14px;
  color: var(--text-secondary);
}

.contacts-list {
  max-height: 400px;
  overflow-y: auto;
}

.contact-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  background: white;
  border: 1px solid var(--border-glass);
  border-radius: 12px;
  margin-bottom: 8px;
}

.contact-item.invalid {
  border-color: var(--danger);
  background: rgba(255, 59, 48, 0.02);
}

.contact-item.disabled {
  opacity: 0.55;
}

.contact-group {
  margin-bottom: 18px;
}

.group-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  background: var(--bg-primary);
  border-radius: 10px;
  margin-bottom: 8px;
}

.group-thumb {
  width: 40px;
  height: 40px;
  object-fit: cover;
  border-radius: 6px;
  flex-shrink: 0;
}

.group-title {
  flex: 1;
  min-width: 0;
}

.group-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.group-count {
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: 2px;
}

.btn-group-action {
  padding: 4px 10px;
  border-radius: 6px;
  background: white;
  color: var(--text-secondary);
  font-size: 12px;
  font-weight: 500;
  border: 1px solid var(--border-glass);
}

.contact-check {
  flex-shrink: 0;
  width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.contact-check input {
  width: 18px;
  height: 18px;
  accent-color: var(--primary);
}

.contact-index {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--bg-primary);
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
  flex-shrink: 0;
}

.contact-info {
  flex: 1;
  min-width: 0;
}

.contact-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 2px;
}

.contact-date {
  font-size: 12px;
  color: var(--text-secondary);
}

.contact-date.invalid {
  color: var(--danger);
}

.dup-tag {
  margin-left: 4px;
  color: var(--text-secondary);
  font-weight: 500;
}

.dup-badge {
  display: inline-block;
  margin-left: 6px;
  padding: 1px 6px;
  font-size: 11px;
  font-weight: 600;
  color: #FF9500;
  background: rgba(255, 149, 0, 0.12);
  border-radius: 4px;
  vertical-align: middle;
}

.contact-action {
  flex-shrink: 0;
}

.btn-edit {
  padding: 4px 10px;
  border-radius: 6px;
  background: var(--bg-primary);
  color: var(--primary);
  font-size: 12px;
  font-weight: 500;
}

.result-card {
  text-align: center;
  padding: 40px 20px;
  background: white;
  border-radius: 18px;
  margin-bottom: 20px;
}

.result-card.success {
  border: 1px solid rgba(52, 199, 89, 0.2);
}

.result-card.error {
  border: 1px solid rgba(255, 59, 48, 0.2);
}

.result-card.warn {
  border: 1px solid rgba(255, 149, 0, 0.25);
  background: rgba(255, 149, 0, 0.04);
}

.result-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  margin: 14px 0 10px;
}

.result-stat {
  background: var(--bg-primary);
  border-radius: 10px;
  padding: 12px 6px;
  text-align: center;
}

.result-stat-value {
  font-size: 22px;
  font-weight: 800;
  line-height: 1;
  margin-bottom: 4px;
}

.result-stat-label {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-secondary);
}

.result-stat.added .result-stat-value { color: var(--success); }
.result-stat.updated .result-stat-value { color: var(--primary); }
.result-stat.skipped .result-stat-value { color: #FF9500; }

.skip-detail {
  margin-top: 14px;
  padding-top: 12px;
  border-top: 1px dashed var(--border-glass);
  text-align: left;
}

.skip-detail-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
  margin-bottom: 8px;
}

.skip-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 0;
  font-size: 13px;
}

.skip-name {
  color: var(--text-primary);
  font-weight: 500;
}

.skip-reason {
  font-size: 11px;
  font-weight: 600;
  color: #FF9500;
  background: rgba(255, 149, 0, 0.1);
  padding: 2px 8px;
  border-radius: 4px;
}

.result-icon {
  margin-bottom: 16px;
}

.result-title {
  font-size: 18px;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 8px;
}

.result-desc {
  font-size: 14px;
  color: var(--text-secondary);
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
  margin-bottom: 16px;
  color: var(--text-primary);
}

.form-group {
  margin-bottom: 14px;
}

.form-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-secondary);
  margin-bottom: 6px;
  display: block;
}

.form-input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--border-glass);
  border-radius: 10px;
  font-size: 14px;
  color: var(--text-primary);
}

.form-input:focus {
  border-color: var(--primary);
  outline: none;
}

.modal-actions {
  display: flex;
  gap: 10px;
  margin-top: 16px;
}

@keyframes pop-in {
  from { opacity: 0; transform: scale(1.05); }
  to { opacity: 1; transform: scale(1); }
}

/* PC 适配 */
@media (min-width: 1024px) {
  .ai-import-page {
    padding: 32px 28px 40px;
    max-width: none;
    margin: 0;
  }

  .step-indicator {
    padding: 0 60px;
    margin-bottom: 40px;
  }

  .step-number {
    width: 38px;
    height: 38px;
    font-size: 15px;
  }

  .upload-area {
    padding: 60px 24px;
    border-radius: 20px;
  }

  .upload-text {
    font-size: 18px;
  }

  .contacts-list {
    max-height: 540px;
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
  }

  .contact-item {
    margin-bottom: 0;
  }

  .result-card {
    padding: 60px 24px;
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
  }

  .modal-handle {
    display: none;
  }

  .modal-title {
    font-size: 18px;
    text-align: center;
  }

  .toast {
    top: 80px;
    bottom: auto;
  }

  /* ============ PC 增强:满宽 + 步骤1双栏 + 毛玻璃（方案 A） ============ */
  .step-content { max-width: none; }

  /* 步骤1 无队列:上传区居中限宽 */
  .step-content.step-1:not(:has(.image-queue)) .upload-area {
    max-width: 480px;
    margin-left: auto;
    margin-right: auto;
  }

  /* 步骤1 有队列:左上传区 + 右队列双栏(:has 渐进增强,不支持则退化为单列) */
  .step-content.step-1:has(.image-queue) {
    display: grid;
    grid-template-columns: minmax(0, 440px) minmax(0, 1fr);
    gap: 24px;
    align-items: start;
  }
  .step-content.step-1:has(.image-queue) .action-buttons {
    grid-column: 1 / -1;
  }

  /* 队列项右侧双列排布 */
  .image-queue {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
  }
  .image-queue .queue-header { grid-column: 1 / -1; }

  /* 卡片毛玻璃化 */
  .upload-area {
    background: var(--bg-card);
    backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
  }
  .upload-area:hover {
    border-color: var(--primary);
    background: rgba(0, 122, 255, 0.04);
  }
  .queue-item {
    background: var(--bg-card);
    backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
  }
  .contact-item {
    background: var(--bg-card);
    backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
    transition: all 0.2s;
  }
  .contact-item:hover {
    box-shadow: 0 4px 14px rgba(0, 0, 0, 0.05);
    transform: translateY(-1px);
  }
  .result-card {
    max-width: 560px;
    margin-left: auto;
    margin-right: auto;
    background: var(--bg-card);
    backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
  }
}

/* 超宽屏:确认页联系人三列 */
@media (min-width: 1440px) {
  .contacts-list {
    grid-template-columns: repeat(3, 1fr);
  }
}
</style>
