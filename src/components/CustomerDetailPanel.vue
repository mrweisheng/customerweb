<template>
  <!-- 客户编辑面板：销售只管"本次做了什么"（动作式录入），
       需求快照 / 跟进时间线 / 到店与成交记录由系统与 AI 自动归位 -->
  <div class="cdp-mask" v-if="show" @click="close" @touchmove.self.prevent @wheel.self.prevent>
    <div class="cdp-sheet" ref="sheetRef" @click.stop @touchmove="onSheetTouchMove">
      <div class="cdp-handle"></div>

      <!-- 头部：头像 + 客户名/健康度 + 重点开关 + 关闭 -->
      <div class="cdp-header">
        <div class="cdp-avatar" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
        </div>
        <div class="cdp-titlewrap">
          <div class="cdp-title">{{ customerName }}</div>
          <div class="cdp-health" v-if="customer.last_visit_at !== undefined">
            <span class="health-dot" :class="visit.class"></span>
            <span :class="visit.class">{{ visit.text }}</span>
          </div>
        </div>
        <button
          v-if="!readonly"
          class="cdp-star-pill"
          :class="{ on: customer.is_priority }"
          @click="onStarTap"
          :title="customer.is_priority ? '取消重点' : '标记重点'"
        >{{ customer.is_priority ? '★ 重点' : '☆ 重点' }}</button>
        <button class="cdp-close" @click="close">×</button>
      </div>

      <div class="cdp-loading" v-if="panelLoading"><span class="cdp-loading-dot"></span>加载客户数据中…</div>

      <div class="cdp-body" v-if="!panelLoading">
        <!-- 当前需求（快照）：只读展示，来源信息自动维护，可手动变更 -->
        <div class="need-summary">
          <div class="ns-head">
            <svg class="sec-icon ic-danger" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>
            <span>当前需求</span>
            <button v-if="!readonly && customer.is_priority" class="ns-edit" @click="toggleAction('needs')">变更</button>
          </div>
          <div class="ns-text" :class="{ empty: !currentNeeds }">{{ currentNeeds || '暂无需求记录' }}</div>
          <div class="ns-hint" v-if="!readonly">登记到店 / 提交跟进时自动更新，AI 会在需求变化时提示</div>
        </div>

        <!-- AI 后台分析进行中：完成后自动回填当前需求 -->
        <div class="ai-pending" v-if="aiAnalyzing">
          <span class="ai-pending-dot"></span>AI 正在分析本次登记，需求如有变化会自动更新…
        </div>

        <!-- 客户概要：重点状态 / 最近到店 / 累计成交，一眼掌握 -->
        <div class="stat-strip">
          <div class="stat">
            <div class="k">重点状态</div>
            <div class="v" :class="customer.is_priority ? 'org' : 'mut'">{{ customer.is_priority ? '★ 重点客户' : '未标重点' }}</div>
          </div>
          <div class="stat">
            <div class="k">最近到店</div>
            <div class="v" :class="visitStat.cls">{{ visitStat.text }}</div>
          </div>
          <div class="stat">
            <div class="k">累计成交</div>
            <div class="v" :class="totalAmount ? 'amt' : 'mut'">{{ totalAmount ? `¥${totalAmount}` : '尚未成交' }}</div>
          </div>
        </div>

        <!-- 主操作：未重点=到店/成交/标重点；已重点=到店/跟进/成交。点击就地展开表单，不再弹层 -->
        <template v-if="!readonly">
          <div class="zone-label">本次做了什么</div>
          <div class="act-row">
            <button class="act-chip" :class="{ active: actionType === 'visit' }" @click="toggleAction('visit')">
              <span class="act-main"><span class="act-ic">📍</span><span class="act-t">登记到店</span></span>
              <span class="act-sub">记录本次到店 · 自动标重点</span>
            </button>
            <button v-if="customer.is_priority" class="act-chip" :class="{ active: actionType === 'followup' }" @click="toggleAction('followup')">
              <span class="act-main"><span class="act-ic">💬</span><span class="act-t">更新跟进</span></span>
              <span class="act-sub">电话 / 微信沟通内容</span>
            </button>
            <button class="act-chip deal" :class="{ active: showDealForm }" @click="toggleDeal()">
              <span class="act-main"><span class="act-ic">💰</span><span class="act-t">成交登记</span></span>
              <span class="act-sub">车辆 / 两地牌 · 双填双记</span>
            </button>
            <button v-if="customer.is_priority" class="act-chip plain" @click="confirmRemovePriority">
              <span class="act-main"><span class="act-ic">☆</span><span class="act-t">取消重点</span></span>
              <span class="act-sub">移出重点客户列表</span>
            </button>
            <button v-if="!customer.is_priority" class="act-chip star" :class="{ active: actionType === 'priority' }" @click="toggleAction('priority')">
              <span class="act-main"><span class="act-ic">⭐</span><span class="act-t">标记重点</span></span>
              <span class="act-sub">可附一句当前需求</span>
            </button>
          </div>

          <!-- 内联操作区：在面板内就地展开，不弹二级弹层 -->
          <div class="inline-form" v-if="actionType && actionType !== 'deal'" ref="inlineFormRef">
            <div class="if-title">{{ actionType === 'visit' && editingVisit ? '编辑到店' : (formTitles[actionType] || '') }}
              <button class="if-close" @click="closeAction" aria-label="收起">✕</button>
            </div>

            <!-- 到店（登记/编辑） -->
            <template v-if="actionType === 'visit'">
              <div class="df-field">
                <label>到店时间</label>
                <input class="df-input" type="date" v-model="formVisit.visit_time" />
              </div>
              <div class="df-field">
                <label>本次到店情况{{ editingVisit && editingVisit.is_deal ? '（选填）' : '（必填）' }}</label>
                <textarea
                  class="df-input"
                  v-model.trim="formVisit.needs"
                  rows="3"
                  placeholder="客户说了什么、看了哪些车、本次沟通过程等，AI 会从中提取需求"
                ></textarea>
              </div>
              <div class="df-tab-hint" v-if="!editingVisit">保存后自动标为重点；AI 会从到店情况中提取需求快照</div>
              <div class="df-tab-hint" v-else-if="editingVisit.is_deal">该到店由成交记录自动生成，成交详情请在「成交记录」中编辑</div>
            </template>

            <!-- 跟进 -->
            <template v-else-if="actionType === 'followup'">
              <div class="df-field">
                <label>本次沟通内容</label>
                <textarea class="df-input" v-model.trim="followupDraft" rows="3" placeholder="做了什么 / 客户说了什么，如：电话聊了，预算从40万降到30万，想看X3"></textarea>
              </div>
              <div class="df-tab-hint">保存后 AI 在后台分析本次跟进，需求有变化会自动更新并提示</div>
            </template>

            <!-- 需求变更 -->
            <template v-else-if="actionType === 'needs'">
              <div class="df-field">
                <label>当前需求</label>
                <textarea class="df-input" v-model.trim="needsDraft" rows="3" placeholder="客户当前关注点，如：黑色SUV，预算40万，GLC/X3 对比中" maxlength="2000"></textarea>
              </div>
            </template>

            <!-- 标记重点 -->
            <template v-else-if="actionType === 'priority'">
              <div class="df-field">
                <label>情况说明{{ currentNeeds ? '（选填，已有需求）' : '（必填）' }}</label>
                <textarea class="df-input" v-model.trim="priorityDraft" rows="3" :placeholder="currentNeeds ? '可补充本次沟通情况，AI 会判断需求是否需要更新' : '如：客户主要咨询两地牌，对深圳湾有意向；AI 会从中提取需求'" maxlength="2000"></textarea>
              </div>
              <div class="df-tab-hint">填写的内容会作为一条动态记录，AI 会从中提取或更新需求</div>
            </template>

            <div class="df-btns">
              <button class="btn-plain" @click="closeAction">取消</button>
              <button
                class="btn-primary"
                :disabled="loading"
                @click="actionType === 'visit' ? submitVisit() : actionType === 'followup' ? submitFollowupAction() : actionType === 'needs' ? submitNeedsAction() : submitPriorityAction()"
              >{{ loading ? '保存中…' : '保存' }}</button>
            </div>
          </div>

          <!-- 成交表单：与到店/跟进共用同一表单区，结构化字段，不交给 AI -->
          <div class="inline-form" v-if="showDealForm" ref="dealFormRef">
            <div class="if-title">{{ editingDeal ? '编辑成交' : '添加成交' }}
              <button class="if-close" @click="showDealForm = false" aria-label="收起">✕</button>
            </div>
            <div class="df-tabs" v-if="!editingDeal">
              <button type="button" class="df-tab" :class="{ active: activeTab === 'vehicle' }" @click="activeTab = 'vehicle'">
                <svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9-1.8-.5-4.5-1.1-4.5-1.1s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.5 2.8C1.4 12.4 1 13.2 1 14v2c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/><path d="M9 17h6"/></svg>车辆
              </button>
              <button type="button" class="df-tab" :class="{ active: activeTab === 'plate' }" @click="activeTab = 'plate'">
                <svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="20" height="12" rx="2"/><line x1="6" y1="10" x2="10" y2="10"/><line x1="6" y1="14" x2="9" y2="14"/><line x1="14" y1="14" x2="18" y2="14"/></svg>两地牌
              </button>
            </div>
            <div class="df-tab-hint" v-if="!editingDeal">两个 Tab 都填，会同时记录两条成交</div>

            <div class="df-field" v-if="activeTab === 'vehicle'" :key="'vehicle'">
              <label>车架号</label>
              <input class="df-input" v-model.trim="formVehicle.vin" placeholder="VIN（选填，与车辆描述至少填一项）" maxlength="32" />
            </div>
            <div class="df-field" v-if="activeTab === 'vehicle'">
              <label>车辆描述</label>
              <input class="df-input" v-model.trim="formVehicle.vehicle_desc" placeholder="如 21款霸道4000 白色" />
            </div>
            <div class="df-field" v-if="activeTab === 'vehicle'">
              <label>金额</label>
              <input class="df-input" type="number" inputmode="decimal" v-model="formVehicle.amount" placeholder="车辆金额（选填）" />
            </div>
            <div class="df-field" v-if="activeTab === 'vehicle'">
              <label>成交时间</label>
              <input class="df-input" type="date" v-model="formVehicle.deal_time" />
            </div>

            <template v-if="activeTab === 'plate'">
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
            </template>

            <div class="df-btns">
              <button class="btn-plain" @click="showDealForm = false">取消</button>
              <button class="btn-primary" :disabled="loading" @click="submitDeal">{{ loading ? '保存中…' : '保存' }}</button>
            </div>
          </div>
        </template>

        <!-- 记录 Tab：动态 / 成交记录共用同一区域，互不挤占 -->
        <div class="record-tabs">
          <div class="rt-bar">
            <button class="rt-tab" :class="{ on: contentTab === 'timeline' }" @click="contentTab = 'timeline'">
              动态 <span class="rt-cnt">{{ timeline.length }}</span>
            </button>
            <button class="rt-tab" :class="{ on: contentTab === 'deals' }" @click="contentTab = 'deals'">
              成交记录 <span class="rt-cnt">{{ deals.length }}</span>
            </button>
            <span class="rt-total" v-if="contentTab === 'deals' && totalAmount">累计 ¥{{ totalAmount }}</span>
          </div>

          <!-- 动态时间线：跟进 / 邀约 / 到店 / 成交到店 / 需求变更 统一倒序 -->
          <div class="rt-body" v-show="contentTab === 'timeline'">
            <div class="tl" v-if="timeline.length">
              <div class="tl-item" v-for="e in timeline" :key="e.key">
                <span class="tl-tag" :class="e.tagClass">{{ e.tagLabel }}</span>
                <div class="tl-body">
                  <div class="tl-time">{{ e.time }}</div>
                  <template v-if="e.kind === 'visit'">
                    <div class="tl-content" v-if="e.visit.needs">{{ e.visit.needs }}</div>
                    <div class="tl-content empty" v-else-if="!e.visit.is_deal">（未填写需求）</div>
                    <div class="tl-meta">
                      <span v-if="e.visit.is_deal && dealSummary(e.visit.deal_id)">成交：{{ dealSummary(e.visit.deal_id) }}</span>
                      <span v-if="e.visit.remark">备注：{{ e.visit.remark }}</span>
                    </div>
                    <div class="tl-ops" v-if="!e.visit.is_deal && !readonly">
                      <span @click="openVisitForm(e.visit)">编辑</span>
                      <span class="danger" @click="confirmDeleteVisit(e.visit)">删除</span>
                    </div>
                  </template>
                  <template v-else>
                    <div class="tl-content">{{ e.content }}</div>
                  </template>
                </div>
              </div>
            </div>
            <div v-else class="sec-empty">{{ customer.is_priority ? '还没有记录，点上方「登记到店」或「更新跟进」开始' : '还没有记录，点上方「登记到店」开始，或先标记为重点' }}</div>
          </div>

          <div class="rt-body" v-show="contentTab === 'deals'">
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
                <div class="deal-ops" v-if="!readonly">
                  <span @click="openDealForm(d)">编辑</span>
                  <span class="danger" @click="confirmDeleteDeal(d)">删除</span>
                </div>
              </div>
            </div>
            <div v-else class="sec-empty">{{ readonly ? '暂无成交记录' : '暂无成交记录，点上方「成交登记」录入' }}</div>
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
import { ref, reactive, computed, watch, nextTick, onUnmounted } from 'vue'
import api from '../utils/api'
import { calcVisitStatus, leadDateShort } from '../utils/constants'
import { useToast } from '../composables/useToast'
import ConfirmDialog from './ConfirmDialog.vue'

