<template>
  <!-- 客户编辑面板（全系统唯一编辑入口）：
       五区块自上而下即跟进动线：当前需求 → 跟进记录 → 到店登记 → 成交 → 重点开关 -->
  <div class="cdp-mask" v-if="show" @click="close">
    <div class="cdp-sheet" @click.stop>
      <div class="cdp-handle"></div>

      <!-- 头部：客户名 + 健康度 + 关闭 -->
      <div class="cdp-header">
        <div class="cdp-title">{{ customerName }}</div>
        <div class="cdp-health" v-if="customer.last_visit_at !== undefined">
          <span class="health-dot" :class="visit.class"></span>
          <span :class="visit.class">{{ visit.text }}</span>
        </div>
        <button class="cdp-close" @click="close">×</button>
      </div>

      <div class="cdp-loading" v-if="panelLoading"><span class="cdp-loading-dot"></span>加载客户数据中…</div>

      <div class="cdp-body">
        <div class="cdp-col">
          <!-- ① 当前需求（客户级字段，重点跟进时一键更新） -->
          <div class="cdp-section">
            <div class="sec-head">
              <svg class="sec-icon ic-danger" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>当前需求
            </div>

            <!-- 查看 -->
            <div class="need-card" v-if="!editingNeeds">
              <div class="need-text" v-if="currentNeeds">{{ currentNeeds }}</div>
              <div class="need-text empty" v-else>尚未记录客户需求</div>
              <div class="need-foot">
                <span class="need-hint">{{ currentNeeds ? '重点跟进时随时更新' : '标注重点前建议先写清需求' }}</span>
                <button class="need-btn" @click="openNeedsEdit">{{ currentNeeds ? '更新需求' : '补充需求' }}</button>
              </div>
            </div>

            <!-- 编辑 -->
            <div class="need-card editing" v-else>
              <textarea
                class="need-input"
                v-model="needsDraft"
                rows="3"
                placeholder="写清客户当前关注点，如：黑色SUV，预算40万，GLC/X3 对比中"
                maxlength="2000"
              ></textarea>
              <label class="need-followup-toggle">
                <input type="checkbox" v-model="needsAlsoFollowup" />
                同步记入跟进时间线
              </label>
              <div class="need-btns">
                <button class="btn-plain" @click="editingNeeds = false">取消</button>
                <button class="btn-primary" @click="submitNeeds" :disabled="loading">
                  {{ loading ? '保存中' : '保存需求' }}
                </button>
              </div>
            </div>
          </div>

          <!-- ② 跟进记录（时间线，追加不覆盖；输入框只做一件事：记录跟进，始终可提交） -->
          <div class="cdp-section" v-if="!panelLoading">
            <div class="sec-head">
              <svg class="sec-icon ic-blue" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>跟进记录
              <span class="sec-count">{{ followups.length }}</span>
            </div>
            <div class="fu-list" v-if="followups.length">
              <div class="fu-item" v-for="f in followups" :key="f.id">
                <div class="fu-time">{{ formatTime(f.created_at) }}</div>
                <div class="fu-content">{{ f.content }}</div>
              </div>
            </div>
            <div v-else class="sec-empty">暂无跟进记录</div>
            <div class="fu-input-wrap">
              <textarea
                class="fu-input"
                v-model="newFollowup"
                placeholder="记录本次跟进内容…"
                rows="2"
              ></textarea>
              <button class="btn-submit" @click="submitFollowup" :disabled="loading">
                {{ loading ? '提交中' : '提交' }}
              </button>
            </div>
          </div>

        </div>
        <div class="cdp-col">
          <!-- ③ 到店记录（登记未成交到店会自动标为重点） -->
          <div class="cdp-section" v-if="!panelLoading">
            <div class="sec-head">
              <svg class="sec-icon ic-orange" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>到店记录
              <span class="sec-count">{{ visits.length }}</span>
              <button class="btn-add" @click="openVisitForm(null)">+ 登记</button>
            </div>
            <div class="visit-list" v-if="visits.length">
              <div class="visit-item" v-for="v in visits" :key="v.id">
                <div class="visit-tag" :class="v.is_deal ? 'dealt' : 'not-dealt'">
                  {{ v.is_deal ? '✓ 已成交' : '未成交' }}
                </div>
                <div class="visit-body">
                  <div class="deal-meta">
                    <span v-if="v.visit_time"><svg class="ic meta-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> {{ v.visit_time }}</span>
                    <span class="visit-deal-sum" v-if="v.is_deal && dealSummary(v.deal_id)"><svg class="ic meta-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2"/><path d="M6 12h.01M18 12h.01"/></svg> {{ dealSummary(v.deal_id) }}</span>
                  </div>
                  <div class="visit-needs" v-if="v.needs">{{ v.needs }}</div>
                  <div class="visit-needs empty" v-else-if="!v.is_deal">（未填写需求）</div>
                  <div class="deal-remark" v-if="v.remark">{{ v.remark }}</div>
                </div>
                <div class="deal-ops">
                  <span @click="openVisitForm(v)">编辑</span>
                  <span class="danger" @click="confirmDeleteVisit(v)">删除</span>
                </div>
              </div>
            </div>
            <div v-else class="sec-empty">暂无到店记录，点击「+ 登记」记录到店时间与需求</div>
          </div>

          <!-- ④ 成交记录（车辆 / 两地牌；新增成交自动移出重点） -->
          <div class="cdp-section" v-if="!panelLoading">
            <div class="sec-head">
              <svg class="sec-icon ic-green" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2"/><path d="M6 12h.01M18 12h.01"/></svg>成交记录
              <span class="sec-count">{{ deals.length }}</span>
              <span class="sec-total" v-if="totalAmount">累计 ¥{{ totalAmount }}</span>
              <button class="btn-add" @click="openDealForm(null)">+ 添加</button>
            </div>
            <div class="deal-list" v-if="deals.length">
              <div class="deal-item" v-for="d in deals" :key="d.id">
                <div class="deal-tag" :class="d.deal_type">
              <svg class="ic" v-if="d.deal_type === 'vehicle'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9-1.8-.5-4.5-1.1-4.5-1.1s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.5 2.8C1.4 12.4 1 13.2 1 14v2c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/><path d="M9 17h6"/></svg>
              <svg class="ic" v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="20" height="12" rx="2"/><line x1="6" y1="10" x2="10" y2="10"/><line x1="6" y1="14" x2="9" y2="14"/><line x1="14" y1="14" x2="18" y2="14"/></svg>
              {{ d.deal_type === 'vehicle' ? '车辆' : '两地牌' }}
            </div>
                <div class="deal-body">
                  <template v-if="d.deal_type === 'vehicle'">
                    <div class="deal-main">{{ d.vehicle_desc || '车辆' }}</div>
                    <div class="deal-sub" v-if="d.vin">车架号 {{ d.vin }}</div>
                  </template>
                  <template v-else>
                    <div class="deal-main">{{ d.port || '-' }} · {{ d.plate_kind || '-' }}</div>
                    <div class="deal-sub" v-if="d.plate_number">车牌 {{ d.plate_number }}</div>
                  </template>
                  <div class="deal-meta">
                    <span v-if="d.deal_time"><svg class="ic meta-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> {{ d.deal_time }}</span>
                    <span class="deal-amount" v-if="d.amount !== null && d.amount !== undefined">¥{{ formatAmount(d.amount) }}</span>
                  </div>
                  <div class="deal-remark" v-if="d.remark">{{ d.remark }}</div>
                </div>
                <div class="deal-ops">
                  <span @click="openDealForm(d)">编辑</span>
                  <span class="danger" @click="confirmDeleteDeal(d)">删除</span>
                </div>
              </div>
            </div>
            <div v-else class="sec-empty">暂无成交记录，点击「+ 添加」记录车辆或两地牌成交</div>
          </div>
        </div>
      </div>

      <!-- ⑤ 重点开关 -->
      <div class="cdp-actions">
        <button v-if="customer.is_priority" class="btn-danger" @click="confirmRemovePriority">
          <svg class="btn-ic" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg> 取消重点
        </button>
        <button v-else class="btn-primary" :disabled="loading" @click="addPriority">
          {{ loading ? '处理中…' : '<svg class="btn-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg> 标注为重点' }}
        </button>
      </div>

      <!-- 成交表单（覆盖层）：车辆区与两地牌区同时显示、互不干扰 -->
      <div class="df-mask" v-if="showDealForm" @click="showDealForm = false">
        <div class="df-sheet" @click.stop>
          <div class="df-handle"></div>
          <div class="df-title">{{ customerName }}<span class="df-title-sub"> · {{ editingDeal ? '编辑成交' : '添加成交' }}</span></div>

          <!-- Tab 切换（仅新增模式；切换时各 Tab 数据各自保留，互不丢失） -->
          <div class="df-tabs" v-if="!editingDeal">
            <button type="button" class="df-tab" :class="{ active: activeTab === 'vehicle' }" @click="activeTab = 'vehicle'">
              <svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9-1.8-.5-4.5-1.1-4.5-1.1s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.5 2.8C1.4 12.4 1 13.2 1 14v2c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/><path d="M9 17h6"/></svg>车辆
            </button>
            <button type="button" class="df-tab" :class="{ active: activeTab === 'plate' }" @click="activeTab = 'plate'">
              <svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="20" height="12" rx="2"/><line x1="6" y1="10" x2="10" y2="10"/><line x1="6" y1="14" x2="9" y2="14"/><line x1="14" y1="14" x2="18" y2="14"/></svg>两地牌
            </button>
          </div>
          <div class="df-tab-hint" v-if="!editingDeal">两个 Tab 都填，会同时记录两条成交</div>

          <!-- 车辆字段 -->
          <div class="df-block" v-if="activeTab === 'vehicle'" :key="'vehicle'">
            <div class="df-field">
              <label>车架号</label>
              <input class="df-input" v-model.trim="formVehicle.vin" placeholder="VIN（选填）" maxlength="32" />
            </div>
            <div class="df-field">
              <label>车辆描述</label>
              <input class="df-input" v-model.trim="formVehicle.vehicle_desc" placeholder="如 21款霸道4000 白色" />
            </div>
            <div class="df-field">
              <label>金额</label>
              <input class="df-input" type="number" inputmode="decimal" v-model="formVehicle.amount" placeholder="车辆金额（选填）" />
            </div>
            <div class="df-field">
              <label>成交时间</label>
              <input class="df-input" type="date" v-model="formVehicle.deal_time" />
            </div>
            <div class="df-field df-field-wide">
              <label>备注</label>
              <input class="df-input" v-model.trim="formVehicle.remark" placeholder="选填" />
            </div>
          </div>

          <!-- 两地牌字段 -->
          <div class="df-block" v-else :key="'plate'">
            <div class="df-field">
              <label>口岸</label>
              <select class="df-input" v-model="formPlate.port">
                <option value="">选择口岸</option>
                <option v-for="p in PORTS" :key="p" :value="p">{{ p }}</option>
              </select>
            </div>
            <div class="df-field">
              <label>牌照</label>
              <div class="df-seg">
                <button type="button" :class="{ active: formPlate.plate_kind === '期牌' }" @click="formPlate.plate_kind = '期牌'">期牌</button>
                <button type="button" :class="{ active: formPlate.plate_kind === '现牌' }" @click="formPlate.plate_kind = '现牌'">现牌</button>
              </div>
            </div>
            <div class="df-field" v-if="formPlate.plate_kind === '现牌'">
              <label>车牌号</label>
              <input class="df-input" v-model.trim="formPlate.plate_number" placeholder="车牌号码" />
            </div>
            <div class="df-field">
              <label>金额</label>
              <input class="df-input" type="number" inputmode="decimal" v-model="formPlate.amount" placeholder="办牌金额（选填）" />
            </div>
            <div class="df-field">
              <label>成交时间</label>
              <input class="df-input" type="date" v-model="formPlate.deal_time" />
            </div>
            <div class="df-field">
              <label>备注</label>
              <input class="df-input" v-model.trim="formPlate.remark" placeholder="选填" />
            </div>
          </div>

          <div class="df-btns">
            <button class="btn-plain" @click="showDealForm = false">取消</button>
            <button class="btn-primary" :disabled="loading" @click="submitDeal">{{ loading ? '保存中…' : '保存' }}</button>
          </div>
        </div>
      </div>

      <!-- 到店登记表单（覆盖层）：仅录「未成交到店」，成交到店由成交记录自动生成 -->
      <div class="df-mask" v-if="showVisitForm" @click="showVisitForm = false">
        <div class="df-sheet" @click.stop>
          <div class="df-handle"></div>
          <div class="df-title">{{ customerName }}<span class="df-title-sub"> · {{ editingVisit ? '编辑到店' : '到店登记' }}</span></div>

          <div class="df-block">
            <div class="df-field">
              <label>到店时间</label>
              <input class="df-input" type="date" v-model="formVisit.visit_time" />
            </div>
            <div class="df-field df-field-wide">
              <label>需求{{ editingVisit && editingVisit.is_deal ? '（选填）' : '（必填）' }}</label>
              <textarea
                class="df-input"
                v-model.trim="formVisit.needs"
                rows="2"
                :placeholder="formVisit.needs || currentNeeds ? '默认带入当前需求，可修改' : '请写清楚客户需求'"
              ></textarea>
            </div>
            <div class="df-field df-field-wide">
              <label>备注</label>
              <input class="df-input" v-model.trim="formVisit.remark" placeholder="选填" />
            </div>
          </div>
          <div class="df-tab-hint" v-if="!editingVisit">登记到店后将自动标注为重点客户</div>
          <div class="df-tab-hint" v-if="editingVisit && editingVisit.is_deal">该到店由成交记录自动生成，需求/备注可补充；成交详情请在「成交记录」中编辑</div>

          <div class="df-btns">
            <button class="btn-plain" @click="showVisitForm = false">取消</button>
            <button class="btn-primary" :disabled="loading" @click="submitVisit">{{ loading ? '保存中…' : '保存' }}</button>
          </div>
        </div>
      </div>

      <!-- 确认弹窗（取消重点 / 删除） -->
      <ConfirmDialog
        :show="confirm.show"
        :title="confirm.title"
        :desc="confirm.desc"
        :danger="confirm.danger"
        cancel-text="再想想"
        :confirm-text="confirm.confirmText"
        @cancel="confirm.show = false"
        @confirm="confirm.action"
      />

      <div class="toast" v-if="toast.show">{{ toast.message }}</div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue'
