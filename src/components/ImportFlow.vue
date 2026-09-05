<template>
  <div class="import-flow">
    <!-- 步骤指示器 -->
    <div class="step-indicator">
      <div class="step" :class="{ active: currentStep === 1, completed: currentStep > 1 }">
        <div class="step-number">1</div>
        <div class="step-text">选择图片</div>
      </div>
      <div class="step-line" :class="{ active: currentStep > 1 }"></div>
      <div class="step" :class="{ active: currentStep === 2, completed: currentStep > 2 }">
        <div class="step-number">2</div>
        <div class="step-text">确认信息</div>
      </div>
      <div class="step-line" :class="{ active: currentStep > 2 }"></div>
      <div class="step" :class="{ active: currentStep === 3 }">
        <div class="step-number">3</div>
        <div class="step-text">导入结果</div>
      </div>
    </div>

    <!-- 步骤1：选择图片（点击 / 拖拽 / Ctrl+V 粘贴） -->
    <div v-if="currentStep === 1" class="step-content step-1">
      <div
        class="upload-area"
        :class="{ dragging }"
        @click="chooseImage"
        @dragover.prevent="dragging = true"
        @dragleave.prevent="dragging = false"
        @drop.prevent="onDrop"
      >
        <div class="upload-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="44" height="44">
            <rect x="3" y="3" width="18" height="18" rx="3" ry="3"></rect>
            <circle cx="8.5" cy="8.5" r="1.5"></circle>
            <polyline points="21 15 16 10 5 21"></polyline>
          </svg>
        </div>
        <div class="upload-text">{{ dragging ? '松开即可添加' : '点击选图 / 拖拽截图到此处' }}</div>
        <div class="upload-hint">
          支持 JPG、PNG，最多 {{ MAX_IMAGES }} 张，可分多次添加<br />
          也可直接 <span class="kbd">Ctrl</span> + <span class="kbd">V</span> 粘贴微信截图
        </div>
      </div>

      <!-- 图片队列 -->
      <div v-if="imageQueue.length > 0" class="image-queue">
        <div class="queue-header">
          <span>已选择 {{ imageQueue.length }} 张图片</span>
          <span class="queue-progress">{{ queueDoneCount }}/{{ imageQueue.length }} 已处理</span>
        </div>
        <div v-for="item in imageQueue" :key="item.id" class="queue-item" :class="item.status">
          <img v-if="item.thumb" :src="item.thumb" class="queue-item-thumb" />
          <div class="queue-item-info">
            <div class="queue-item-name">{{ item.fileName }}</div>
            <div class="queue-item-status">
              <span v-if="item.status === 'pending'">等待处理</span>
              <span v-else-if="item.status === 'processing'" class="processing">正在识别...</span>
              <span v-else-if="item.status === 'done'" class="done">完成（{{ item.contactsFound }} 个联系人）</span>
              <span v-else-if="item.status === 'error'" class="error">{{ item.errorMsg }}</span>
            </div>
          </div>
          <div class="queue-item-action">
            <button v-if="item.status === 'error'" class="btn-retry" @click="retryItem(item.id)">重试</button>
            <button class="btn-remove" @click="removeItem(item.id)">✕</button>
          </div>
        </div>
      </div>

      <!-- 操作按钮 -->
      <div v-if="imageQueue.length > 0" class="action-buttons">
        <button class="btn-secondary" @click="clearQueue">清空列表</button>
        <button class="btn-primary" :disabled="!canProceed" @click="proceedToConfirm">
          下一步 · 确认信息
        </button>
      </div>
    </div>

    <!-- 步骤2：确认信息 -->
    <div v-if="currentStep === 2" class="step-content">
      <div class="confirm-header">
        <div class="confirm-title">识别结果</div>
        <div class="confirm-subtitle">
          共 {{ contacts.length }} 个联系人，已选 {{ validContactCount }} 个有效可导入<span v-if="duplicateCount > 0" class="dup-tag">（{{ duplicateCount }} 位重复）</span>
        </div>
        <div class="over-limit-hint" v-if="overLimit">⚠️ 联系人超过 200 条上限，请移除部分图片后分批导入</div>
      </div>

      <div class="contacts-list">
        <div v-for="group in groupedContacts" :key="group.sourceId" class="contact-group">
          <div class="group-header">
            <img v-if="group.thumb" :src="group.thumb" class="group-thumb" />
            <div class="group-title">
              <div class="group-name">{{ group.fileName }}</div>
              <div class="group-count">{{ group.contacts.length }} 个联系人</div>
            </div>
            <button class="btn-group-action" @click="retryItem(group.sourceId)" v-if="group.status === 'error'">重试</button>
            <button class="btn-group-action" @click="removeItem(group.sourceId)">移除</button>
          </div>
          <div
            v-for="contact in group.contacts"
            :key="contact._uid"
            class="contact-item"
            :class="{ invalid: !contact.date, disabled: !contact.selected }"
          >
            <label class="contact-check">
              <input type="checkbox" v-model="contact.selected" :disabled="!contact.date" />
            </label>
            <div class="contact-info">
              <div class="contact-name">
                {{ contact.name }}
                <span v-if="isDuplicate(contact)" class="dup-badge">已存在 · 将合并更新</span>
              </div>
              <div class="contact-date" v-if="contact.date">{{ contact.date }}</div>
              <div class="contact-date invalid" v-else>日期无效（不可导入，可点编辑修正）</div>
            </div>
            <div class="contact-action">
              <button class="btn-edit" @click="editContact(contacts.indexOf(contact))">编辑</button>
            </div>
          </div>
        </div>
      </div>

      <div class="action-buttons">
        <button class="btn-secondary" @click="goBack">返回</button>
        <button class="btn-primary" :disabled="validContactCount === 0 || importing || overLimit" @click="startImport">
          {{ importing ? '导入中...' : `开始导入（${validContactCount} 位）` }}
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
          {{ importResult?.success ? (isAllDuplicates ? '全部为重复联系人' : '导入成功') : '导入失败' }}
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
            <div class="result-stat-label">跳过（重复）</div>
          </div>
        </div>

        <div class="result-desc" v-else-if="importResult?.success && isAllDuplicates">
          识别到的 {{ importResult.skipped }} 位联系人均已存在，未重复入库
        </div>

        <div class="result-desc" v-else>
          {{ importResult?.error || '请稍后重试' }}
        </div>

        <!-- 重复名单 -->
        <div v-if="importResult?.success && importResult.skipped_names && importResult.skipped_names.length > 0" class="skip-detail">
          <div class="skip-detail-title">以下联系人已存在，已自动跳过：</div>
          <div class="skip-row" v-for="name in importResult.skipped_names" :key="name">
            <span class="skip-name">{{ name }}</span>
            <span class="skip-reason">已存在</span>
          </div>
        </div>
      </div>

      <div class="action-buttons">
        <button class="btn-secondary" @click="resetImport">继续导入</button>
        <button class="btn-primary" @click="goBack">完成</button>
      </div>
    </div>

    <!-- 编辑联系人弹窗 -->
    <div class="modal-mask" v-if="showEditModal" @click="closeEditModal">
      <div class="modal-sheet" @click.stop>
        <div class="modal-handle"></div>
        <div class="modal-title">编辑联系人</div>
        <div class="form-group">
          <label class="form-label">姓名</label>
          <input class="form-input" v-model="editingContact.name" placeholder="请输入姓名" />
        </div>
        <div class="form-group">
          <label class="form-label">日期</label>
          <input class="form-input" type="date" v-model="editingContact.dateDisplay" />
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
import api from '../utils/api'
import { recognizeImage } from '../utils/aiRecognize'
import { emitContactsImported } from '../utils/events'
import { useToast } from '../composables/useToast'