// 两地牌口岸（业务固定 4 个）
const PORTS = ['深圳湾', '莲塘', '沙头角', '港珠澳']

const props = defineProps({
  show: { type: Boolean, default: false },
  customer: { type: Object, default: () => ({}) },
  readonly: { type: Boolean, default: false }, // 管理员只读：隐藏一切写入口
})
const emit = defineEmits(['update:show', 'updated'])

const { toast, showToast } = useToast()

const followups = ref([])
const deals = ref([])
const visits = ref([])
const loading = ref(false)
const panelLoading = ref(false)
// 加载竞态保护：连续切换客户时丢弃过期响应
let loadSeq = 0

// 当前需求快照（面板内展示 + 保存后本地同步）
const currentNeeds = ref('')

// AI 后台分析状态：提交跟进后为 true，分析结束（或面板关闭/切换客户）后复位
const aiAnalyzing = ref(false)
let aiCheckTimers = []
function clearAiCheck() {
  aiCheckTimers.forEach(clearTimeout)
  aiCheckTimers = []
}

// ── 动作表单状态：visit/followup/needs/priority 四类（deal 直接开成交表单）──
const actionType = ref(null)
const followupDraft = ref('')
const needsDraft = ref('')
const priorityDraft = ref('')

// ── 到店表单（登记/编辑共用）─────────────────────────────
const editingVisit = ref(null)
const formVisit = reactive({ visit_time: today(), needs: '', remark: '' })

