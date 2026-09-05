<template>
  <div class="mine-page">
    <!-- 账号卡 -->
    <div class="profile-card">
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
      <div class="profile-info">
        <div v-if="isAdmin" class="profile-name">{{ userInfo?.nickname || '管理员' }}</div>
        <div v-else class="name-edit-wrapper">
          <input
            class="profile-name-input"
            v-model="editNickname"
            placeholder="点击设置昵称"
            @blur="onNicknameBlur"
            @keyup.enter="onNicknameBlur"
          />
        </div>
        <div class="profile-id">ID: {{ userInfo?.user_id }} · {{ isAdmin ? '管理员' : '已登录' }}</div>
      </div>
    </div>

    <!-- 设置列表 -->
    <div class="menu-list">
      <!-- 外观模式（夜间模式三档切换：浅色 / 深色 / 日出日落自动） -->
      <div class="menu-item">
        <div class="menu-icon" style="background:var(--indigo-light);color:var(--indigo)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg></div>
        <div class="menu-text">外观</div>
        <div class="appearance-seg">
          <button :class="{ on: mode === 'light' }" @click="setMode('light')">浅色</button>
          <button :class="{ on: mode === 'dark' }" @click="setMode('dark')">深色</button>
          <button :class="{ on: mode === 'auto' }" @click="setMode('auto')">日落</button>
        </div>
      </div>
      <!-- 管理员数据范围（移动端唯一切换入口，PC 端在侧边栏，两处共享同一状态） -->
      <div class="menu-item scope-item" v-if="isAdmin">
        <div class="menu-icon" style="background:var(--blue-light);color:var(--primary)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg></div>
        <div class="menu-text">数据范围</div>
        <select class="scope-select" :value="scopeValue" @change="onScopeChange">
          <option value="all">全部用户</option>
          <option v-for="u in users" :key="u.id" :value="u.id">{{ u.nickname }}</option>
        </select>
      </div>
      <div class="menu-item">
        <div class="menu-icon" style="background:var(--orange-light);color:var(--warning)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg></div>
        <div class="menu-text">关于系统</div>
        <div class="menu-value">v2.0.0</div>
      </div>
    </div>
    <div class="appearance-hint" v-if="mode === 'auto'">
      每天 18:30 至次日 06:30 自动进入夜间模式
    </div>

    <!-- 退出登录（低风险操作，无二次确认） -->
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
// 上传期间用本地 objectURL 预览，服务器返回 URL 后再切换
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

  // 10MB 硬上限，避免直接把超大图喂给 canvas 导致 OOM
  if (!file.type.startsWith('image/')) {
    showToast('请选择图片文件')
    e.target.value = ''
    return
  }
  if (file.size > 10 * 1024 * 1024) {
    showToast('图片过大，请选择 10MB 以内的图片')
    e.target.value = ''
    return
  }

  avatarUploading.value = true
  // 立即用本地 objectURL 预览，让用户感知到响应
  const previewUrl = URL.createObjectURL(file)
  localPreviewUrl.value = previewUrl

  try {
    // 前端压缩到 ≤2MB，对齐后端 MAX_AVATAR_SIZE
    const compressed = await compressImage(file)
    const formData = new FormData()
    formData.append('file', compressed.file)

    const res = await api.post('/user/avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
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
    // 后端只返回 { id, nickname, avatar_url }，展开保留本地其余字段（user_id/role 等）
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
  resetScope() // 清掉管理员数据范围，避免残留给下一个登录账号
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
  background: var(--bg-primary);
  padding: 18px 14px 80px;
}

/* Profile Card */
.profile-card {
  background: var(--bg-card);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid var(--border-glass);
  border-radius: 18px;
  padding: 24px 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 14px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.04);
}
.avatar-wrapper { position: relative; cursor: pointer; }
.avatar {
  width: 60px;
  height: 60px;
  border-radius: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  font-weight: 700;
  overflow: hidden;
}
.avatar-img { width: 100%; height: 100%; object-fit: cover; }
.avatar-badge {
  position: absolute;
  bottom: -2px;
  right: -2px;
  width: 22px;
  height: 22px;
  background: var(--surface);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.15);
}
.avatar-badge svg { width: 12px; height: 12px; color: var(--primary); }
.avatar-loading {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-glass);
  backdrop-filter: blur(2px);
  -webkit-backdrop-filter: blur(2px);
  border-radius: 18px;
  pointer-events: none;
}
.spinner {
  width: 22px;
  height: 22px;
  border: 2.5px solid var(--primary-light);
  border-top-color: var(--primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
.profile-info { flex: 1; min-width: 0; }
.profile-name { font-size: 18px; font-weight: 700; color: var(--text-primary); }
.profile-name-input {
  width: 100%;
  font-size: 18px;
  font-weight: 700;
  color: var(--text-primary);
  border: none;
  outline: none;
  background: transparent;
  padding: 0;
  font-family: inherit;
}
.profile-name-input::placeholder { color: var(--text-tertiary); }
.profile-id { font-size: 12px; color: var(--text-secondary); margin-top: 4px; }

/* Menu List */
.menu-list {
  background: var(--bg-card);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid var(--border-glass);
  border-radius: 18px;
  overflow: hidden;
  margin-bottom: 16px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.04);
}
.menu-item {
  display: flex;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-glass);
}
.menu-item:last-child { border-bottom: none; }
.menu-icon {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 12px;
}
.menu-icon svg { width: 18px; height: 18px; }
.menu-text { flex: 1; font-size: 15px; font-weight: 500; color: var(--text-primary); }
.menu-value { font-size: 13px; color: var(--text-tertiary); }
.scope-select {
  border: 1px solid var(--border-glass);
  border-radius: 10px;
  background: var(--surface);
  padding: 7px 10px;
  font-family: inherit;
  font-size: 13px;
  font-weight: 600;
  color: var(--primary);
  outline: none;
  max-width: 150px;
}

/* 外观模式三档切换 */
.appearance-seg {
  display: flex;
  gap: 2px;
  background: var(--bg-primary);
  border-radius: 10px;
  padding: 3px;
}
.appearance-seg button {
  padding: 6px 11px;
  border-radius: 8px;
  border: none;
  background: transparent;
  font-size: 12px;
  font-weight: 600;
  font-family: inherit;
  color: var(--text-secondary);
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}
.appearance-seg button.on {
  background: var(--surface);
  color: var(--primary);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}
.appearance-hint {
  font-size: 11px;
  color: var(--text-tertiary);
  line-height: 1.6;
  padding: 0 4px;
  margin: -8px 0 12px;
}

/* Logout */
.btn-logout {
  width: 100%;
  padding: 16px;
  border-radius: 18px;
  background: var(--surface);
  color: var(--danger);
  font-size: 15px;
  font-weight: 600;
  font-family: inherit;
  box-shadow: 0 2px 12px rgba(0,0,0,0.04);
  border: 1px solid rgba(255, 59, 48, 0.15);
  cursor: pointer;
}
.btn-logout:active { background: var(--bg-primary); }

/* PC 适配 */
@media (min-width: 768px) {
  .mine-page { max-width: 414px; margin: 0 auto; }
}

@media (min-width: 1024px) {
  .mine-page {
    max-width: none;
    margin: 0;
    padding: 24px 28px 40px;
  }
  .profile-card, .menu-list, .btn-logout { max-width: 480px; }
  .menu-item { transition: background 0.2s; }
  .menu-item:hover { background: var(--bg-hover); }
  .btn-logout { cursor: pointer; }
  .btn-logout:hover { background: var(--red-light); }
}
</style>
