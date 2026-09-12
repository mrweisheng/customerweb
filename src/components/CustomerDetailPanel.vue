<template>
  <!-- 客户编辑面板：销售只管"本次做了什么"（动作式录入），
       需求快照 / 跟进时间线 / 到店与成交记录由系统与 AI 自动归位 -->
  <div class="cdp-mask" v-if="show" @click="close">
    <div class="cdp-sheet" @click.stop>
      <div class="cdp-handle"></div>

      <!-- 头部：客户名 + 健康度 + 重点开关 + 关闭 -->
      <div class="cdp-header">
        <div class="cdp-title">{{ customerName }}</div>
        <div class="cdp-health" v-if="customer.last_visit_at !== undefined">
          <span class="health-dot" :class="visit.class"></span>
          <span :class="visit.class">{{ visit.text }}</span>
        </div>
        <button
          v-if="!readonly"
          class="cdp-star"
          :class="{ on: customer.is_priority }"
          @click="onStarTap"
          :title="customer.is_priority ? '取消重点' : '标记重点'"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
        </button>
        <button class="cdp-close" @click="close">×</button>
      </div>

      <div class="cdp-loading" v-if="panelLoading"><span class="cdp-loading-dot"></span>加载客户数据中…</div>

      <div class="cdp-body" v-if="!panelLoading">
        <div class="cdp-col">
          <!-- 当前需求（快照）：只读展示，来源信息自动维护，可手动变更 -->
          <div class="need-summary">
            <div class="ns-head">
              <svg class="sec-icon ic-danger" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>
              <span>当前需求</span>
              <button v-if="!readonly" class="ns-edit" @click="openNeedsEntry">变更</button>
            </div>
            <div class="ns-text" :class="{ empty: !currentNeeds }">{{ currentNeeds || '暂无需求记录' }}</div>
            <div class="ns-hint" v-if="!readonly">登记到店 / 提交跟进时自动更新，AI 会在需求变化时提示</div>
          </div>

          <!-- 三大主操作：直接可见，无需二级菜单（成交走下方成交记录区） -->
          <div class="act-row" v-if="!readonly">
            <button class="act-chip" @click="openVisitEntry">
              <span class="act-ic">📍</span>登记到店
            </button>
            <button class="act-chip" @click="openFollowupEntry">
              <span class="act-ic">💬</span>更新跟进
            </button>
            <button v-if="!customer.is_priority" class="act-chip star" @click="openPriorityEntry">
              <span class="act-ic">⭐</span>标记重点
            </button>
          </div>

          <!-- 动态时间线：跟进 / 邀约 / 到店 / 成交到店 / 需求变更 统一倒序 -->
          <div class="cdp-section">
            <div class="sec-head">
              <svg class="sec-icon ic-blue" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>动态
            </div>
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
            <div v-else class="sec-empty">还没有记录，点上方「登记到店」或「更新跟进」开始</div>
          </div>
        </div>

        <div class="cdp-col">
          <!-- 成交记录（结构化数据，独立区块保留） -->
          <div class="cdp-section sec-deals">
            <div class="sec-head">
              <svg class="sec-icon ic-green" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2"/><path d="M6 12h.01M18 12h.01"/></svg>成交记录
              <span class="sec-count">{{ deals.length }}</span>
              <span class="sec-total" v-if="totalAmount">累计 ¥{{ totalAmount }}</span>
              <button v-if="!readonly" class="btn-add" @click="openDealForm(null)">+ 添加</button>
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
                <div class="deal-ops" v-if="!readonly">
                  <span @click="openDealForm(d)">编辑</span>
                  <span class="danger" @click="confirmDeleteDeal(d)">删除</span>
                </div>
              </div>
            </div>
            <div v-else class="sec-empty">暂无成交记录</div>
          </div>
        </div>
      </div>

      <!-- ── 到店（登记 / 编辑共用）：needs 必填，自动标重点 + 同步当前需求 + 生成第一条跟进 ── -->
      <div class="df-mask" v-if="actionType === 'visit'" @click="closeAction">
        <div class="df-sheet" @click.stop>
          <div class="df-handle"></div>
          <div class="df-title">{{ customerName }}<span class="df-title-sub"> · {{ editingVisit ? '编辑到店' : '登记到店' }}</span></div>
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
                :placeholder="formVisit.needs || currentNeeds ? '默认带入当前需求，可修改' : '客户本次说了什么需求'"
              ></textarea>
            </div>
            <div class="df-field df-field-wide">
              <label>备注</label>
              <input class="df-input" v-model.trim="formVisit.remark" placeholder="选填" />
            </div>
          </div>
          <div class="df-tab-hint" v-if="!editingVisit">本次将记录：到店 · {{ formVisit.visit_time }}，自动标为重点并更新当前需求</div>
          <div class="df-tab-hint" v-if="editingVisit && editingVisit.is_deal">该到店由成交记录自动生成，成交详情请在「成交记录」中编辑</div>
          <div class="df-btns">
            <button class="btn-plain" @click="closeAction">取消</button>
            <button class="btn-primary" :disabled="loading" @click="submitVisit">{{ loading ? '保存中…' : '保存' }}</button>
          </div>
        </div>
      </div>

      <!-- 跟进：一句话内容，AI 自动判断是否需要更新当前需求 -->
      <div class="df-mask" v-if="actionType === 'followup'" @click="closeAction">
        <div class="df-sheet" @click.stop>
          <div class="df-handle"></div>
          <div class="df-title">{{ customerName }}<span class="df-title-sub"> · 跟进</span></div>
          <div class="df-block">
            <div class="df-field df-field-wide">
              <label>本次沟通内容</label>
              <textarea class="df-input" v-model.trim="followupDraft" rows="3" placeholder="做了什么 / 客户说了什么，如：电话聊了，预算从40万降到30万，想看X3"></textarea>
            </div>
          </div>
          <div class="df-tab-hint">保存后 AI 会与当前需求比对，需求变化时自动更新并提示</div>
          <div class="df-btns">
            <button class="btn-plain" @click="closeAction">取消</button>
            <button class="btn-primary" :disabled="loading" @click="submitFollowupAction">{{ loading ? '保存中…' : '保存' }}</button>
          </div>
        </div>
      </div>

      <!-- 需求变更：直接改当前需求快照，留痕到时间线 -->
      <div class="df-mask" v-if="actionType === 'needs'" @click="closeAction">
        <div class="df-sheet" @click.stop>
          <div class="df-handle"></div>
          <div class="df-title">{{ customerName }}<span class="df-title-sub"> · 需求变更</span></div>
          <div class="df-block">
            <div class="df-field df-field-wide">
              <label>当前需求</label>
              <textarea class="df-input" v-model.trim="needsDraft" rows="3" placeholder="客户当前关注点，如：黑色SUV，预算40万，GLC/X3 对比中" maxlength="2000"></textarea>
            </div>
          </div>
          <div class="df-btns">
            <button class="btn-plain" @click="closeAction">取消</button>
            <button class="btn-primary" :disabled="loading" @click="submitNeedsAction">{{ loading ? '保存中…' : '保存' }}</button>
          </div>
        </div>
      </div>

      <!-- 标记重点：建议带一句需求（无需求时必填） -->
      <div class="df-mask" v-if="actionType === 'priority'" @click="closeAction">
        <div class="df-sheet" @click.stop>
          <div class="df-handle"></div>
          <div class="df-title">{{ customerName }}<span class="df-title-sub"> · 标记重点</span></div>
          <div class="df-block">
            <div class="df-field df-field-wide">
              <label>当前需求{{ currentNeeds ? '（选填，已有一份）' : '' }}</label>
              <textarea class="df-input" v-model.trim="priorityDraft" rows="3" :placeholder="currentNeeds ? '不填则沿用现有需求' : '写清客户当前需求'" maxlength="2000"></textarea>
            </div>
          </div>
          <div class="df-tab-hint">填写的需求会同步为一条跟进记录</div>
          <div class="df-btns">
            <button class="btn-plain" @click="closeAction">取消</button>
            <button class="btn-primary" :disabled="loading" @click="submitPriorityAction">{{ loading ? '保存中…' : '标为重点' }}</button>
          </div>
        </div>
      </div>

      <!-- 成交表单（结构化字段，不由 AI 拆解）：车辆区与两地牌区同时显示、互不干扰 -->
      <div class="df-mask" v-if="showDealForm" @click="showDealForm = false">
        <div class="df-sheet" @click.stop>
          <div class="df-handle"></div>
          <div class="df-title">{{ customerName }}<span class="df-title-sub"> · {{ editingDeal ? '编辑成交' : '添加成交' }}</span></div>

          <div class="df-tabs" v-if="!editingDeal">
            <button type="button" class="df-tab" :class="{ active: activeTab === 'vehicle' }" @click="activeTab = 'vehicle'">
              <svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9-1.8-.5-4.5-1.1-4.5-1.1s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.5 2.8C1.4 12.4 1 13.2 1 14v2c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/><path d="M9 17h6"/></svg>车辆
            </button>
            <button type="button" class="df-tab" :class="{ active: activeTab === 'plate' }" @click="activeTab = 'plate'">
              <svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="20" height="12" rx="2"/><line x1="6" y1="10" x2="10" y2="10"/><line x1="6" y1="14" x2="9" y2="14"/><line x1="14" y1="14" x2="18" y2="14"/></svg>两地牌
            </button>
          </div>
          <div class="df-tab-hint" v-if="!editingDeal">两个 Tab 都填，会同时记录两条成交</div>

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