// ── 成交表单：车辆区 / 两地牌区 各自独立，互不干扰 ──────────
const showDealForm = ref(false)
const editingDeal = ref(null)
const activeTab = ref('vehicle')   // 'vehicle' | 'plate'
const contentTab = ref('timeline') // 记录区 Tab：'timeline' 动态 | 'deals' 成交记录
const formVehicle = reactive({ vin: '', vehicle_desc: '', amount: '', deal_time: today(), remark: '' })
const formPlate = reactive({ port: '', plate_kind: '期牌', plate_number: '', amount: '', deal_time: today(), remark: '' })

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
  const lead = c.lead_date_short || leadDateShort(c.lead_date)
  return lead ? `${lead}/${c.customer_name}` : (c.customer_name || '')
})
const visit = computed(() => calcVisitStatus(props.customer?.last_visit_at))
const totalAmount = computed(() => {
  const sum = deals.value.reduce((s, d) => s + (Number(d.amount) || 0), 0)
  return sum > 0 ? sum.toLocaleString() : null
})
// 概要条「最近到店」：短日期 + 回访健康度文案
const visitStat = computed(() => {
  const s = props.customer?.last_visit_at
  if (!s) return { text: '未回访', cls: 'danger' }
  return { text: `${String(s).slice(5, 10)} · ${visit.value.text}`, cls: visit.value.class }
})

// AI 需求自动更新的留痕前缀（跟进 / 到店两个来源）
const aiTraceRe = /^(需求已随跟进自动更新：|需求已自动更新：)/

