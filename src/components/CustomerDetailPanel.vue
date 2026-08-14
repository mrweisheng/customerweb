﻿<template>
  <!-- 客户详情/操作面板：跟进记录(追加式) + 成交记录(车辆/两地牌) + 重点开关 -->
  <div class="cdp-mask" v-if="show" @click="close">
    <div class="cdp-sheet" @click.stop>
      <div class="cdp-handle"></div>

      <!-- 头部：客户名 + 健康度 -->
      <div class="cdp-header">
        <div class="cdp-title">{{ customerName }}</div>
        <button class="cdp-close" @click="close">×</button>
      </div>
      <div class="cdp-health" v-if="customer.last_visit_at !== undefined">
        <span class="health-dot" :class="visit.class"></span>
        <span :class="visit.class">{{ visit.text }}</span>
      </div>

      <!-- 跟进记录（时间线，追加不覆盖） -->
      <div class="cdp-section">
        <div class="sec-head">
          <span class="sec-icon">📋</span>跟进记录
          <span class="sec-count">{{ followups.length }}</span>
        </div>
        <div class="fu-list" v-if="followups.length">
          <div class="fu-item" v-for="f in followups" :key="f.id">
            <div class="fu-time">{{ formatTime(f.created_at) }}</div>
            <div class="fu-content">{{ f.content }}</div>
          </div>
        </div>
        <!-- 无任何记录时输入框充当"客户需求"；有记录时才显示「提交」按钮追加跟进 -->
        <div class="fu-input-wrap">
          <textarea
            class="fu-input"
            v-model="newFollowup"
            :placeholder="hasAnyRecord ? '输入本次跟进内容...' : '请写明客户需求（标记重点时作为备注）'"
            rows="2"
          ></textarea>
          <button v-if="hasAnyRecord" class="btn-submit" @click="submitFollowup" :disabled="loading">
            {{ loading ? '提交中' : '提交' }}
          </button>
        </div>
      </div>

      <!-- 到店记录（到店时间 / 需求 / 是否成交） -->
      <div class="cdp-section">
        <div class="sec-head">
          <span class="sec-icon">📍</span>到店记录
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
                <span v-if="v.visit_time">📅 {{ v.visit_time }}</span>
                <span class="visit-deal-sum" v-if="v.is_deal && dealSummary(v.deal_id)">💰 {{ dealSummary(v.deal_id) }}</span>
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
        <div v-else class="sec-empty">暂无到店记录，点击「+ 登记」记录客户到店时间、需求与成交情况</div>
      </div>

      <!-- 成交记录（车辆 / 两地牌） -->
      <div class="cdp-section">
        <div class="sec-head">
          <span class="sec-icon">💰</span>成交记录
          <span class="sec-count">{{ deals.length }}</span>
          <span class="sec-total" v-if="totalAmount">累计 ¥{{ totalAmount }}</span>
          <button class="btn-add" @click="openDealForm(null)">+ 添加</button>
        </div>
        <div class="deal-list" v-if="deals.length">
          <div class="deal-item" v-for="d in deals" :key="d.id">
            <div class="deal-tag" :class="d.deal_type">
              {{ d.deal_type === 'vehicle' ? '🚗 车辆' : '🚦 两地牌' }}
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
                <span v-if="d.deal_time">📅 {{ d.deal_time }}</span>
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

      <!-- 底部操作：重点开关 -->
      <div class="cdp-actions">
        <button v-if="customer.is_priority" class="btn-danger" @click="confirmRemovePriority">
          取消重点
        </button>
        <button v-else class="btn-primary" @click="addPriority">
          标注为重点
        </button>
      </div>

      <!-- 成交表单（全屏覆盖层）：车辆区与两地牌区同时显示、互不干扰 -->
      <div class="df-mask" v-if="showDealForm" @click="showDealForm = false">
        <div class="df-sheet" @click.stop>
          <div class="df-handle"></div>
          <div class="df-title">{{ customerName }}<span class="df-title-sub"> · {{ editingDeal ? '编辑成交' : '添加成交' }}</span></div>

          <!-- Tab 切换（仅新增模式；切换时各 Tab 数据各自保留，互不丢失） -->
          <div class="df-tabs" v-if="!editingDeal">
            <button type="button" class="df-tab" :class="{ active: activeTab === 'vehicle' }" @click="activeTab = 'vehicle'">
              <span>🚗</span>车辆
            </button>
            <button type="button" class="df-tab" :class="{ active: activeTab === 'plate' }" @click="activeTab = 'plate'">
              <span>🚦</span>两地牌
            </button>
          </div>
          <div class="df-tab-hint" v-if="!editingDeal">两个 Tab 都填，会同时记录两条成交</div>

          <!-- 🚗 车辆字段（当前 Tab=车辆 或 编辑车辆类型时显示） -->
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
            <div class="df-field">
              <label>备注</label>
              <input class="df-input" v-model.trim="formVehicle.remark" placeholder="选填" />
            </div>
          </div>

          <!-- 🚦 两地牌字段（当前 Tab=两地牌 或 编辑两地牌类型时显示） -->
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
            <button class="btn-cancel" @click="showDealForm = false">取消</button>
            <button class="btn-primary" @click="submitDeal">保存</button>
          </div>
        </div>
      </div>

      <!-- 到店登记表单（全屏覆盖层）：仅录入「未成交到店」，成交到店由成交记录自动生成 -->
      <div class="df-mask" v-if="showVisitForm" @click="showVisitForm = false">
        <div class="df-sheet" @click.stop>
          <div class="df-handle"></div>
          <div class="df-title">{{ customerName }}<span class="df-title-sub"> · {{ editingVisit ? '编辑到店' : '到店登记' }}</span></div>

          <div class="df-block">
            <div class="df-field">
              <label>到店时间</label>
              <input class="df-input" type="date" v-model="formVisit.visit_time" />
            </div>
            <div class="df-field">
              <label>需求{{ editingVisit && editingVisit.is_deal ? '（选填）' : '（必填，将作为重点客户备注）' }}</label>
              <textarea
                class="df-input"
                v-model.trim="formVisit.needs"
                rows="2"
                placeholder="请写清楚客户需求"
              ></textarea>
            </div>
            <div class="df-field">
              <label>备注</label>
              <input class="df-input" v-model.trim="formVisit.remark" placeholder="选填" />
            </div>
          </div>
          <div class="df-tab-hint" v-if="editingVisit && editingVisit.is_deal">该到店由成交记录自动生成，需求/备注可补充；成交详情请在「成交记录」中编辑</div>

          <div class="df-btns">
            <button class="btn-cancel" @click="showVisitForm = false">取消</button>
            <button class="btn-primary" @click="submitVisit">保存</button>
          </div>
        </div>
      </div>

      <!-- 确认弹窗（取消重点 / 删除成交） -->
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

      <div class="cdp-toast" v-if="toast.show">{{ toast.message }}</div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue'