// ── 动态时间线：跟进（邀约/需求/重点留痕）+ 到店（含成交到店）合并倒序 ──
// 到店自动生成的跟进留痕（"到店：xxx"）由到店条目代表，不重复展示
const timeline = computed(() => {
  const entries = []
  for (const f of followups.value) {
    if (/^到店(:|：|未成交：)/.test(f.content)) continue
    let tagLabel = '跟进', tagClass = 't-followup'
    if (/^更新需求：/.test(f.content)) { tagLabel = '需求'; tagClass = 't-needs' }
    else if (/^需求已随跟进自动更新：/.test(f.content)) { tagLabel = '需求'; tagClass = 't-needs-auto' }
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
  return entries.sort((a, b) => String(b.ts).localeCompare(String(a.ts)))
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

// ── 动作入口：三大操作 + 需求变更，直接开对应表单 ──────────
function openVisitEntry() {
  resetVisitForm()
  editingVisit.value = null
  actionType.value = 'visit'
}
function openFollowupEntry() {
  followupDraft.value = ''
  actionType.value = 'followup'
}
function openNeedsEntry() {
  needsDraft.value = currentNeeds.value
  actionType.value = 'needs'
}
function openPriorityEntry() {
  priorityDraft.value = ''
  actionType.value = 'priority'
}
function closeAction() {
  actionType.value = null
}

// 头部⭐：已重点 → 走取消确认；未重点 → 打开标记重点表单
function onStarTap() {
  if (props.customer.is_priority) confirmRemovePriority()
  else openAction('priority')
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
      actionType.value = null
      showDealForm.value = false
      editingVisit.value = null
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
    // 需求默认带入当前需求，减少重复输入
    needs: currentNeeds.value || '',
    remark: '',
  })
}

function openVisitForm(visitRow) {
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
    // 新增到店后端会自动标重点并同步当前需求快照，本地同步保持界面即时
    if (!editingVisit.value && props.customer) {
      props.customer.is_priority = true
      if (needs) props.customer.current_needs = needs
      currentNeeds.value = needs || currentNeeds.value
    }
    await loadData()
    emit('updated')
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

// ── 跟进：一句话内容，AI 自动比对需求快照 ────────────────
async function submitFollowupAction() {
  const content = followupDraft.value.trim()
  if (!content) return showToast('请填写跟进内容')
  loading.value = true
  try {
    const res = await api.post(`/customers/${props.customer.id}/followups`, { content })
    if (res?.needs_updated) {
      currentNeeds.value = res.needs_updated.current_needs
      if (props.customer) props.customer.current_needs = res.needs_updated.current_needs
      showToast(`检测到需求变化，已自动更新${res.needs_updated.reason ? '：' + res.needs_updated.reason : ''}`)
    } else {
      showToast('跟进已记录')
    }
    followupDraft.value = ''
    closeAction()
    await loadData()
    emit('updated')
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

// ── 标记重点：可附一句需求（无需求时必填），同步为跟进 ────
async function submitPriorityAction() {
  const needs = priorityDraft.value.trim()
  if (!needs && !currentNeeds.value) return showToast('建议先写一句当前需求')
  loading.value = true
  try {
    if (needs && needs !== currentNeeds.value) {
      await api.put(`/customers/${props.customer.id}/needs`, { needs, followup: true })
      currentNeeds.value = needs
      if (props.customer) props.customer.current_needs = needs
    }
    await api.put(`/customers/${props.customer.id}/priority`, { is_priority: true })
    if (props.customer) props.customer.is_priority = true
    showToast('已标为重点')
    closeAction()
    await loadData()
    emit('updated')
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
.cdp-title { font-size: 17px; font-weight: 700; color: var(--text-primary); flex: 1; min-width: 0; }
.cdp-health { display: flex; align-items: center; gap: 5px; font-size: 12px; font-weight: 600; flex-shrink: 0; }
.health-dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; }
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
.cdp-star {
  width: 34px; height: 34px; border: 1px solid var(--border-glass); background: var(--bg-primary);
  border-radius: 50%; color: var(--text-tertiary); cursor: pointer; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center; transition: all 0.15s;
}
.cdp-star svg { width: 17px; height: 17px; }
.cdp-star.on { background: var(--orange-light); border-color: rgba(255, 149, 0, 0.4); color: var(--warning); }
.cdp-star:active { transform: scale(0.9); }

.cdp-section { border-top: 1px solid var(--border-glass); padding: 14px 0; }
.sec-head { display: flex; align-items: center; gap: 6px; font-size: 15px; font-weight: 600; color: var(--text-primary); margin-bottom: 12px; }
.sec-icon { width: 15px; height: 15px; flex-shrink: 0; }
.ic-danger { color: var(--danger); }
.ic-blue { color: var(--primary); }
.ic-green { color: var(--success); }
.sec-count { font-size: 13px; font-weight: 500; color: var(--text-secondary); }
.sec-total { margin-left: auto; font-size: 13px; font-weight: 600; color: #EA580C; }
.btn-add { margin-left: 8px; padding: 5px 12px; border-radius: 16px; background: var(--primary); color: #fff; font-size: 13px; font-weight: 600; border: none; cursor: pointer; white-space: nowrap; }
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

/* ── 三大主操作按钮行 ── */
.act-row { display: flex; gap: 8px; margin-bottom: 12px; }
.act-chip {
  flex: 1; display: flex; align-items: center; justify-content: center; gap: 5px;
  padding: 12px 6px; border-radius: 13px; border: 1.5px solid rgba(0, 122, 255, 0.4);
  background: var(--primary-light); color: var(--primary);
  font-size: 13.5px; font-weight: 700; font-family: inherit; cursor: pointer;
  transition: all 0.15s; min-width: 0;
}
.act-chip .act-ic { font-size: 15px; line-height: 1; }
.act-chip:active { transform: scale(0.96); opacity: 0.8; }
.act-chip.star { border-color: rgba(255, 149, 0, 0.45); background: var(--orange-light); color: #EA580C; }

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

/* ── 表单覆盖层（动作表单 / 成交表单共用）── */
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
.btn-primary { background: var(--primary); color: #fff; border: none; }
.btn-plain { background: var(--surface); color: var(--text-secondary); border: 1px solid var(--border-glass); }
.btn-submit:disabled, .df-btns button:disabled { opacity: 0.5; }

/* PC：居中自适应大弹窗 —— 宽度 min(1160px, 94vw)，屏幕越小相对越宽；
   内容分双列（需求+动态 | 成交），头部固定，内容区滚动 */
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

  /* PC 无滚动抽屉，头部不需要吸顶/分隔线，保持原静态布局 */
  .cdp-header {
    position: static; top: auto;
    background: transparent; border-bottom: 1px solid var(--border-glass); box-shadow: none;
    padding: 20px 28px 12px; margin-bottom: 0;
    flex-shrink: 0;
  }
  .cdp-title { font-size: 19px; }
  .cdp-loading { padding: 16px 28px 6px; }

  .cdp-body {
    flex: 1;
    min-height: 0;
    display: grid;
    grid-template-columns: 1.15fr 1fr;
    column-gap: 30px;
    padding: 0 28px;
    overflow-y: auto;
    align-items: start;
  }
  .cdp-col { min-width: 0; }
  .cdp-col .cdp-section { border-top: none; border-bottom: 1px solid var(--border-glass); padding: 6px 0 16px; }
  .cdp-col .cdp-section:last-child { border-bottom: none; }
  .need-summary { margin-top: 14px; }

  .btn-add:hover { filter: brightness(1.08); }
  .need-btn:hover, .ns-edit:hover { filter: brightness(0.97); }
  .deal-ops span:hover { color: var(--primary); }
  .deal-ops span.danger:hover { color: var(--danger); }
  .tl-ops span:hover { color: var(--primary); }
  .tl-ops span.danger:hover { color: var(--danger); }
  .act-chip:hover { border-color: var(--primary); filter: brightness(1.02); }

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
  /* 动作选择：PC 三列 */
}
</style>