// ── 动态时间线：跟进（邀约/需求/重点留痕）+ 到店（含成交到店）合并倒序 ──
// 到店自动生成的跟进留痕（"到店：xxx"）由到店条目代表，不重复展示
const timeline = computed(() => {
  const entries = []
  for (const f of followups.value) {
    if (/^到店(:|：|未成交：)/.test(f.content)) continue
    let tagLabel = '跟进', tagClass = 't-followup'
    if (/^更新需求：/.test(f.content)) { tagLabel = '需求'; tagClass = 't-needs' }
    else if (aiTraceRe.test(f.content)) { tagLabel = '需求'; tagClass = 't-needs-auto' }
    else if (/^邀约到店：/.test(f.content)) { tagLabel = '邀约'; tagClass = 't-invite' }
    else if (/^(标注重点|取消重点)：/.test(f.content)) { tagLabel = '重点'; tagClass = 't-priority' }
    entries.push({
      key: `f${f.id}`, kind: 'followup', tagLabel, tagClass,
      time: formatTime(f.created_at), ts: f.created_at || '', content: f.content,
    })
  }
  for (const v of visits.value) {
    entries.push({
      key: `v${v.id}`, kind: 'visit',
      tagLabel: v.is_deal ? '成交到店' : '到店', tagClass: v.is_deal ? 't-deal' : 't-visit',
      time: v.visit_time || '', ts: v.visit_time ? `${v.visit_time}T23:59` : (v.created_at || ''),
      visit: v,
    })
  }
  return entries.sort((a, b) => String(b.ts).localeCompare(String(a.ts))).slice(0, 3) // 默认只展示最新 3 条
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

// ── 动作入口：表单在面板内就地展开，不弹二级弹层 ──────────
const formTitles = { visit: '登记到店', followup: '更新跟进', needs: '变更需求', priority: '标记重点' }
const inlineFormRef = ref(null)
const dealFormRef = ref(null)
const sheetRef = ref(null)

// ── 背景滚动锁定：弹窗打开期间锁住页面滚动，防手机端触摸/PC 滚轮穿透遮罩 ──
function onSheetTouchMove(e) {
  // 内容不足一屏时弹窗本身不可滚，不拦截的话触摸会穿透滚动背后的页面
  const el = sheetRef.value
  if (el && el.scrollHeight <= el.clientHeight) e.preventDefault()
}

watch(() => props.show, (open) => {
  const html = document.documentElement
  if (open) {
    // 补偿 PC 端滚动条消失造成的布局跳动
    const gap = window.innerWidth - html.clientWidth
    html.classList.add('cdp-lock')
    if (gap > 0) html.style.paddingRight = `${gap}px`
  } else {
    html.classList.remove('cdp-lock')
    html.style.paddingRight = ''
  }
})

onUnmounted(() => {
  document.documentElement.classList.remove('cdp-lock')
  document.documentElement.style.paddingRight = ''
  clearAiCheck()
})

function scrollFormIntoView(deal = false) {
  nextTick(() => {
    (deal ? dealFormRef.value : inlineFormRef.value)?.scrollIntoView?.({ behavior: 'smooth', block: 'start' })
  })
}

function toggleAction(type) {
  // 正在编辑某条到店时再点「登记到店」→ 切换为新的空白登记，而不是收起
  if (actionType.value === type && !(type === 'visit' && editingVisit.value)) { closeAction(); return }
  openAction(type)
}
function openAction(type) {
  if (type === 'deal') { openDealForm(null); return }
  showDealForm.value = false // 唯一表单区：一次只展开一个表单
  if (type === 'visit') { resetVisitForm(); editingVisit.value = null }
  if (type === 'followup') followupDraft.value = ''
  if (type === 'needs') needsDraft.value = currentNeeds.value
  if (type === 'priority') priorityDraft.value = ''
  actionType.value = type
  scrollFormIntoView(false)
}
function closeAction() {
  actionType.value = null
}

// 成交登记动作：再点一次收起表单
function toggleDeal() {
  if (showDealForm.value) { showDealForm.value = false; return }
  openDealForm(null)
}

// 头部⭐：已重点 → 走取消确认；未重点 → 打开标记重点表单
function onStarTap() {
  if (props.customer.is_priority) confirmRemovePriority()
  else openAction('priority')
}

async function loadData(silent = false) {
  const id = props.customer?.id
  if (!id) return
  const seq = ++loadSeq
  if (!silent) panelLoading.value = true
  try {
    const [f, d, v, c] = await Promise.all([
      api.get(`/customers/${id}/followups`),
      api.get(`/customers/${id}/deals`),
      api.get(`/customers/${id}/visits`),
      api.get(`/customers/${id}`),
    ])
    if (seq !== loadSeq) return // 已切换到其他客户，丢弃过期响应
    followups.value = f || []
    deals.value = d || []
    visits.value = v || []
    // 同步客户最新状态：当前需求/重点标记可能已被 AI 后台分析或其他端更新
    if (c) {
      currentNeeds.value = c.current_needs || ''
      if (props.customer && props.customer.id === id) {
        props.customer.current_needs = c.current_needs || ''
        props.customer.is_priority = !!c.is_priority
        if (c.last_visit_at) props.customer.last_visit_at = c.last_visit_at
      }
    }
  } catch (e) {
    if (seq === loadSeq) showToast(e.message || '加载失败')
  } finally {
    if (!silent && seq === loadSeq) panelLoading.value = false
  }
}

watch(
  () => [props.show, props.customer?.id],
  ([isShow]) => {
    if (isShow) {
      actionType.value = null
      showDealForm.value = false
      editingVisit.value = null
      contentTab.value = 'timeline'
      clearAiCheck()
      aiAnalyzing.value = false
      currentNeeds.value = props.customer?.current_needs || ''
      // 先清空旧客户数据，避免加载期间显示上一位客户的记录
      followups.value = []
      deals.value = []
      visits.value = []
      loadData()
    }
  }
)

// ── 到店：登记 / 编辑 ───────────────────────────────────
function resetVisitForm() {
  Object.assign(formVisit, {
    visit_time: today(),
    // 到店情况为自由描述（客户说了什么/沟通过程），需求由 AI 从中提取，不预填旧需求
    needs: '',
    remark: '',
  })
}

function openVisitForm(visitRow) {
  showDealForm.value = false // 唯一表单区：一次只展开一个表单
  resetVisitForm()
  if (visitRow) {
    editingVisit.value = visitRow
    Object.assign(formVisit, {
      visit_time: visitRow.visit_time || today(),
      needs: visitRow.needs || '',
      remark: visitRow.remark || '',
    })
  } else {
    editingVisit.value = null
  }
  actionType.value = 'visit'
  scrollFormIntoView(false)
}

async function submitVisit() {
  if (loading.value) return
  const cid = props.customer.id
  const needs = formVisit.needs.trim()
  // 新增（未成交）需求必填；编辑已成交到店时需求可留空
  const isDealVisit = editingVisit.value && editingVisit.value.is_deal
  if (!isDealVisit && !needs) return showToast('请填写需求')
  loading.value = true
  try {
    const maxIdBefore = followups.value.reduce((m, f) => Math.max(m, f.id), 0)
    const needsAtSave = currentNeeds.value
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
    closeAction()
    // 新增到店后端会自动标重点；当前需求不由到店内容直接覆盖，
    // 由 AI 后台分析本次到店内容后决定是否更新（与跟进同款流程）
    if (!editingVisit.value && props.customer) {
      props.customer.is_priority = true
    }
    await loadData()
    emit('updated')
    if (!editingVisit.value) {
      scheduleAiNeedCheck(cid, maxIdBefore, needsAtSave)
    }
  } catch (e) {
    showToast(e.message || '保存失败')
  } finally {
    loading.value = false
  }
}

// 到店记录若关联了成交，展示成交摘要
function dealSummary(dealId) {
  if (!dealId) return ''
  const d = deals.value.find((x) => x.id === dealId)
  if (!d) return ''
  if (d.deal_type === 'vehicle') return d.vehicle_desc || '车辆'
  return `${d.port || ''} ${d.plate_kind || ''}`.trim() || '两地牌'
}

function confirmDeleteVisit(visitRow) {
  Object.assign(confirm, {
    show: true,
    title: '删除到店记录',
    desc: '确认删除这条到店记录？（不会删除关联的成交记录）',
    danger: true,
    confirmText: '删除',
    action: async () => {
      confirm.show = false
      try {
        await api.delete(`/customers/${props.customer.id}/visits/${visitRow.id}`)
        await loadData()
        emit('updated')
        showToast('已删除')
      } catch (e) {
        showToast(e.message || '删除失败')
      }
    },
  })
}

// ── AI 后台分析公共逻辑：面板提示进行中，5s/15s/32s 静默复查回填结果 ──
// （服务端 AI 超时上限 30s；面板关闭/切换客户即停止复查，数据后台照常落库）
function scheduleAiNeedCheck(cid, maxIdBefore, needsAtSave) {
  aiAnalyzing.value = true
  clearAiCheck()
  let notified = false
  aiCheckTimers = [5000, 15000, 32000].map((ms) => setTimeout(async () => {
    if (!props.show || props.customer?.id !== cid) {
      clearAiCheck()
      aiAnalyzing.value = false
      return
    }
    await loadData(true)
    const trace = followups.value.find((f) => f.id > maxIdBefore && aiTraceRe.test(f.content))
    if (trace) {
      const newNeeds = trace.content.replace(aiTraceRe, '').trim()
      if (newNeeds) {
        currentNeeds.value = newNeeds
        if (props.customer) props.customer.current_needs = newNeeds
      }
      aiAnalyzing.value = false
      clearAiCheck()
      if (!notified) {
        notified = true
        showToast('AI 检测到需求变化，已自动更新')
      }
    } else if (ms === 32000) {
      // 最后一查仍无结论（AI 超时或判定无变更）：静默结束，需求保持原样
      aiAnalyzing.value = false
    }
  }, ms))
}

// ── 跟进：保存立即完成；AI 在后台静默分析，完成后自动回填当前需求 ──
async function submitFollowupAction() {
  const content = followupDraft.value.trim()
  if (!content) return showToast('请填写跟进内容')
  loading.value = true
  try {
    const cid = props.customer.id
    const maxIdBefore = followups.value.reduce((m, f) => Math.max(m, f.id), 0)
    const needsAtSave = currentNeeds.value
    await api.post(`/customers/${cid}/followups`, { content })
    showToast('跟进已记录')
    followupDraft.value = ''
    closeAction()
    await loadData()
    emit('updated')
    scheduleAiNeedCheck(cid, maxIdBefore, needsAtSave)
  } catch (e) {
    showToast(e.message || '保存失败')
  } finally {
    loading.value = false
  }
}

// ── 需求变更：直接改快照，留痕时间线 ─────────────────────
async function submitNeedsAction() {
  const needs = needsDraft.value.trim()
  if (!needs) return showToast('请填写需求内容')
  if (needs === currentNeeds.value) { closeAction(); return }
  loading.value = true
  try {
    await api.put(`/customers/${props.customer.id}/needs`, { needs, followup: true })
    currentNeeds.value = needs
    if (props.customer) props.customer.current_needs = needs
    showToast('需求已更新')
    closeAction()
    await loadData()
    emit('updated')
  } catch (e) {
    showToast(e.message || '保存失败')
  } finally {
    loading.value = false
  }
}

// ── 标记重点：情况说明落一条动态（标注重点：xxx），AI 从中提取/更新需求 ────
async function submitPriorityAction() {
  const note = priorityDraft.value.trim()
  if (!note && !currentNeeds.value) return showToast('请写一句情况说明，AI 才能提取需求')
  loading.value = true
  try {
    const cid = props.customer.id
    if (note) {
      // 内容作为动态落库，随后 AI 后台提取需求（复用跟进同款轮询回填机制）
      const maxIdBefore = followups.value.reduce((m, f) => Math.max(m, f.id), 0)
      const needsAtSave = currentNeeds.value
      await api.post(`/customers/${cid}/followups`, { content: `标注重点：${note}` })
      await api.put(`/customers/${cid}/priority`, { is_priority: true })
      if (props.customer) props.customer.is_priority = true
      showToast('已标为重点')
      priorityDraft.value = ''
      closeAction()
      await loadData()
      emit('updated')
      scheduleAiNeedCheck(cid, maxIdBefore, needsAtSave)
    } else {
      // 已有需求且未补充说明：仅打重点标记
      await api.put(`/customers/${cid}/priority`, { is_priority: true })
      if (props.customer) props.customer.is_priority = true
      showToast('已标为重点')
      priorityDraft.value = ''
      closeAction()
      await loadData()
      emit('updated')
    }
  } catch (e) {
    showToast(e.message || '操作失败')
  } finally {
    loading.value = false
  }
}

// ── 取消重点（头部⭐）────────────────────────────────────
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
        if (props.customer) props.customer.is_priority = false
        showToast('已移出重点')
        emit('updated')
      } catch (e) {
        showToast(e.message || '操作失败')
      }
    },
  })
}