// 录入流程主体：页面（移动端整页）与弹窗（PC 工作台内嵌）共用
// 关闭动作（返回/完成）交给宿主处理：页面里是路由返回，弹窗里是关闭弹窗
const emit = defineEmits(['close'])
const { toast, showToast } = useToast()

// ── 常量 ────────────────────────────────────────────────
const MAX_IMAGES = 20

// ── 状态 ────────────────────────────────────────────────
const currentStep = ref(1)
const imageQueue = ref([])
const contacts = ref([])
const importing = ref(false)
const importResult = ref(null)
const showEditModal = ref(false)
const editingContact = reactive({ index: -1, name: '', dateDisplay: '' })
const dragging = ref(false)
// 查重结果：key = `${MMDD}|${name}` -> 是否已存在；失败/未查时为空对象
const duplicateMap = ref({})
// 联系人唯一序号（同名联系人 key 冲突规避）
let uidSeq = 0

// 后端日期约定：MMDD(4位，默认就近年份) / YMMDD(5位，首位为年份末位)
// 与 batch-import 的解析完全对齐；编辑弹窗用 date input，需双向转换
function mmddToISO(d) {
  const s = String(d || '')
  if (/^\d{4}$/.test(s)) {
    return `${new Date().getFullYear()}-${s.slice(0, 2)}-${s.slice(2)}`
  }
  if (/^\d{5}$/.test(s)) {
    const yLast = parseInt(s[0], 10)
    const currYear = new Date().getFullYear()
    const year = currYear - (((currYear % 10) - yLast + 10) % 10)
    return `${year}-${s.slice(1, 3)}-${s.slice(3)}`
  }
  return ''
}
function isoToMmdd(iso) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso || '')) return iso || ''
  const [y, m, d] = iso.split('-')
  const currYear = new Date().getFullYear()
  return Number(y) === currYear ? `${m}${d}` : `${y.slice(-1)}${m}${d}`
}
// 查重 key：YMMDD 归一为 MMDD（后端 validateContactDate 同样剥去年份位）
function dupKey(c) {
  let d = String(c?.date || '')
  if (/^\d{5}$/.test(d)) d = d.slice(1)
  return `${d}|${c?.name || ''}`
}