import api from '../utils/api'
import { calcVisitStatus } from '../utils/constants'
import ConfirmDialog from './ConfirmDialog.vue'

// 两地牌口岸（业务固定 4 个）
const PORTS = ['深圳湾', '莲塘', '沙头角', '港珠澳']

const props = defineProps({
  show: { type: Boolean, default: false },
  customer: { type: Object, default: () => ({}) },
})
const emit = defineEmits(['update:show', 'updated'])

const followups = ref([])
const deals = ref([])
const visits = ref([])
const newFollowup = ref('')
const loading = ref(false)

// 成交表单：车辆区 / 两地牌区 各自独立，互不干扰；共用时间与备注
const showDealForm = ref(false)
const editingDeal = ref(null)
const activeTab = ref('vehicle')   // 'vehicle' | 'plate'，控制成交表单 Tab 切换
const formVehicle = reactive({ vin: '', vehicle_desc: '', amount: '', deal_time: today(), remark: '' })
const formPlate = reactive({ port: '', plate_kind: '期牌', plate_number: '', amount: '', deal_time: today(), remark: '' })

// 到店登记表单：仅录「未成交到店」（到店时间 / 需求 / 备注）；成交到店由成交记录自动生成
const showVisitForm = ref(false)
const editingVisit = ref(null)
const formVisit = reactive({ visit_time: today(), needs: '', remark: '' })

const toast = reactive({ show: false, message: '' })
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