// ── 成交（结构化表单，原逻辑保留）────────────────────────
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
  actionType.value = null                 // 唯一表单区：一次只展开一个表单
  contentTab.value = 'deals'              // 打开成交表单时切到成交记录，录入与既有成交同屏
  showDealForm.value = true
  scrollFormIntoView(true)
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
</script>

<style scoped>
.cdp-mask {
  position: fixed; inset: 0; background: rgba(0, 0, 0, 0.3);
  display: flex; align-items: flex-end; justify-content: center; z-index: var(--z-modal);
}
.cdp-sheet {
  width: 100%; background: var(--surface); border-radius: 20px 20px 0 0; padding: 20px;
  padding-bottom: calc(20px + env(safe-area-inset-bottom));
  max-height: 92vh; overflow-y: auto; position: relative;
  /* 滚动到底不连带拖动底层页面，避免"越滚越乱"的失控感 */
  overscroll-behavior: contain;
}
/* 抽屉把手 + 头部吸顶：内容再长、滚到多深，客户名和关闭按钮始终可见可点。
   把手 top:12 / 头部 top:30 与自然位置（padding 20 + 把手 4 + 间距 14）对齐，
   滚动 8px 后两者同时吸附，吸住后间距与静止时一致 */
.cdp-handle { position: sticky; top: 12px; z-index: 2; width: 36px; height: 4px; border-radius: 2px; background: rgba(0,0,0,0.12); margin: 0 auto 14px; }

