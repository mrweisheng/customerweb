<template>
  <div class="mine-page">
    <!-- Bloom Hero -->
    <section class="bloom-hero mine-hero">
      <div class="blob b-coral b-sm" style="top:-30px;right:30%;width:180px;height:180px;"></div>
      <div class="blob b-sun b-sm" style="bottom:-40px;left:18%;width:160px;height:160px;"></div>

      <div class="mine-hero-row">
        <div class="avatar-wrapper" @click="triggerAvatarUpload">
          <div class="avatar" :style="{ background: avatarColor.bg, color: avatarColor.color }">
            <img v-if="displayAvatar" :src="displayAvatar" class="avatar-img" />
            <span v-else>{{ avatarText }}</span>
          </div>
          <div v-if="avatarUploading" class="avatar-loading" aria-label="上传中">
            <div class="spinner"></div>
          </div>
          <div v-if="!isAdmin" class="avatar-badge"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg></div>
        </div>
        <input ref="avatarInput" type="file" accept="image/*" style="display:none" @change="onAvatarChange" />

        <div class="mine-hero-meta">
          <div class="mine-hero-eyebrow">My Account</div>
          <div v-if="isAdmin" class="mine-hero-name">{{ userInfo?.nickname || '管理员' }}</div>
          <div v-else class="name-edit-wrapper">
            <input
              class="mine-hero-name-input"
              v-model="editNickname"
              placeholder="点击设置昵称"
              @blur="onNicknameBlur"
              @keyup.enter="onNicknameBlur"
            />
          </div>
          <div class="mine-hero-id">ID: {{ userInfo?.user_id }} · {{ isAdmin ? '管理员' : '已登录' }}</div>
        </div>
      </div>

      <!-- 三张数据卡：累计线索 / 重点 / 今日回访 -->
      <div class="mine-hero-stats" v-if="!isAdmin">
        <div class="bloom-kpi tint-coral mine-mini-kpi">
          <div class="bloom-kpi-label">Leads</div>
          <div class="bloom-kpi-value mine-mini-value">—<span class="unit">位</span></div>
          <div class="wb-kpi-cap">累计线索</div>
        </div>
        <div class="bloom-kpi tint-mint mine-mini-kpi">
          <div class="bloom-kpi-label">Priority</div>
          <div class="bloom-kpi-value mine-mini-value">—<span class="unit">位</span></div>
          <div class="wb-kpi-cap">重点客户</div>
        </div>
        <div class="bloom-kpi tint-sun mine-mini-kpi">
          <div class="bloom-kpi-label">Today</div>
          <div class="bloom-kpi-value mine-mini-value">—<span class="unit">位</span></div>
          <div class="wb-kpi-cap">今日回访</div>
        </div>
      </div>
    </section>

    <!-- 设置列表 -->
    <div class="menu-list">
      <!-- 外观模式 -->
      <div class="menu-item band band-indigo">
        <div class="menu-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg></div>
        <div class="menu-text">外观</div>
        <div class="appearance-seg">
          <button :class="{ on: mode === 'light' }" @click="setMode('light')">浅色</button>
          <button :class="{ on: mode === 'dark' }" @click="setMode('dark')">深色</button>
          <button :class="{ on: mode === 'auto' }" @click="setMode('auto')">日落</button>
        </div>
      </div>
      <!-- 数据范围（管理员专属） -->
      <div class="menu-item scope-item band band-sky" v-if="isAdmin">
        <div class="menu-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg></div>
        <div class="menu-text">数据范围</div>
        <select class="scope-select" :value="scopeValue" @change="onScopeChange">
          <option value="all">全部用户</option>
          <option v-for="u in users" :key="u.id" :value="u.id">{{ u.nickname }}</option>
        </select>
      </div>
      <!-- 关于 -->
      <div class="menu-item band band-sun">
        <div class="menu-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg></div>
        <div class="menu-text">关于系统</div>
        <div class="menu-value">v2.0.0</div>
      </div>
    </div>
    <div class="appearance-hint" v-if="mode === 'auto'">
      每天 18:30 至次日 06:30 自动进入夜间模式
    </div>

    <button class="btn-logout" @click="doLogout">退出登录</button>

    <div class="toast" v-if="toast.show">{{ toast.message }}</div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import api from '../utils/api'