// 客户是否已有任何记录（跟进/到店/成交）：决定跟进输入框的语义与是否显示「提交」按钮
const hasAnyRecord = computed(() =>
  followups.value.length > 0 || visits.value.length > 0 || deals.value.length > 0
)

function showToast(message, duration = 2000) {
  toast.message = message
  toast.show = true
  setTimeout(() => { toast.show = false }, duration)
}
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
  try {
    const [f, d, v] = await Promise.all([
      api.get(`/customers/${id}/followups`),
      api.get(`/customers/${id}/deals`),
      api.get(`/customers/${id}/visits`),
    ])
    followups.value = f || []
    deals.value = d || []
    visits.value = v || []
  } catch (e) {
    showToast(e.message || '加载失败')
  }
}

watch(
  () => [props.show, props.customer?.id],
  ([isShow]) => {
    if (isShow) {
      newFollowup.value = ''
      showDealForm.value = false
      showVisitForm.value = false
      loadData()
    }
  }
)

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
  const cid = props.customer.id
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
    await loadData()
    emit('updated')
  } catch (e) {
    showToast(e.message || '保存失败')
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

// ── 到店记录（手工录入仅「未成交」；成交到店由成交记录自动生成）──
function resetVisitForm() {
  Object.assign(formVisit, { visit_time: today(), needs: '', remark: '' })
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
  const cid = props.customer.id
  const needs = formVisit.needs.trim()
  // 新增（未成交）需求必填；编辑已成交到店时需求可不填
  const editingDealt = editingVisit.value && editingVisit.value.is_deal
  if (!editingDealt && !needs) return showToast('请填写需求')
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
    await loadData()
    emit('updated')
  } catch (e) {
    showToast(e.message || '保存失败')
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
  // 无任何记录时：必须先在输入框写明客户需求，输入框内容会作为重点备注（后端自动追加一条跟进历史）
  if (!hasAnyRecord.value) {
    const reason = newFollowup.value.trim()
    if (!reason) {
      showToast('请先填写客户需求')
      return
    }
    try {
      await api.put(`/customers/${props.customer.id}/priority`, {
        is_priority: true,
        remark: reason,
      })
      newFollowup.value = ''
      showToast('已标注为重点')
      emit('update:show', false)
      emit('updated')
    } catch (e) {
      showToast(e.message || '操作失败')
    }
    return
  }
  // 有记录：保持原逻辑（直接标记重点）
  try {
    await api.put(`/customers/${props.customer.id}/priority`, { is_priority: true })
    showToast('已标注为重点')
    emit('update:show', false)
    emit('updated')
  } catch (e) {
    showToast(e.message || '操作失败')
  }
}
</script>

<style scoped>
.cdp-mask {
  position: fixed; inset: 0; background: rgba(0, 0, 0, 0.3);
  display: flex; align-items: flex-end; justify-content: center; z-index: 1000;
}
.cdp-sheet {
  width: 100%; background: #fff; border-radius: 20px 20px 0 0; padding: 20px;
  padding-bottom: calc(20px + env(safe-area-inset-bottom));
  max-height: 96vh; overflow-y: auto; position: relative;
}
.cdp-handle { width: 36px; height: 4px; border-radius: 2px; background: rgba(0,0,0,0.12); margin: 0 auto 14px; }

.cdp-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px; }
.cdp-title { font-size: 17px; font-weight: 700; color: var(--text-primary); }
.cdp-close { width: 30px; height: 30px; border: none; background: rgba(0,0,0,0.06); border-radius: 50%; font-size: 20px; color: var(--text-secondary); cursor: pointer; line-height: 1; }
.cdp-health { display: flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 600; margin-bottom: 14px; }
.health-dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; }
.cdp-health .success, .health-dot.success { color: #34C759; background: #34C759; }
.cdp-health .warning, .health-dot.warning { color: #FF9500; background: #FF9500; }
.cdp-health .danger, .health-dot.danger { color: #FF3B30; background: #FF3B30; }
.cdp-health .success, .cdp-health .warning, .cdp-health .danger { background: none; }

.cdp-section { border-top: 1px solid var(--border-glass); padding: 14px 0; }
.sec-head { display: flex; align-items: center; gap: 6px; font-size: 15px; font-weight: 600; color: var(--text-primary); margin-bottom: 12px; }
.sec-icon { font-size: 16px; }
.sec-count { font-size: 13px; font-weight: 500; color: var(--text-secondary); }
.sec-total { margin-left: auto; font-size: 13px; font-weight: 600; color: #EA580C; }
.btn-add { margin-left: 8px; padding: 5px 12px; border-radius: 16px; background: var(--primary); color: #fff; font-size: 13px; font-weight: 600; border: none; cursor: pointer; white-space: nowrap; }
.sec-empty { font-size: 14px; color: var(--text-tertiary); padding: 8px 0; line-height: 1.6; }

/* 跟进时间线 */
.fu-list { display: flex; flex-direction: column; gap: 10px; margin-bottom: 12px; }
.fu-item { background: var(--bg-primary); border-radius: 12px; padding: 10px 12px; }
.fu-time { font-size: 12px; font-weight: 600; color: var(--text-tertiary); margin-bottom: 3px; }
.fu-content { font-size: 14px; color: var(--text-primary); line-height: 1.5; word-break: break-all; }
.fu-input-wrap { display: flex; gap: 8px; align-items: flex-end; }
.fu-input { flex: 1; padding: 11px; border: 1px solid var(--border-glass); border-radius: 12px; font-size: 14px; color: var(--text-primary); resize: none; font-family: inherit; }
.fu-input:focus { border-color: var(--primary); outline: none; }
.btn-submit { padding: 11px 18px; border-radius: 12px; background: var(--primary); color: #fff; font-size: 14px; font-weight: 600; border: none; cursor: pointer; white-space: nowrap; }
.btn-submit:disabled { opacity: 0.5; }

/* 成交列表 */
.deal-list { display: flex; flex-direction: column; gap: 10px; }
.deal-item { display: flex; gap: 10px; background: var(--bg-primary); border-radius: 12px; padding: 11px; }
.deal-tag { flex-shrink: 0; align-self: flex-start; font-size: 12px; font-weight: 700; padding: 4px 9px; border-radius: 7px; }
.deal-tag.vehicle { background: rgba(0,122,255,0.1); color: #007AFF; }
.deal-tag.plate { background: rgba(175,82,222,0.1); color: #AF52DE; }
.deal-body { flex: 1; min-width: 0; }
.deal-main { font-size: 15px; font-weight: 600; color: var(--text-primary); }
.deal-sub { font-size: 13px; color: var(--text-secondary); margin-top: 2px; word-break: break-all; }
.deal-meta { display: flex; gap: 10px; margin-top: 4px; font-size: 12px; color: var(--text-tertiary); }
.deal-amount { color: #EA580C; font-weight: 700; }
.deal-remark { font-size: 13px; color: var(--text-secondary); margin-top: 3px; }
.deal-ops { display: flex; flex-direction: column; gap: 10px; flex-shrink: 0; font-size: 13px; font-weight: 600; color: var(--text-secondary); }
.deal-ops span { cursor: pointer; }
.deal-ops span:active { opacity: 0.5; }
.deal-ops .danger { color: var(--danger); }

/* 到店列表 */
.visit-list { display: flex; flex-direction: column; gap: 10px; }
.visit-item { display: flex; gap: 10px; background: var(--bg-primary); border-radius: 12px; padding: 11px; }
.visit-tag { flex-shrink: 0; align-self: flex-start; font-size: 12px; font-weight: 700; padding: 4px 9px; border-radius: 7px; white-space: nowrap; }
.visit-tag.dealt { background: rgba(52,199,89,0.12); color: #34C759; }
.visit-tag.not-dealt { background: rgba(255,149,0,0.12); color: #FF9500; }
.visit-body { flex: 1; min-width: 0; }
.visit-needs { font-size: 14px; color: var(--text-primary); line-height: 1.5; word-break: break-all; margin-top: 2px; }
.visit-needs.empty { color: var(--text-tertiary); font-size: 13px; }
.visit-deal-sum { color: #EA580C; font-weight: 700; }

/* 底部操作 */
.cdp-actions { padding-top: 14px; }
.cdp-actions button { width: 100%; padding: 14px; border-radius: 14px; font-size: 15px; font-weight: 600; cursor: pointer; }
.btn-danger { background: #fff; color: var(--danger); border: 1px solid rgba(255,59,48,0.3); }
.btn-primary { background: var(--primary); color: #fff; border: none; }
.btn-cancel { background: #fff; color: var(--text-secondary); border: 1px solid var(--border-glass); }

/* 成交表单：全屏覆盖，宽敞 */
.df-mask {
  position: fixed; inset: 0; background: rgba(0, 0, 0, 0.4);
  display: flex; align-items: flex-end; justify-content: center; z-index: 2000;
}
.df-sheet {
  width: 100%; background: #fff; border-radius: 20px 20px 0 0;
  padding: 20px 20px calc(20px + env(safe-area-inset-bottom));
  max-height: 96vh; overflow-y: auto;
}
.df-handle { width: 36px; height: 4px; border-radius: 2px; background: rgba(0,0,0,0.12); margin: 0 auto 14px; }
.df-title { font-size: 19px; font-weight: 700; color: var(--text-primary); margin-bottom: 12px; }
.df-title-sub { font-size: 15px; font-weight: 500; color: var(--text-secondary); }

/* Tab 切换（车辆 / 两地牌） */
.df-tabs { display: flex; gap: 4px; background: var(--bg-primary); border-radius: 13px; padding: 4px; margin-bottom: 8px; }
.df-tab { flex: 1; padding: 12px; border: none; background: transparent; border-radius: 10px; font-size: 15px; font-weight: 600; color: var(--text-secondary); cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 5px; }
.df-tab span { font-size: 17px; }
.df-tab.active { background: #fff; color: var(--primary); box-shadow: 0 1px 4px rgba(0,0,0,0.1); }
.df-tab-hint { font-size: 12px; color: var(--text-tertiary); margin-bottom: 14px; }

.df-block { background: var(--bg-primary); border-radius: 14px; padding: 14px; margin-bottom: 12px; }
.df-block.common { background: rgba(255,149,0,0.06); }
.df-block-head { display: flex; align-items: center; gap: 6px; font-size: 15px; font-weight: 700; color: var(--text-primary); margin-bottom: 12px; }
.df-block-emoji { font-size: 17px; }

.df-field { display: flex; flex-direction: column; gap: 5px; margin-bottom: 10px; }
.df-field:last-child { margin-bottom: 0; }
.df-field > label { font-size: 12px; font-weight: 600; color: var(--text-secondary); }
.df-input {
  width: 100%; padding: 13px 14px; border: 1px solid var(--border-glass); border-radius: 12px;
  font-size: 16px; color: var(--text-primary); font-family: inherit; background: #fff; box-sizing: border-box;
}
.df-input:focus { border-color: var(--primary); outline: none; }

/* 期牌/现牌 分段选择 */
.df-seg { display: flex; gap: 8px; }
.df-seg button {
  flex: 1; padding: 11px; border-radius: 11px; background: #fff; color: var(--text-secondary);
  font-size: 14px; font-weight: 600; border: 1px solid var(--border-glass); cursor: pointer;
}
.df-seg button.active { background: rgba(255,149,0,0.12); color: var(--primary); border-color: var(--primary); }

.df-btns { display: flex; gap: 10px; margin-top: 6px; }
.df-btns button { flex: 1; padding: 14px; border-radius: 14px; font-size: 15px; font-weight: 600; cursor: pointer; }

.cdp-toast { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: rgba(0,0,0,0.78); color: #fff; padding: 11px 22px; border-radius: 10px; font-size: 14px; z-index: 9999; }

/* PC：面板与表单都居中放大 */
@media (min-width: 1024px) {
  .cdp-mask { align-items: center; background: rgba(0,0,0,0.4); }
  .cdp-sheet { width: 760px; max-width: calc(100vw - 48px); border-radius: 18px; padding: 34px; max-height: calc(100vh - 80px); box-shadow: 0 24px 60px rgba(0,0,0,0.25); }
  .cdp-handle { display: none; }

  .df-mask { align-items: center; }
  .df-sheet { width: 760px; max-width: calc(100vw - 48px); border-radius: 18px; padding: 34px; max-height: calc(100vh - 80px); box-shadow: 0 24px 60px rgba(0,0,0,0.25); }
  .df-handle { display: none; }
}
</style>