.cdp-header {
  position: sticky; top: 30px; z-index: 3;
  display: flex; align-items: center; gap: 10px; margin-bottom: 12px;
  background: var(--surface);
  border-bottom: 1px solid var(--border-glass);
  box-shadow: 0 10px 12px -10px rgba(0, 0, 0, 0.14);
  padding: 2px 0 10px;
}
.cdp-loading { display: flex; align-items: center; justify-content: center; gap: 8px; padding: 22px 0 8px; font-size: 13px; color: var(--text-tertiary); }
.cdp-loading-dot { width: 16px; height: 16px; border: 2px solid var(--primary-light); border-top-color: var(--primary); border-radius: 50%; animation: cdp-spin 0.8s linear infinite; }
@keyframes cdp-spin { to { transform: rotate(360deg); } }
.cdp-avatar {
  width: 40px; height: 40px; border-radius: 12px; flex-shrink: 0;
  background: var(--primary-light); color: var(--primary);
  display: flex; align-items: center; justify-content: center;
}
.cdp-avatar svg { width: 21px; height: 21px; }
.cdp-titlewrap { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 1px; }
.cdp-title { font-size: 17px; font-weight: 700; color: var(--text-primary); min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.cdp-health { display: flex; align-items: center; gap: 5px; font-size: 11.5px; font-weight: 600; }
.health-dot { width: 7px; height: 7px; border-radius: 50%; display: inline-block; }
.cdp-health .success, .health-dot.success { color: #34C759; background: #34C759; }
.cdp-health .warning, .health-dot.warning { color: var(--warning); background: var(--warning); }
.cdp-health .danger, .health-dot.danger { color: var(--danger); background: var(--danger); }
.cdp-health .success, .cdp-health .warning, .cdp-health .danger { background: none; }
.cdp-close {
  width: 34px; height: 34px; border: none; background: var(--bg-primary); border-radius: 50%;
  font-size: 20px; color: var(--text-secondary); cursor: pointer; line-height: 1; flex-shrink: 0;
  transition: transform 0.15s, opacity 0.15s;
}
.cdp-close:active { transform: scale(0.9); opacity: 0.7; }
/* 重点开关：带文字胶囊，状态显性化 */
.cdp-star-pill {
  flex-shrink: 0; display: inline-flex; align-items: center; gap: 4px;
  padding: 7px 13px; border-radius: 99px; font-size: 12.5px; font-weight: 700; font-family: inherit;
  background: var(--bg-primary); color: var(--text-tertiary);
  border: 1px solid var(--border-glass); cursor: pointer;
  transition: all 0.15s;
}
.cdp-star-pill.on { background: var(--orange-light); border-color: rgba(255, 149, 0, 0.4); color: #EA580C; }
.cdp-star-pill:active { transform: scale(0.95); }

.sec-icon { width: 15px; height: 15px; flex-shrink: 0; }
.ic-danger { color: var(--danger); }
.sec-empty { font-size: 13px; color: var(--text-tertiary); padding: 6px 0; line-height: 1.6; }

/* ── 当前需求摘要卡 ── */
.need-summary {
  background: linear-gradient(135deg, rgba(0,122,255,0.06), rgba(90,200,250,0.09));
  border: 1px solid rgba(0, 122, 255, 0.16);
  border-radius: 14px; padding: 13px 14px; margin-bottom: 12px;
}
/* 夜间：需求卡渐变提亮，保持可感知的品牌色 */
.dark .need-summary { background: linear-gradient(135deg, rgba(10, 132, 255, 0.18), rgba(100, 210, 255, 0.1)); border-color: rgba(10, 132, 255, 0.34); }
.ns-head { display: flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 700; color: var(--primary); }
.ns-edit {
  margin-left: auto; font-size: 12px; font-weight: 700; color: var(--primary);
  background: var(--surface); border-radius: 99px; padding: 4px 13px;
  box-shadow: 0 2px 6px rgba(0, 122, 255, 0.15); cursor: pointer; border: none;
  font-family: inherit;
}
.ns-text { font-size: 14px; line-height: 1.65; color: var(--text-primary); word-break: break-all; margin-top: 8px; }
.ns-text.empty { color: var(--text-tertiary); }
.ns-hint { font-size: 11px; color: var(--text-tertiary); margin-top: 8px; }

/* ── AI 后台分析进行中 ── */
.ai-pending {
  display: flex; align-items: center; gap: 7px;
  font-size: 12px; color: var(--primary);
  background: var(--primary-light); border-radius: 10px;
  padding: 8px 12px; margin-bottom: 12px;
}
.ai-pending-dot {
  width: 12px; height: 12px; flex-shrink: 0;
  border: 2px solid rgba(0, 122, 255, 0.25); border-top-color: var(--primary);
  border-radius: 50%; animation: cdp-spin 0.8s linear infinite;
}

/* ── 客户概要条：重点状态 / 最近到店 / 累计成交 ── */
.stat-strip { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 12px; }
.stat { background: var(--bg-primary); border-radius: 11px; padding: 8px 11px; min-width: 0; }
.stat .k { font-size: 10.5px; font-weight: 700; color: var(--text-tertiary); }
.stat .v { font-size: 12.5px; font-weight: 700; margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.stat .v.org { color: #EA580C; }
.stat .v.amt { color: #EA580C; }
.stat .v.success { color: #1f7a3a; }
.stat .v.warning { color: var(--warning); }
.stat .v.danger { color: var(--danger); }
.stat .v.mut { color: var(--text-tertiary); }

/* ── 动作区：主操作按钮（移动端紧凑 chips，PC 展示副标题卡片）── */
.zone-label { font-size: 11px; font-weight: 700; color: var(--text-secondary); letter-spacing: 2px; margin: 2px 0 9px; }
/* 可换行：重点客户有 4 个动作（含取消重点），窄屏放不下时第 4 个独占一行 */
.act-row { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 12px; }
.act-chip {
  flex: 1 1 calc(33.33% - 6px); min-width: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px;
  padding: 10px 4px; border-radius: 13px; border: 1.5px solid rgba(0, 122, 255, 0.4);
  background: var(--primary-light); color: var(--primary);
  font-family: inherit; cursor: pointer;
  transition: all 0.15s;
}
.act-main { display: flex; align-items: center; gap: 5px; }
.act-chip .act-ic { font-size: 15px; line-height: 1; }
.act-chip .act-t { font-size: 13.5px; font-weight: 700; white-space: nowrap; }
.act-chip .act-sub { display: none; font-size: 10.5px; font-weight: 600; color: var(--text-tertiary); line-height: 1.3; text-align: center; }
.act-chip:active { transform: scale(0.96); opacity: 0.8; }
.act-chip.star { border-color: rgba(255, 149, 0, 0.45); background: var(--orange-light); color: #EA580C; }
/* 取消重点：中性底、悬停示警，与主操作区分 */
.act-chip.plain { border-color: var(--border-glass); background: var(--bg-primary); color: var(--text-secondary); }
/* 展开状态：当前正打开的表单对应按钮高亮 */
.act-chip.active { background: var(--primary); color: #fff; border-color: transparent; }
.act-chip.star.active { background: var(--warning); color: #fff; border-color: transparent; }
.act-chip.active .act-sub { color: rgba(255, 255, 255, 0.78); }

/* ── 记录 Tab：动态 / 成交记录 ── */
.record-tabs { border-top: 1px solid var(--border-glass); padding-top: 12px; }
.rt-bar { display: flex; align-items: center; gap: 20px; border-bottom: 1.5px solid var(--border-glass); padding: 0 2px; }
.rt-tab {
  position: relative; display: flex; align-items: center; gap: 6px;
  padding: 6px 2px 10px; border: none; background: none;
  font-size: 14px; font-weight: 700; color: var(--text-secondary); font-family: inherit; cursor: pointer;
}
.rt-cnt { font-size: 11px; font-weight: 700; background: var(--bg-primary); color: var(--text-secondary); border-radius: 99px; padding: 1px 8px; }
.rt-tab.on { color: var(--primary); }
.rt-tab.on .rt-cnt { background: var(--primary-light); color: var(--primary); }
.rt-tab.on::after { content: ''; position: absolute; left: 0; right: 0; bottom: -1.5px; height: 3px; border-radius: 3px; background: var(--primary); }
.rt-total { margin-left: auto; font-size: 13px; font-weight: 600; color: #EA580C; }
.rt-body { padding-top: 12px; }

/* ── 动态时间线 ── */
.tl { display: flex; flex-direction: column; gap: 10px; }
.tl-item { display: flex; gap: 9px; align-items: flex-start; background: var(--bg-primary); border-radius: 12px; padding: 10px 12px; }
.tl-tag {
  flex-shrink: 0; margin-top: 1px; font-size: 11px; font-weight: 700;
  padding: 3px 8px; border-radius: 6px; white-space: nowrap;
}
.t-followup { background: var(--blue-light, var(--primary-light)); color: var(--primary); }
.t-invite { background: var(--purple-light, rgba(175, 82, 222, 0.12)); color: var(--purple, #AF52DE); }
.t-needs, .t-needs-auto { background: var(--orange-light); color: var(--warning); }
.t-needs-auto { border: 1px dashed rgba(255, 149, 0, 0.4); }
.t-priority { background: var(--orange-light); color: #EA580C; }
.t-visit { background: rgba(52, 199, 89, 0.12); color: #1f7a3a; }
.t-deal { background: var(--green-light, rgba(52, 199, 89, 0.15)); color: var(--success); }
.tl-body { flex: 1; min-width: 0; }
.tl-time { font-size: 11.5px; font-weight: 600; color: var(--text-tertiary); margin-bottom: 3px; }
.tl-content { font-size: 13.5px; color: var(--text-primary); line-height: 1.5; word-break: break-all; }
.tl-content.empty { color: var(--text-tertiary); font-size: 12.5px; }
.tl-meta { display: flex; flex-direction: column; gap: 2px; margin-top: 3px; font-size: 12px; color: var(--text-secondary); }
.tl-ops { display: flex; gap: 12px; margin-top: 6px; font-size: 12.5px; font-weight: 600; color: var(--text-secondary); }
.tl-ops span { cursor: pointer; }
.tl-ops span:active { opacity: 0.5; }
.tl-ops .danger { color: var(--danger); }

/* ── 成交记录 ── */
.deal-list { display: flex; flex-direction: column; gap: 10px; }
.deal-item { display: flex; gap: 10px; background: var(--bg-primary); border-radius: 12px; padding: 11px; }
.deal-tag { flex-shrink: 0; align-self: flex-start; display: inline-flex; align-items: center; gap: 4px; font-size: 12px; font-weight: 700; padding: 4px 9px; border-radius: 7px; white-space: nowrap; }
.deal-tag .ic { width: 12px; height: 12px; }
.deal-tag.vehicle { background: var(--blue-light, var(--primary-light)); color: var(--primary); }
.deal-tag.plate { background: var(--purple-light, rgba(175, 82, 222, 0.12)); color: var(--purple, #AF52DE); }
.deal-body { flex: 1; min-width: 0; }
.deal-main { font-size: 15px; font-weight: 600; color: var(--text-primary); }
.deal-sub { font-size: 13px; color: var(--text-secondary); margin-top: 2px; word-break: break-all; }
.deal-meta { display: flex; gap: 10px; margin-top: 4px; font-size: 12px; color: var(--text-tertiary); align-items: center; }
.deal-meta .meta-ic { width: 12px; height: 12px; }
.deal-meta span { display: inline-flex; align-items: center; gap: 3px; }
.deal-amount { color: #EA580C; font-weight: 700; }
.deal-remark { font-size: 13px; color: var(--text-secondary); margin-top: 3px; }
.deal-ops { display: flex; flex-direction: column; gap: 10px; flex-shrink: 0; font-size: 13px; font-weight: 600; color: var(--text-secondary); }
.deal-ops span { cursor: pointer; }
.deal-ops span:active { opacity: 0.5; }
.deal-ops .danger { color: var(--danger); }

/* ── 内联操作表单（面板内就地展开，不弹二级弹层）── */
.inline-form {
  background: var(--bg-primary);
  border: 1.5px solid rgba(0, 122, 255, 0.35);
  border-radius: 14px;
  padding: 13px 14px;
  margin-bottom: 12px;
  /* 滚动定位时给吸顶头部留出空间，避免表单顶部被遮住 */
  scroll-margin-top: 84px;
}
.if-title {
  display: flex; align-items: center; justify-content: space-between;
  font-size: 14.5px; font-weight: 700; color: var(--text-primary); margin-bottom: 11px;
}
.if-close {
  width: 26px; height: 26px; border: none; background: var(--surface);
  border-radius: 8px; color: var(--text-secondary); font-size: 13px;
  cursor: pointer; line-height: 1;
}
.if-close:active { opacity: 0.6; }

.df-tabs { display: flex; gap: 4px; background: var(--surface); border-radius: 13px; padding: 4px; margin-bottom: 8px; }
.df-tab { flex: 1; padding: 12px; border: none; background: transparent; border-radius: 10px; font-size: 15px; font-weight: 600; color: var(--text-secondary); cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 5px; font-family: inherit; }
.df-tab .ic { width: 16px; height: 16px; }
.df-tab.active { background: var(--surface); color: var(--primary); box-shadow: 0 1px 4px rgba(0,0,0,0.1); }
.df-tab-hint { font-size: 12px; color: var(--text-tertiary); margin-bottom: 14px; }

.df-field { display: flex; flex-direction: column; gap: 5px; margin-bottom: 10px; }
.df-field:last-child { margin-bottom: 0; }
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
.btn-primary { background: var(--primary); color: #fff; border: none; }
.btn-plain { background: var(--surface); color: var(--text-secondary); border: 1px solid var(--border-glass); }
.btn-submit:disabled, .df-btns button:disabled { opacity: 0.5; }

/* PC：单列居中弹窗 —— 宽度 min(880px, 94vw)，信息按一条主轴排布（需求 → 概要 →
   动作 → 唯一表单区 → 记录 Tab），无左右分栏、无空白列；头部固定，内容区滚动 */
@media (min-width: 1024px) {
  .cdp-mask { align-items: center; justify-content: center; background: rgba(15, 23, 42, 0.45); }
  .cdp-sheet {
    width: min(880px, 94vw);
    max-height: min(900px, 92vh);
    height: auto;
    border-radius: 20px;
    padding: 0;
    display: flex;
    flex-direction: column;
    box-shadow: 0 24px 70px rgba(0, 0, 0, 0.28);
  }
  .cdp-handle { display: none; }

  /* PC 无滚动抽屉，头部静态即可 */
  .cdp-header {
    position: static; top: auto;
    background: transparent; border-bottom: 1px solid var(--border-glass); box-shadow: none;
    padding: 20px 28px 12px; margin-bottom: 0;
    flex-shrink: 0;
  }
  .cdp-title { font-size: 19px; }
  .cdp-health { font-size: 12px; }
  .cdp-loading { padding: 16px 28px 6px; }

  .cdp-body {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    padding: 16px 28px 26px;
  }

  /* 概要条 PC 加大 */
  .stat-strip { gap: 10px; margin-bottom: 14px; }
  .stat { padding: 10px 14px; border-radius: 12px; }
  .stat .k { font-size: 11px; }
  .stat .v { font-size: 14px; font-weight: 800; }

  /* 动作卡：PC 展示副标题，单行不换行 */
  .act-row { flex-wrap: nowrap; }
  .act-chip { flex: 1 1 auto; padding: 13px 6px 12px; border-radius: 14px; gap: 3px; }
  .act-chip .act-t { font-size: 14.5px; }
  .act-chip .act-sub { display: block; }
  .act-chip.plain:hover { border-color: var(--danger); color: var(--danger); }

  /* 记录 Tab */
  .rt-tab { font-size: 14.5px; }

  /* 内联表单：输入框在浅底卡片上，改为白底提升对比 */
  .inline-form { background: var(--surface); border-color: var(--border-glass); box-shadow: 0 8px 20px -12px rgba(15, 23, 42, 0.15); scroll-margin-top: 8px; }
  .df-field { margin-bottom: 10px; }
  .df-btns { margin-top: 2px; }

  .ns-edit:hover { filter: brightness(0.97); }
  .deal-ops span:hover { color: var(--primary); }
  .deal-ops span.danger:hover { color: var(--danger); }
  .tl-ops span:hover { color: var(--primary); }
  .tl-ops span.danger:hover { color: var(--danger); }
  .act-chip:hover { border-color: var(--primary); filter: brightness(1.02); }
  .act-chip.star:hover { border-color: var(--warning); }
  .rt-tab:hover { color: var(--primary); }
  .cdp-star-pill:hover { filter: brightness(0.97); }
}
</style>