import { getUserInfo, setUserInfo, clearAuth } from '../utils/auth'
import { getAvatarColor } from '../utils/constants'
import { useToast } from '../composables/useToast'
import { useScope } from '../composables/useScope'
import { useTheme } from '../composables/useTheme'
import { compressImage } from '../utils/imageCompress'

const router = useRouter()
const { toast, showToast } = useToast()
const { scopeUserId, users, isAdmin, setScope, loadUsers, resetScope } = useScope()
const { mode, setMode } = useTheme()

const userInfo = ref(null)
const editNickname = ref('')
const avatarInput = ref(null)
const avatarUploading = ref(false)
const localPreviewUrl = ref('')

const avatarText = computed(() => {
  const name = userInfo.value?.nickname || userInfo.value?.username || 'U'
  return name.charAt(0).toUpperCase()
})
const avatarColor = computed(() => {
  return getAvatarColor(userInfo.value?.nickname || userInfo.value?.username)
})
const avatarUrl = computed(() => {
  if (!userInfo.value?.avatar_url) return ''
  const baseUrl = import.meta.env.VITE_API_BASE
  return baseUrl + userInfo.value.avatar_url
})
const displayAvatar = computed(() => localPreviewUrl.value || avatarUrl.value)
const scopeValue = computed(() => (scopeUserId.value === null ? 'all' : scopeUserId.value))

function onScopeChange(e) {
  const v = e.target.value
  setScope(v === 'all' ? null : Number(v))
  showToast('数据范围已切换')
}

function triggerAvatarUpload() {
  if (isAdmin.value || avatarUploading.value) return
  avatarInput.value?.click()
}