import api from '../utils/api'
import { calcVisitStatus } from '../utils/constants'
import { useToast } from '../composables/useToast'
import ConfirmDialog from './ConfirmDialog.vue'

// 两地牌口岸（业务固定 4 个）
const PORTS = ['深圳湾', '莲塘', '沙头角', '港珠澳']

const props = defineProps({
  show: { type: Boolean, default: false },
  customer: { type: Object, default: () => ({}) },
})
const emit = defineEmits(['update:show', 'updated'])

const { toast, showToast } = useToast()

const followups = ref([])
const deals = ref([])
const visits = ref([])
const newFollowup = ref('')
const loading = ref(false)
const panelLoading = ref(false)
// 加载竞态保护：连续切换客户时丢弃过期响应
let loadSeq = 0

// ── 当前需求（客户级字段）────────────────────────────────
const currentNeeds = ref('')
const editingNeeds = ref(false)
const needsDraft = ref('')
const needsAlsoFollowup = ref(true)

// ── 成交表单：车辆区 / 两地牌区 各自独立，互不干扰 ──────────
const showDealForm = ref(false)
const editingDeal = ref(null)
const activeTab = ref('vehicle')   // 'vehicle' | 'plate'
const formVehicle = reactive({ vin: '', vehicle_desc: '', amount: '', deal_time: today(), remark: '' })
const formPlate = reactive({ port: '', plate_kind: '期牌', plate_number: '', amount: '', deal_time: today(), remark: '' })