// 进行中的请求（itemId -> AbortController），用于 removeItem / clearQueue / 卸载时中止
const activeControllers = new Map()
// 串行识别锁：保证一次只跑一张图，避免撞后端限流
let processingRunning = false

// ── 计算属性 ────────────────────────────────────────────
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

// 后端 batch-import 单次上限 200 条，超出则禁用导入按钮
const overLimit = computed(() => contacts.value.length > 200)

const isDuplicate = (c) => !!duplicateMap.value[dupKey(c)]

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

// ── 导航 ────────────────────────────────────────────────
function goBack() {
  if (currentStep.value === 2) {
    currentStep.value = 1
    return
  }
  emit('close')
}

// ── 添加图片（选图 / 拖拽 / 粘贴共用）────────────────────
function addFiles(files) {
  if (!files || files.length === 0) return
  const imageFiles = Array.from(files).filter((f) => f && f.type && f.type.startsWith('image/'))
  if (imageFiles.length === 0) {
    showToast('请选择图片文件')
    return
  }

  const remaining = MAX_IMAGES - imageQueue.value.length
  if (remaining <= 0) {
    showToast(`最多 ${MAX_IMAGES} 张图片，请先删除部分再添加`)
    return
  }
  const accepted = imageFiles.slice(0, remaining)
  if (imageFiles.length > remaining) {
    showToast(`已添加 ${remaining} 张，达到上限 ${MAX_IMAGES} 张`)
  }

  // id 用 Date.now + 索引避免偶发碰撞；thumb 用 URL.createObjectURL 生成缩略图
  const baseId = Date.now()
  const newItems = accepted.map((file, i) => ({
    id: baseId + i,
    fileName: file.name || `粘贴图片_${baseId + i}`,
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

function chooseImage() {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'image/*'
  input.multiple = true
  input.onchange = (e) => addFiles(e.target.files)
  input.click()
}

function onDrop(e) {
  dragging.value = false
  addFiles(e.dataTransfer?.files)
}

// 全局粘贴：微信截图 Ctrl+V 直接入队（仅步骤1）
function onPaste(e) {
  if (currentStep.value !== 1) return
  const files = e.clipboardData?.files
  if (files && files.length > 0) {
    e.preventDefault()
    addFiles(files)
  }
}

// ── 队列调度 ────────────────────────────────────────────
// 通过 id 找到当前队列项并打补丁（避开下标错位问题）
function updateQueueItem(itemId, patch) {
  const idx = imageQueue.value.findIndex(it => it.id === itemId)
  if (idx < 0) return false
  imageQueue.value[idx] = { ...imageQueue.value[idx], ...patch }
  return true
}

// 给 contact 打上来源 itemId 与唯一序号，方便清理与渲染 key
function mergeContacts(newContacts, sourceId) {
  if (!newContacts || newContacts.length === 0) return
  const tagged = newContacts.map(c => ({
    ...c,
    _sourceId: sourceId,
    _uid: ++uidSeq,
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
        errorMsg: e.message || '识别失败',
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

// ── 步骤2：查重 + 确认 ─────────────────────────────────
function proceedToConfirm() {
  if (contacts.value.length === 0) {
    showToast('没有识别到联系人')
    return
  }
  // 进入确认页前查重：识别已完成但尚未标记重复项；接口失败静默降级
  duplicateMap.value = {}
  void checkDuplicatesFor(contacts.value)
  currentStep.value = 2
}

// 查重辅助：按当前联系人集合整体重建 duplicateMap（避免编辑改名后残留旧 key）
// 命中的 contact 自动取消勾选（所见即所得）；接口失败静默降级
async function checkDuplicatesFor(items) {
  const arr = Array.isArray(items) ? items : []
  if (arr.length === 0) return
  const payload = arr
    .filter(c => c && c.date && c.name)
    .map(({ _sourceId, _uid, selected, ...rest }) => rest)
  if (payload.length === 0) return
  try {
    const res = await api.post('/customers/check-duplicates', { contacts: payload })
    const results = Array.isArray(res?.results) ? res.results : []
    const existsMap = {}
    for (const r of results) {
      if (!r) continue
      existsMap[`${r.date || ''}|${r.name || ''}`] = !!r.exists
    }
    const newMap = {}
    for (const c of arr) {
      if (!c || !c.date || !c.name) continue
      const k = dupKey(c)
      newMap[k] = existsMap[k] ?? false
    }
    duplicateMap.value = newMap
    for (const c of arr) {
      if (!c) continue
      if (newMap[dupKey(c)]) c.selected = false
    }
  } catch (_) {
    // 查重接口未就绪/失败：静默降级，duplicateMap 留空，保持默认全选
  }
}

// ── 编辑联系人 ──────────────────────────────────────────
function editContact(index) {
  editingContact.index = index
  editingContact.name = contacts.value[index].name
  editingContact.dateDisplay = mmddToISO(contacts.value[index].date)
  showEditModal.value = true
}

function closeEditModal() {
  showEditModal.value = false
}

function saveContact() {
  if (!editingContact.name.trim()) {
    showToast('请输入姓名')
    return
  }
  if (!editingContact.dateDisplay) {
    showToast('请选择日期')
    return
  }
  // 原 contact 引用（保留 _sourceId 等元数据）；日期转回后端约定的 MMDD/YMMDD
  const original = contacts.value[editingContact.index]
  contacts.value[editingContact.index] = {
    ...original,
    name: editingContact.name,
    date: isoToMmdd(editingContact.dateDisplay),
  }
  // 修正后重查全量重复标记（改名/改日期会改变命中结果）
  void checkDuplicatesFor(contacts.value)
  closeEditModal()
}

// ── 导入 ────────────────────────────────────────────────
async function startImport() {
  if (importing.value) return
  importing.value = true

  try {
    const validContacts = contacts.value
      .filter(c => c.selected && c.date)
      // 入库前剥离仅前端用的字段，避免污染后端
      .map(({ _sourceId, selected, ...rest }) => rest)
    if (validContacts.length === 0) {
      showToast('请至少选择一个有效联系人')
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
      error: e.message || '导入失败',
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

// ── 生命周期 ────────────────────────────────────────────
onMounted(() => {
  document.addEventListener('paste', onPaste)
})

onUnmounted(() => {
  document.removeEventListener('paste', onPaste)
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
.import-flow {
  background: var(--bg-primary);
  padding: 0 4px 24px;
}

/* 步骤指示器 */
.step-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 24px;
  padding: 0 10px;
}
.step { display: flex; flex-direction: column; align-items: center; gap: 6px; }
.step-number {
  width: 32px; height: 32px; border-radius: 50%;
  background: var(--border-glass); color: var(--text-secondary);
  display: flex; align-items: center; justify-content: center;
  font-size: 14px; font-weight: 600; transition: all 0.3s;
}
.step.active .step-number { background: var(--primary); color: white; box-shadow: 0 3px 10px rgba(0,122,255,0.35); }
.step.completed .step-number { background: var(--success); color: white; }
.step-text { font-size: 12px; color: var(--text-secondary); font-weight: 500; }
.step.active .step-text { color: var(--primary); font-weight: 600; }
.step-line {
  flex: 1; height: 2px; background: var(--border-glass);
  margin: 0 8px; margin-bottom: 20px; transition: background 0.3s;
}
.step-line.active { background: var(--success); }

.step-content { max-width: 400px; margin: 0 auto; }

/* 上传区 */
.upload-area {
  border: 2px dashed var(--border-glass);
  border-radius: 18px;
  padding: 36px 20px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s;
  background: var(--bg-card);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
}
.upload-area:active { border-color: var(--primary); }
.upload-area.dragging {
  border-color: var(--primary);
  background: rgba(0, 122, 255, 0.05);
  transform: scale(1.01);
}
.upload-area:hover { border-color: var(--primary); }
.upload-icon { color: var(--primary); margin-bottom: 12px; }
.upload-text { font-size: 16px; font-weight: 600; color: var(--text-primary); margin-bottom: 6px; }
.upload-hint { font-size: 12px; color: var(--text-secondary); line-height: 1.8; }
.kbd {
  font-family: inherit;
  font-size: 11px; font-weight: 700;
  border: 1px solid var(--border-glass); border-radius: 5px;
  padding: 1px 5px; color: var(--text-secondary); background: #fff;
}

/* 队列 */
.image-queue { margin-top: 20px; }
.queue-header {
  display: flex; justify-content: space-between; align-items: center;
  margin-bottom: 12px; font-size: 14px; color: var(--text-secondary);
}
.queue-progress { color: var(--primary); font-weight: 600; }
.queue-item {
  display: flex; align-items: center;
  padding: 12px 14px;
  background: var(--bg-card);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid var(--border-glass);
  border-radius: 12px;
  margin-bottom: 8px;
  gap: 12px;
}
.queue-item-thumb {
  width: 48px; height: 48px; object-fit: cover;
  border-radius: 8px; flex-shrink: 0; background: var(--bg-primary);
}
.queue-item.processing { border-color: var(--primary); background: rgba(0, 122, 255, 0.02); }
.queue-item.done { border-color: var(--success); background: rgba(52, 199, 89, 0.02); }
.queue-item.error { border-color: var(--danger); background: rgba(255, 59, 48, 0.02); }
.queue-item-info { flex: 1; min-width: 0; }
.queue-item-name {
  font-size: 13px; font-weight: 600; color: var(--text-primary);
  margin-bottom: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.queue-item-status { font-size: 12px; color: var(--text-secondary); }
.queue-item-status .processing { color: var(--primary); }
.queue-item-status .done { color: var(--success); }
.queue-item-status .error { color: var(--danger); }
.queue-item-action { display: flex; gap: 6px; }
.btn-retry {
  padding: 4px 10px; border-radius: 6px;
  background: var(--primary); color: white;
  font-size: 12px; font-weight: 500; font-family: inherit; cursor: pointer; border: none;
}
.btn-remove {
  width: 24px; height: 24px; border-radius: 50%;
  background: var(--border-glass); color: var(--text-secondary);
  font-size: 12px; display: flex; align-items: center; justify-content: center;
  font-family: inherit; cursor: pointer; border: none;
}

/* 按钮 */
.action-buttons { display: flex; gap: 10px; margin-top: 20px; }
.btn-secondary {
  flex: 1; padding: 13px; border-radius: 13px;
  background: white; color: var(--text-primary);
  font-size: 14px; font-weight: 600;
  border: 1px solid var(--border-glass);
  font-family: inherit; cursor: pointer;
}
.btn-primary {
  flex: 1.4; padding: 13px; border-radius: 13px;
  background: var(--primary); color: white;
  font-size: 14px; font-weight: 600;
  font-family: inherit; cursor: pointer; border: none;
  box-shadow: 0 4px 12px rgba(0, 122, 255, 0.25);
}
.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }

/* 确认页 */
.confirm-header { text-align: center; margin-bottom: 20px; }
.confirm-title { font-size: 18px; font-weight: 700; color: var(--text-primary); margin-bottom: 6px; }
.confirm-subtitle { font-size: 14px; color: var(--text-secondary); }
.over-limit-hint {
  margin-top: 10px; font-size: 12.5px; font-weight: 600;
  color: #d70015; background: rgba(255, 59, 48, 0.07);
  border: 1px solid rgba(255, 59, 48, 0.2);
  border-radius: 10px; padding: 8px 12px;
}
.contacts-list { max-height: 420px; overflow-y: auto; }
.contact-item {
  display: flex; align-items: center; gap: 12px;
  padding: 12px 14px;
  background: var(--bg-card);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid var(--border-glass);
  border-radius: 12px;
  margin-bottom: 8px;
  transition: all 0.2s;
}
.contact-item:hover { box-shadow: 0 4px 14px rgba(0, 0, 0, 0.05); transform: translateY(-1px); }
.contact-item.invalid { border-color: var(--danger); background: rgba(255, 59, 48, 0.02); }
.contact-item.disabled { opacity: 0.55; }
.contact-group { margin-bottom: 18px; }
.group-header {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 12px; background: var(--bg-primary);
  border-radius: 10px; margin-bottom: 8px;
}
.group-thumb { width: 40px; height: 40px; object-fit: cover; border-radius: 6px; flex-shrink: 0; }
.group-title { flex: 1; min-width: 0; }
.group-name {
  font-size: 13px; font-weight: 600; color: var(--text-primary);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.group-count { font-size: 12px; color: var(--text-secondary); margin-top: 2px; }
.btn-group-action {
  padding: 4px 10px; border-radius: 6px;
  background: white; color: var(--text-secondary);
  font-size: 12px; font-weight: 500;
  border: 1px solid var(--border-glass);
  font-family: inherit; cursor: pointer;
}
.contact-check { flex-shrink: 0; width: 22px; height: 22px; display: flex; align-items: center; justify-content: center; }
.contact-check input { width: 18px; height: 18px; accent-color: var(--primary); }
.contact-info { flex: 1; min-width: 0; }
.contact-name { font-size: 14px; font-weight: 600; color: var(--text-primary); margin-bottom: 2px; }
.contact-date { font-size: 12px; color: var(--text-secondary); }
.contact-date.invalid { color: var(--danger); }
.dup-tag { margin-left: 4px; color: var(--text-secondary); font-weight: 500; }
.dup-badge {
  display: inline-block; margin-left: 6px; padding: 1px 6px;
  font-size: 11px; font-weight: 600;
  color: #FF9500; background: rgba(255, 149, 0, 0.12);
  border-radius: 4px; vertical-align: middle;
}
.contact-action { flex-shrink: 0; }
.btn-edit {
  padding: 4px 10px; border-radius: 6px;
  background: var(--bg-primary); color: var(--primary);
  font-size: 12px; font-weight: 500;
  font-family: inherit; cursor: pointer; border: none;
}

/* 结果页 */
.result-card {
  text-align: center; padding: 36px 20px;
  background: var(--bg-card);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-radius: 18px; margin-bottom: 20px;
}
.result-card.success { border: 1px solid rgba(52, 199, 89, 0.2); }
.result-card.error { border: 1px solid rgba(255, 59, 48, 0.2); }
.result-card.warn { border: 1px solid rgba(255, 149, 0, 0.25); background: rgba(255, 149, 0, 0.04); }
.result-icon { margin-bottom: 16px; }
.result-title { font-size: 18px; font-weight: 700; color: var(--text-primary); margin-bottom: 8px; }
.result-desc { font-size: 14px; color: var(--text-secondary); }
.result-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin: 14px 0 10px; }
.result-stat { background: var(--bg-primary); border-radius: 10px; padding: 12px 6px; text-align: center; }
.result-stat-value { font-size: 22px; font-weight: 800; line-height: 1; margin-bottom: 4px; }
.result-stat-label { font-size: 11px; font-weight: 600; color: var(--text-secondary); }
.result-stat.added .result-stat-value { color: var(--success); }
.result-stat.updated .result-stat-value { color: var(--primary); }
.result-stat.skipped .result-stat-value { color: #FF9500; }
.skip-detail {
  margin-top: 14px; padding-top: 12px;
  border-top: 1px dashed var(--border-glass);
  text-align: left;
}
.skip-detail-title { font-size: 12px; font-weight: 600; color: var(--text-secondary); margin-bottom: 8px; }
.skip-row { display: flex; justify-content: space-between; align-items: center; padding: 6px 0; font-size: 13px; }
.skip-name { color: var(--text-primary); font-weight: 500; }
.skip-reason {
  font-size: 11px; font-weight: 600; color: #FF9500;
  background: rgba(255, 149, 0, 0.1);
  padding: 2px 8px; border-radius: 4px;
}

/* 编辑弹窗 */
.modal-mask {
  position: fixed; inset: 0; background: rgba(0, 0, 0, 0.25);
  display: flex; align-items: flex-end; justify-content: center; z-index: 1000;
}
.modal-sheet {
  width: 100%; background: #FFFFFF;
  border-radius: 18px 18px 0 0;
  padding: 14px 14px 0;
  padding-bottom: calc(14px + env(safe-area-inset-bottom));
}
.modal-handle { width: 32px; height: 4px; border-radius: 2px; background: rgba(0, 0, 0, 0.12); margin: 0 auto 12px; }
.modal-title { font-size: 16px; font-weight: 600; margin-bottom: 16px; color: var(--text-primary); }
.form-group { margin-bottom: 14px; }
.form-label { font-size: 13px; font-weight: 600; color: var(--text-secondary); margin-bottom: 6px; display: block; }
.form-input {
  width: 100%; padding: 10px 12px;
  border: 1px solid var(--border-glass); border-radius: 10px;
  font-size: 14px; color: var(--text-primary);
  font-family: inherit; box-sizing: border-box;
}
.form-input:focus { border-color: var(--primary); outline: none; }
.modal-actions { display: flex; gap: 10px; margin-top: 16px; }
.modal-actions .btn-secondary,
.modal-actions .btn-primary { flex: 1; padding: 12px; }

@keyframes pop-in {
  from { opacity: 0; transform: scale(1.05); }
  to { opacity: 1; transform: scale(1); }
}

/* PC 适配 */
@media (min-width: 1024px) {
  .import-flow { padding: 0; }
  .step-indicator { padding: 0 80px; margin-bottom: 32px; }
  .step-number { width: 38px; height: 38px; font-size: 15px; }
  .upload-area { padding: 52px 24px; border-radius: 20px; }
  .upload-text { font-size: 18px; }
  .contacts-list {
    max-height: 540px;
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
  }
  .contact-group { grid-column: 1 / -1; margin-bottom: 0; }
  .contact-item { margin-bottom: 0; }
  .result-card { padding: 52px 24px; max-width: 560px; margin-left: auto; margin-right: auto; }

  /* 弹窗居中 */
  .modal-mask { align-items: center; background: rgba(0, 0, 0, 0.35); }
  .modal-sheet {
    width: 460px; max-width: calc(100vw - 48px);
    border-radius: 14px; padding: 24px;
    box-shadow: 0 24px 60px rgba(0, 0, 0, 0.25);
    animation: pop-in 0.2s ease;
  }
  .modal-handle { display: none; }
  .modal-title { font-size: 18px; text-align: center; }
  .toast { top: 80px; bottom: auto; }

  /* 步骤1：无队列时上传区居中限宽；有队列时双栏 */
  .step-content { max-width: none; }
  .step-content.step-1:not(:has(.image-queue)) .upload-area {
    max-width: 480px; margin-left: auto; margin-right: auto;
  }
  .step-content.step-1:has(.image-queue) {
    display: grid;
    grid-template-columns: minmax(0, 440px) minmax(0, 1fr);
    gap: 24px; align-items: start;
  }
  .step-content.step-1:has(.image-queue) .action-buttons { grid-column: 1 / -1; }
  .image-queue { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
  .image-queue .queue-header { grid-column: 1 / -1; }
}

/* 超宽屏：确认页联系人三列 */
@media (min-width: 1440px) {
  .contacts-list { grid-template-columns: repeat(3, 1fr); }
}
</style>