async function onAvatarChange(e) {
  const file = e.target.files[0]
  if (!file) return
  if (!file.type.startsWith('image/')) { showToast('请选择图片文件'); e.target.value = ''; return }
  if (file.size > 10 * 1024 * 1024) { showToast('图片过大，请选择 10MB 以内的图片'); e.target.value = ''; return }
  avatarUploading.value = true
  const previewUrl = URL.createObjectURL(file)
  localPreviewUrl.value = previewUrl
  try {
    const compressed = await compressImage(file)
    const formData = new FormData()
    formData.append('file', compressed.file)
    const res = await api.post('/user/avatar', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
    const updated = { ...userInfo.value, avatar_url: res.avatar_url }
    setUserInfo(updated)
    userInfo.value = updated
    showToast('头像更新成功', 1500)
  } catch (err) {
    showToast(err?.message || '上传失败，请稍后重试')
  } finally {
    URL.revokeObjectURL(previewUrl)
    localPreviewUrl.value = ''
    avatarUploading.value = false
    e.target.value = ''
  }
}

async function onNicknameBlur() {
  if (isAdmin.value) return
  const nickname = editNickname.value.trim()
  if (!nickname || nickname === userInfo.value?.nickname) return
  try {
    const res = await api.put('/user/info', { nickname })
    const updated = { ...userInfo.value, nickname: res.nickname, avatar_url: res.avatar_url }
    setUserInfo(updated)
    userInfo.value = updated
    editNickname.value = updated.nickname || ''
    showToast('昵称更新成功')
  } catch (e) {
    showToast(e.message || '更新失败')
    editNickname.value = userInfo.value?.nickname || ''
  }
}

function doLogout() {
  clearAuth()
  resetScope()
  router.replace('/login')
}

onMounted(() => {
  userInfo.value = getUserInfo()
  editNickname.value = userInfo.value?.nickname || ''
  if (isAdmin.value) loadUsers()
})
</script>

<style scoped>
.mine-page {
  min-height: 100vh;
  background: var(--bloom-canvas);
  padding: 18px 14px calc(80px + env(safe-area-inset-bottom));
}

/* ── Bloom Hero ── */
.mine-hero {
  position: relative;
  padding: 22px 22px 18px;
  margin-bottom: 16px;
  border-radius: 20px;
}
.mine-hero-row {
  position: relative; z-index: 2;
  display: flex; align-items: center; gap: 16px;
}
.avatar-wrapper { position: relative; cursor: pointer; }
.avatar {
  width: 64px; height: 64px; border-radius: 18px;
  display: flex; align-items: center; justify-content: center;
  font-size: 26px; font-weight: 700; overflow: hidden;
  box-shadow: 0 6px 18px -8px rgba(26, 22, 20, 0.18);
}
.avatar-img { width: 100%; height: 100%; object-fit: cover; }
.avatar-badge {
  position: absolute; bottom: -2px; right: -2px;
  width: 22px; height: 22px;
  background: var(--bloom-surface); border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 12px; box-shadow: 0 1px 4px rgba(0,0,0,0.15);
}
.avatar-badge svg { width: 12px; height: 12px; color: var(--bloom-coral); }
.avatar-loading {
  position: absolute; inset: 0;
  display: flex; align-items: center; justify-content: center;
  background: color-mix(in srgb, var(--bloom-surface) 80%, transparent);
  backdrop-filter: blur(2px); -webkit-backdrop-filter: blur(2px);
  border-radius: 18px; pointer-events: none;
}
.spinner {
  width: 22px; height: 22px;
  border: 2.5px solid var(--bloom-coral-soft);
  border-top-color: var(--bloom-coral);
  border-radius: 50%; animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

.mine-hero-meta { flex: 1; min-width: 0; }
.mine-hero-eyebrow {
  font-family: "JetBrains Mono", ui-monospace, monospace;
  font-size: 10.5px; font-weight: 700; letter-spacing: 0.18em;
  color: var(--bloom-coral); margin-bottom: 6px;
}
.mine-hero-name {
  font-family: "DM Serif Display", "Noto Serif SC", Georgia, serif;
  font-size: 26px; font-weight: 400; letter-spacing: -0.01em;
  color: var(--bloom-ink); line-height: 1.15;
}
.mine-hero-name-input {
  width: 100%;
  font-family: "DM Serif Display", "Noto Serif SC", Georgia, serif;
  font-size: 26px; font-weight: 400; letter-spacing: -0.01em;
  color: var(--bloom-ink); line-height: 1.15;
  border: none; outline: none; background: transparent; padding: 0;
}
.mine-hero-name-input::placeholder { color: var(--bloom-ink-3); }
.mine-hero-id {
  font-family: "JetBrains Mono", ui-monospace, monospace;
  font-size: 11px; color: var(--bloom-ink-3); margin-top: 4px;
  letter-spacing: 0.04em;
}

.mine-hero-stats {
  position: relative; z-index: 2;
  display: grid; grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px; margin-top: 16px;
}
.mine-mini-kpi { padding: 14px 14px; }
.mine-mini-value { font-size: 28px; }

/* ── 菜单列表 ── */
.menu-list {
  background: var(--bloom-surface);
  border: 1px solid var(--bloom-rule);
  border-radius: 18px; overflow: hidden;
  box-shadow: 0 2px 12px rgba(26, 22, 20, 0.04);
  margin-bottom: 16px;
}
.menu-item {
  position: relative;
  display: flex; align-items: center;
  padding: 14px 18px;
  border-bottom: 1px solid var(--bloom-rule);
  overflow: hidden;
}
.menu-item:last-child { border-bottom: none; }
/* 左侧 4px 彩色带 */
.menu-item::before {
  content: '';
  position: absolute; left: 0; top: 0; bottom: 0;
  width: 4px;
}
.band.band-indigo::before { background: var(--bloom-indigo, #5856D6); }
.band.band-sky::before    { background: var(--bloom-sky); }
.band.band-sun::before    { background: var(--bloom-sun); }
.band.band-coral::before  { background: var(--bloom-coral); }
.band.band-mint::before   { background: var(--bloom-mint); }
.band.band-lavender::before { background: var(--bloom-lavender); }

.menu-icon {
  width: 32px; height: 32px; border-radius: 9px;
  display: flex; align-items: center; justify-content: center;
  margin-right: 12px;
  background: var(--bloom-canvas-tint); color: var(--bloom-ink-2);
}
.menu-icon svg { width: 18px; height: 18px; }
.band.band-indigo .menu-icon { background: rgba(88, 86, 214, 0.12); color: #5856D6; }
.band.band-sky .menu-icon    { background: var(--bloom-sky-soft); color: var(--bloom-sky-ink); }
.band.band-sun .menu-icon    { background: var(--bloom-sun-soft); color: var(--bloom-sun-ink); }
.band.band-coral .menu-icon  { background: var(--bloom-coral-soft); color: var(--bloom-coral-ink); }
.band.band-mint .menu-icon   { background: var(--bloom-mint-soft); color: var(--bloom-mint-ink); }
.band.band-lavender .menu-icon { background: var(--bloom-lavender-soft); color: var(--bloom-lavender-ink); }

.menu-text { flex: 1; font-size: 15px; font-weight: 500; color: var(--bloom-ink); }
.menu-value { font-size: 13px; color: var(--bloom-ink-3); }
.scope-select {
  border: 1px solid var(--bloom-rule);
  border-radius: 10px; background: var(--bloom-surface-tinted);
  padding: 7px 10px;
  font-family: inherit; font-size: 14px;
  font-weight: 600; color: var(--bloom-sky-ink);
  outline: none; max-width: 150px;
}

.appearance-seg {
  display: flex; gap: 2px;
  background: var(--bloom-canvas-tint);
  border-radius: 10px; padding: 3px;
}
.appearance-seg button {
  padding: 6px 11px; border-radius: 8px; border: none;
  background: transparent;
  font-size: 12px; font-weight: 600; font-family: inherit;
  color: var(--bloom-ink-2); cursor: pointer;
  transition: background var(--bloom-t-fast) var(--bloom-ease-out),
              color var(--bloom-t-fast) var(--bloom-ease-out);
}
.appearance-seg button.on {
  background: var(--bloom-surface); color: var(--bloom-coral);
  box-shadow: 0 1px 3px rgba(26, 22, 20, 0.08);
}

.appearance-hint {
  font-size: 11px; color: var(--bloom-ink-3);
  line-height: 1.6; padding: 0 4px; margin: -8px 0 12px;
}

.btn-logout {
  width: 100%; padding: 16px;
  border-radius: 18px;
  background: var(--bloom-surface);
  color: var(--bloom-coral-ink);
  font-size: 15px; font-weight: 600; font-family: inherit;
  border: 1px solid var(--bloom-coral-soft);
  box-shadow: 0 2px 12px rgba(26, 22, 20, 0.04);
  cursor: pointer;
  transition: background var(--bloom-t-fast) var(--bloom-ease-out);
}
.btn-logout:active { background: var(--bloom-coral-soft); }

@media (min-width: 768px) { .mine-page { max-width: 414px; margin: 0 auto; } }

@media (min-width: 1024px) {
  .mine-page { max-width: none; margin: 0; padding: 24px 28px 40px; }
  .mine-hero { padding: 28px 30px 22px; }
  .profile-card, .menu-list, .btn-logout { max-width: 480px; }
  .menu-item { transition: background 0.2s; }
  .menu-item:hover { background: var(--bloom-surface-hover); }
  .btn-logout:hover { background: var(--bloom-coral-soft); }
}
</style>