// ── 到店登记表单：仅录「未成交到店」───────────────────────
const showVisitForm = ref(false)
const editingVisit = ref(null)
const formVisit = reactive({ visit_time: today(), needs: '', remark: '' })

const confirm = reactive({
  show: false, title: '', desc: '', danger: false, confirmText: '确认', action: () => {},
})

function today() {
  const d = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

const customerName = computed(() => {
  const c = props.customer || {}
  const lead = c.lead_date_short || (c.lead_date ? c.lead_date.slice(3).replace(/-/g, '') : '')
  return lead ? `${lead}/${c.customer_name}` : (c.customer_name || '')
})
const visit = computed(() => calcVisitStatus(props.customer?.last_visit_at))
const totalAmount = computed(() => {
  const sum = deals.value.reduce((s, d) => s + (Number(d.amount) || 0), 0)
  return sum > 0 ? sum.toLocaleString() : null
})

function close() {
  emit('update:show', false)
}
function formatTime(s) {
  if (!s) return ''
  return s.replace('T', ' ').slice(5, 16)
}
function formatAmount(n) {
  return Number(n).toLocaleString()
}

async function loadData() {
  const id = props.customer?.id
  if (!id) return
  const seq = ++loadSeq
  panelLoading.value = true
  try {
    const [f, d, v] = await Promise.all([
      api.get(`/customers/${id}/followups`),
      api.get(`/customers/${id}/deals`),
      api.get(`/customers/${id}/visits`),
    ])
    if (seq !== loadSeq) return // 已切换到其他客户，丢弃过期响应
    followups.value = f || []
    deals.value = d || []
    visits.value = v || []
  } catch (e) {
    if (seq === loadSeq) showToast(e.message || '加载失败')
  } finally {
    if (seq === loadSeq) panelLoading.value = false
  }
}

watch(
  () => [props.show, props.customer?.id],
  ([isShow]) => {
    if (isShow) {
      newFollowup.value = ''
      editingNeeds.value = false
      showDealForm.value = false
      showVisitForm.value = false
      currentNeeds.value = props.customer?.current_needs || ''
      // 先清空旧客户数据，避免加载期间显示上一位客户的记录
      followups.value = []
      deals.value = []
      visits.value = []
      loadData()
    }
  }
)

// ── ① 当前需求：更新 ────────────────────────────────────
function openNeedsEdit() {
  needsDraft.value = currentNeeds.value
  needsAlsoFollowup.value = true
  editingNeeds.value = true
}

async function submitNeeds() {
  const needs = needsDraft.value.trim()
  if (!needs) { showToast('请填写需求内容'); return }
  loading.value = true
  try {
    await api.put(`/customers/${props.customer.id}/needs`, {
      needs,
      followup: needsAlsoFollowup.value,
    })
    currentNeeds.value = needs
    editingNeeds.value = false
    // 同步父组件客户对象，卡片/搜索结果即时反映最新需求
    if (props.customer) props.customer.current_needs = needs
    await loadData()
    emit('updated')
    showToast('需求已更新')
  } catch (e) {
    showToast(e.message || '保存失败')
  } finally {
    loading.value = false
  }
}

// ── ② 跟进记录：提交（单一语义，始终可用）────────────────
async function submitFollowup() {
  const content = newFollowup.value.trim()
  if (!content) { showToast('请填写跟进内容'); return }
  loading.value = true
  try {
    await api.post(`/customers/${props.customer.id}/followups`, { content })
    newFollowup.value = ''
    await loadData()
    emit('updated')
    showToast('跟进已记录')
  } catch (e) {
    showToast(e.message || '保存失败')
  } finally {
    loading.value = false
  }
}

// ── ④ 成交记录 ──────────────────────────────────────────
function resetForm() {
  Object.assign(formVehicle, { vin: '', vehicle_desc: '', amount: '', deal_time: today(), remark: '' })
  Object.assign(formPlate, { port: '', plate_kind: '期牌', plate_number: '', amount: '', deal_time: today(), remark: '' })
}

function openDealForm(deal) {
  resetForm()
  if (deal) {
    editingDeal.value = deal
    activeTab.value = deal.deal_type      // 编辑：切到该条对应 Tab
    if (deal.deal_type === 'vehicle') {
      Object.assign(formVehicle, {
        vin: deal.vin || '', vehicle_desc: deal.vehicle_desc || '', amount: deal.amount ?? '',
        deal_time: deal.deal_time || today(), remark: deal.remark || '',
      })
    } else {
      Object.assign(formPlate, {
        port: deal.port || '',
        plate_kind: deal.plate_kind || '期牌',
        plate_number: deal.plate_number || '',
        amount: deal.amount ?? '',
        deal_time: deal.deal_time || today(), remark: deal.remark || '',
      })
    }
  } else {
    editingDeal.value = null
    activeTab.value = 'vehicle'           // 新增：默认车辆 Tab
  }
  showDealForm.value = true
}

async function submitDeal() {
  if (loading.value) return
  const cid = props.customer.id
  loading.value = true
  try {
    if (editingDeal.value) {
      // 编辑：单条，按原类型提交
      const d = editingDeal.value
      const payload = { deal_type: d.deal_type }
      if (d.deal_type === 'vehicle') {
        if (!formVehicle.vin.trim() && !formVehicle.vehicle_desc.trim()) return showToast('请填写车架号或车辆描述')
        Object.assign(payload, {
          vin: formVehicle.vin, vehicle_desc: formVehicle.vehicle_desc, amount: formVehicle.amount || null,
          deal_time: formVehicle.deal_time, remark: formVehicle.remark,
        })
      } else {
        if (!formPlate.port) return showToast('请选择口岸')
        Object.assign(payload, {
          port: formPlate.port, plate_kind: formPlate.plate_kind,
          plate_number: formPlate.plate_number, amount: formPlate.amount || null,
          deal_time: formPlate.deal_time, remark: formPlate.remark,
        })
      }
      await api.put(`/customers/${cid}/deals/${d.id}`, payload)
      showToast('成交已更新')
    } else {
      // 新增：车辆区/两地牌区按填写内容分别生成，可同时出 1~2 条
      const items = []
      if (formVehicle.vin.trim() || formVehicle.vehicle_desc.trim()) {
        items.push({
          deal_type: 'vehicle', vin: formVehicle.vin.trim(), vehicle_desc: formVehicle.vehicle_desc.trim(),
          amount: formVehicle.amount || null, deal_time: formVehicle.deal_time, remark: formVehicle.remark,
        })
      }
      if (formPlate.port) {
        items.push({
          deal_type: 'plate', port: formPlate.port, plate_kind: formPlate.plate_kind,
          plate_number: formPlate.plate_number.trim(), amount: formPlate.amount || null,
          deal_time: formPlate.deal_time, remark: formPlate.remark,
        })
      }
      if (!items.length) return showToast('请至少填写一项成交内容')
      for (const it of items) await api.post(`/customers/${cid}/deals`, it)
      showToast(`已记录 ${items.length} 条成交，已自动移出重点列表`)
    }
    showDealForm.value = false
    // 新增成交后端会自动移出重点，同步面板开关状态
    if (!editingDeal.value && props.customer) props.customer.is_priority = false
    await loadData()
    emit('updated')
  } catch (e) {
    showToast(e.message || '保存失败')
  } finally {
    loading.value = false
  }
}

function confirmDeleteDeal(deal) {
  Object.assign(confirm, {
    show: true,
    title: '删除成交',
    desc: '确认删除这条成交记录？此操作不可撤销。',
    danger: true,
    confirmText: '删除',
    action: async () => {
      confirm.show = false
      try {
        await api.delete(`/customers/${props.customer.id}/deals/${deal.id}`)
        await loadData()
        emit('updated')
        showToast('已删除')
      } catch (e) {
        showToast(e.message || '删除失败')
      }
    },
  })
}

// ── ③ 到店记录（手工录入仅「未成交」；成交到店由成交自动生成）──
function resetVisitForm() {
  Object.assign(formVisit, {
    visit_time: today(),
    // 需求默认带入当前需求，减少重复输入
    needs: currentNeeds.value || '',
    remark: '',
  })
}

// 到店记录若关联了成交，展示成交摘要
function dealSummary(dealId) {
  if (!dealId) return ''
  const d = deals.value.find((x) => x.id === dealId)
  if (!d) return ''
  if (d.deal_type === 'vehicle') return d.vehicle_desc || '车辆'
  return `${d.port || ''} ${d.plate_kind || ''}`.trim() || '两地牌'
}

function openVisitForm(visit) {
  resetVisitForm()
  if (visit) {
    editingVisit.value = visit
    Object.assign(formVisit, {
      visit_time: visit.visit_time || today(),
      needs: visit.needs || '',
      remark: visit.remark || '',
    })
  } else {
    editingVisit.value = null
  }
  showVisitForm.value = true
}

async function submitVisit() {
  if (loading.value) return
  const cid = props.customer.id
  const needs = formVisit.needs.trim()
  // 新增（未成交）需求必填；编辑已成交到店时需求可不填
  const editingDealt = editingVisit.value && editingVisit.value.is_deal
  if (!editingDealt && !needs) return showToast('请填写需求')
  loading.value = true
  try {
    if (editingVisit.value) {
      await api.put(`/customers/${cid}/visits/${editingVisit.value.id}`, {
        visit_time: formVisit.visit_time,
        needs,
        remark: formVisit.remark,
      })
      showToast('到店记录已更新')
    } else {
      await api.post(`/customers/${cid}/visits`, {
        visit_time: formVisit.visit_time,
        needs,
        remark: formVisit.remark,
      })
      showToast('到店已记录，已自动标为重点')
    }
    showVisitForm.value = false
    // 新增到店后端会自动标为重点，同步面板开关状态
    if (!editingVisit.value && props.customer) props.customer.is_priority = true
    await loadData()
    emit('updated')
  } catch (e) {
    showToast(e.message || '保存失败')
  } finally {
    loading.value = false
  }
}

function confirmDeleteVisit(visit) {
  Object.assign(confirm, {
    show: true,
    title: '删除到店记录',
    desc: '确认删除这条到店记录？（不会删除关联的成交记录）',
    danger: true,
    confirmText: '删除',
    action: async () => {
      confirm.show = false
      try {
        await api.delete(`/customers/${props.customer.id}/visits/${visit.id}`)
        await loadData()
        emit('updated')
        showToast('已删除')
      } catch (e) {
        showToast(e.message || '删除失败')
      }
    },
  })
}

// ── ⑤ 重点开关 ──────────────────────────────────────────
function confirmRemovePriority() {
  Object.assign(confirm, {
    show: true,
    title: '取消重点',
    desc: `确认将「${props.customer?.customer_name || ''}」移出重点客户？`,
    danger: true,
    confirmText: '确认移除',
    action: async () => {
      confirm.show = false
      try {
        await api.put(`/customers/${props.customer.id}/priority`, { is_priority: false })
        showToast('已移出重点')
        emit('update:show', false)
        emit('updated')
      } catch (e) {
        showToast(e.message || '操作失败')
      }
    },
  })
}

async function addPriority() {
  if (loading.value) return
  loading.value = true
  try {
    // 已有当前需求时随重点一起提交作为备注（后端自动追加跟进留痕）
    const remark = currentNeeds.value || undefined
    await api.put(`/customers/${props.customer.id}/priority`, { is_priority: true, remark })
    showToast('已标注为重点')
    emit('update:show', false)
    emit('updated')
  } catch (e) {
    showToast(e.message || '操作失败')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.cdp-mask {
  position: fixed; inset: 0; background: rgba(0, 0, 0, 0.3);
  display: flex; align-items: flex-end; justify-content: center; z-index: var(--z-modal);
}
.cdp-sheet {
  width: 100%; background: var(--surface); border-radius: 20px 20px 0 0; padding: 20px;
  padding-bottom: calc(20px + env(safe-area-inset-bottom));
  max-height: 96vh; overflow-y: auto; position: relative;
}
.cdp-handle { width: 36px; height: 4px; border-radius: 2px; background: rgba(0,0,0,0.12); margin: 0 auto 14px; }

.cdp-header { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; }
.cdp-loading { display: flex; align-items: center; justify-content: center; gap: 8px; padding: 22px 0 8px; font-size: 13px; color: var(--text-tertiary); }
.cdp-loading-dot { width: 16px; height: 16px; border: 2px solid var(--primary-light); border-top-color: var(--primary); border-radius: 50%; animation: cdp-spin 0.8s linear infinite; }
@keyframes cdp-spin { to { transform: rotate(360deg); } }
.cdp-title { font-size: 17px; font-weight: 700; color: var(--text-primary); flex: 1; min-width: 0; }
.cdp-health { display: flex; align-items: center; gap: 5px; font-size: 12px; font-weight: 600; flex-shrink: 0; }
.health-dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; }
.cdp-health .success, .health-dot.success { color: #34C759; background: #34C759; }
.cdp-health .warning, .health-dot.warning { color: var(--warning); background: var(--warning); }
.cdp-health .danger, .health-dot.danger { color: var(--danger); background: var(--danger); }
.cdp-health .success, .cdp-health .warning, .cdp-health .danger { background: none; }
.cdp-close { width: 30px; height: 30px; border: none; background: var(--bg-primary); border-radius: 50%; font-size: 20px; color: var(--text-secondary); cursor: pointer; line-height: 1; flex-shrink: 0; }

.cdp-section { border-top: 1px solid var(--border-glass); padding: 14px 0; }
.sec-head { display: flex; align-items: center; gap: 6px; font-size: 15px; font-weight: 600; color: var(--text-primary); margin-bottom: 12px; }
.sec-icon { width: 15px; height: 15px; flex-shrink: 0; }
.ic-danger { color: var(--danger); }
.ic-blue { color: var(--primary); }
.ic-orange { color: var(--warning); }
.ic-green { color: var(--success); }
.sec-count { font-size: 13px; font-weight: 500; color: var(--text-secondary); }
.sec-total { margin-left: auto; font-size: 13px; font-weight: 600; color: #EA580C; }
.btn-add { margin-left: 8px; padding: 5px 12px; border-radius: 16px; background: var(--primary); color: #fff; font-size: 13px; font-weight: 600; border: none; cursor: pointer; white-space: nowrap; }
.sec-empty { font-size: 14px; color: var(--text-tertiary); padding: 8px 0; line-height: 1.6; }

/* ── ① 当前需求 ── */
.need-card {
  background: linear-gradient(135deg, rgba(0,122,255,0.06), rgba(90,200,250,0.09));
  border: 1px solid rgba(0, 122, 255, 0.16);
  border-radius: 14px; padding: 13px 14px;
}
.need-card.editing { background: var(--surface); }
/* 夜间：需求卡渐变提亮，保持可感知的品牌色 */
.dark .need-card { background: linear-gradient(135deg, rgba(10, 132, 255, 0.18), rgba(100, 210, 255, 0.1)); border-color: rgba(10, 132, 255, 0.34); }
.need-text { font-size: 14px; line-height: 1.65; color: var(--text-primary); word-break: break-all; }
.need-text.empty { color: var(--text-tertiary); }
.need-foot { display: flex; align-items: center; justify-content: space-between; margin-top: 10px; }
.need-hint { font-size: 11px; color: var(--text-tertiary); }
.need-btn {
  font-size: 12px; font-weight: 700; color: var(--primary);
  background: var(--surface); border-radius: 99px; padding: 6px 15px;
  box-shadow: 0 2px 6px rgba(0, 122, 255, 0.15); cursor: pointer; border: none;
  font-family: inherit;
}
.need-input {
  width: 100%; padding: 11px 13px; border: 1.5px solid rgba(0,122,255,0.4);
  border-radius: 12px; font-size: 14px; color: var(--text-primary);
  resize: none; font-family: inherit; box-sizing: border-box;
  box-shadow: 0 0 0 3px rgba(0, 122, 255, 0.08);
}
.need-input:focus { outline: none; }
.need-followup-toggle {
  display: flex; align-items: center; gap: 7px;
  font-size: 12px; color: var(--text-secondary); margin-top: 9px; cursor: pointer;
}
.need-followup-toggle input { accent-color: var(--primary); width: 15px; height: 15px; }
.need-btns { display: flex; gap: 9px; margin-top: 11px; }
.need-btns button { flex: 1; padding: 10px; border-radius: 11px; font-size: 13.5px; font-weight: 600; cursor: pointer; font-family: inherit; border: none; }

/* ── ② 跟进时间线 ── */
.fu-list { display: flex; flex-direction: column; gap: 10px; margin-bottom: 12px; }
.fu-item { background: var(--bg-primary); border-radius: 12px; padding: 10px 12px; }
.fu-time { font-size: 12px; font-weight: 600; color: var(--text-tertiary); margin-bottom: 3px; }
.fu-content { font-size: 14px; color: var(--text-primary); line-height: 1.5; word-break: break-all; }
.fu-input-wrap { display: flex; gap: 8px; align-items: flex-end; }
.fu-input { flex: 1; padding: 11px; border: 1px solid var(--border-glass); border-radius: 12px; font-size: 14px; color: var(--text-primary); resize: none; font-family: inherit; }
.fu-input:focus { border-color: var(--primary); outline: none; }
.btn-submit { padding: 11px 18px; border-radius: 12px; background: var(--primary); color: #fff; font-size: 14px; font-weight: 600; border: none; cursor: pointer; white-space: nowrap; font-family: inherit; }
.btn-submit:disabled, .need-btns button:disabled { opacity: 0.5; }

/* ── ③④ 记录列表 ── */
.visit-list, .deal-list { display: flex; flex-direction: column; gap: 10px; }
.visit-item, .deal-item { display: flex; gap: 10px; background: var(--bg-primary); border-radius: 12px; padding: 11px; }
.visit-tag, .deal-tag { flex-shrink: 0; align-self: flex-start; display: inline-flex; align-items: center; gap: 4px; font-size: 12px; font-weight: 700; padding: 4px 9px; border-radius: 7px; white-space: nowrap; }
.deal-tag .ic { width: 12px; height: 12px; }
.visit-tag.dealt { background: var(--green-light); color: var(--success); }
.visit-tag.not-dealt { background: var(--orange-light); color: var(--warning); }
.deal-tag.vehicle { background: var(--blue-light); color: var(--primary); }
.deal-tag.plate { background: var(--purple-light); color: var(--purple); }
.visit-body, .deal-body { flex: 1; min-width: 0; }
.deal-main { font-size: 15px; font-weight: 600; color: var(--text-primary); }
.deal-sub { font-size: 13px; color: var(--text-secondary); margin-top: 2px; word-break: break-all; }
.deal-meta { display: flex; gap: 10px; margin-top: 4px; font-size: 12px; color: var(--text-tertiary); align-items: center; }
.deal-meta .meta-ic { width: 12px; height: 12px; }
.deal-meta span { display: inline-flex; align-items: center; gap: 3px; }
.deal-amount { color: #EA580C; font-weight: 700; }
.deal-remark { font-size: 13px; color: var(--text-secondary); margin-top: 3px; }
.visit-needs { font-size: 14px; color: var(--text-primary); line-height: 1.5; word-break: break-all; margin-top: 2px; }
.visit-needs.empty { color: var(--text-tertiary); font-size: 13px; }
.visit-deal-sum { color: #EA580C; font-weight: 700; }
.deal-ops { display: flex; flex-direction: column; gap: 10px; flex-shrink: 0; font-size: 13px; font-weight: 600; color: var(--text-secondary); }
.deal-ops span { cursor: pointer; }
.deal-ops span:active { opacity: 0.5; }
.deal-ops .danger { color: var(--danger); }

/* ── ⑤ 底部操作 ── */
.cdp-actions { padding-top: 14px; }
.cdp-actions button { width: 100%; display: inline-flex; align-items: center; justify-content: center; gap: 6px; padding: 14px; border-radius: 14px; font-size: 15px; font-weight: 600; cursor: pointer; font-family: inherit; }
.btn-ic { width: 15px; height: 15px; }
.cdp-actions button:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-danger { background: var(--surface); color: var(--danger); border: 1px solid rgba(255,59,48,0.3); }



/* ── 表单覆盖层 ── */
.df-mask {
  position: fixed; inset: 0; background: rgba(0, 0, 0, 0.4);
  display: flex; align-items: flex-end; justify-content: center; z-index: var(--z-overlay);
}
.df-sheet {
  width: 100%; background: var(--surface); border-radius: 20px 20px 0 0;
  padding: 20px 20px calc(20px + env(safe-area-inset-bottom));
  max-height: 96vh; overflow-y: auto;
}
.df-handle { width: 36px; height: 4px; border-radius: 2px; background: rgba(0,0,0,0.12); margin: 0 auto 14px; }
.df-title { font-size: 19px; font-weight: 700; color: var(--text-primary); margin-bottom: 12px; }
.df-title-sub { font-size: 15px; font-weight: 500; color: var(--text-secondary); }

.df-tabs { display: flex; gap: 4px; background: var(--bg-primary); border-radius: 13px; padding: 4px; margin-bottom: 8px; }
.df-tab { flex: 1; padding: 12px; border: none; background: transparent; border-radius: 10px; font-size: 15px; font-weight: 600; color: var(--text-secondary); cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 5px; font-family: inherit; }
.df-tab .ic { width: 16px; height: 16px; }
.df-tab.active { background: var(--surface); color: var(--primary); box-shadow: 0 1px 4px rgba(0,0,0,0.1); }
.df-tab-hint { font-size: 12px; color: var(--text-tertiary); margin-bottom: 14px; }

.df-block { background: var(--bg-primary); border-radius: 14px; padding: 14px; margin-bottom: 12px; }
.df-field { display: flex; flex-direction: column; gap: 5px; margin-bottom: 10px; }
.df-field:last-child { margin-bottom: 0; }
/* PC 端 df-block 为双列网格，带此类的字段占满整行（长文本/备注类） */
.df-field-wide { grid-column: 1 / -1; }
.df-field > label { font-size: 12px; font-weight: 600; color: var(--text-secondary); }
.df-input {
  width: 100%; padding: 13px 14px; border: 1px solid var(--border-glass); border-radius: 12px;
  font-size: 16px; color: var(--text-primary); font-family: inherit; background: var(--surface); box-sizing: border-box;
}
.df-input:focus { border-color: var(--primary); outline: none; }

.df-seg { display: flex; gap: 8px; }
.df-seg button {
  flex: 1; padding: 11px; border-radius: 11px; background: var(--surface); color: var(--text-secondary);
  font-size: 14px; font-weight: 600; border: 1px solid var(--border-glass); cursor: pointer; font-family: inherit;
}
.df-seg button.active { background: var(--orange-light); color: var(--primary); border-color: var(--primary); }

.df-btns { display: flex; gap: 10px; margin-top: 6px; }
.df-btns button { flex: 1; padding: 14px; border-radius: 14px; font-size: 15px; font-weight: 600; cursor: pointer; font-family: inherit; }


/* PC：居中自适应大弹窗 —— 宽度 min(1160px, 94vw)，屏幕越小相对越宽；
   内容分双列（需求+跟进 | 到店+成交），头部/底部固定，仅中间内容区滚动 */
@media (min-width: 1024px) {
  .cdp-mask { align-items: center; justify-content: center; background: rgba(15, 23, 42, 0.45); }
  .cdp-sheet {
    width: min(1160px, 94vw);
    max-height: min(880px, 92vh);
    height: auto;
    border-radius: 20px;
    padding: 0;
    display: flex;
    flex-direction: column;
    box-shadow: 0 24px 70px rgba(0, 0, 0, 0.28);
  }
  .cdp-handle { display: none; }

  .cdp-header { padding: 20px 28px 12px; margin-bottom: 0; }
  .cdp-title { font-size: 19px; }
  .cdp-loading { padding: 16px 28px 6px; }

  .cdp-body {
    flex: 1;
    min-height: 0;
    display: grid;
    grid-template-columns: 1fr 1fr;
    column-gap: 30px;
    padding: 0 28px;
    overflow-y: auto;
  }
  .cdp-col { min-width: 0; }
  .cdp-col .cdp-section { border-top: none; border-bottom: 1px solid var(--border-glass); padding: 6px 0 16px; }
  .cdp-col .cdp-section:last-child { border-bottom: none; }

  .cdp-actions {
    flex-shrink: 0;
    padding: 14px 28px calc(16px + env(safe-area-inset-bottom));
    border-top: 1px solid var(--border-glass);
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
  }
  .cdp-actions button { width: auto; min-width: 260px; padding: 12px 30px; }

  .btn-add:hover { filter: brightness(1.08); }
  .btn-submit:hover { filter: brightness(1.06); }
  .need-btn:hover { filter: brightness(0.97); }
  .deal-ops span:hover { color: var(--primary); }
  .deal-ops span.danger:hover { color: var(--danger); }
  .btn-plain:hover, .btn-danger:hover { background: #F7F7FA; }

  /* 内嵌表单：居中自适应，字段双列排布降低表单高度 */
  .df-mask { align-items: center; }
  .df-sheet {
    width: min(720px, 94vw);
    border-radius: 18px;
    padding: 26px 28px;
    max-height: calc(100vh - 72px);
    box-shadow: 0 24px 60px rgba(0, 0, 0, 0.25);
  }
  .df-handle { display: none; }
  .df-block { display: grid; grid-template-columns: 1fr 1fr; gap: 12px 14px; padding: 18px; }
  .df-field { margin-bottom: 0; }
  .df-btns { margin-top: 2px; }
}
</style>
