<template>
  <div class="mine-page">
    <!-- 未登录 -->
    <div v-if="!loggedIn" class="login-prompt">
      <div class="prompt-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="#007AFF" stroke-width="2" width="48" height="48">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
          <circle cx="12" cy="7" r="4"></circle>
        </svg>
      </div>
      <div class="prompt-title">欢迎使用客户管理</div>
      <div class="prompt-desc">登录后即可管理您的客户资源</div>
      <button class="btn-login" @click="goToLogin">立即登录</button>
    </div>

    <!-- 已登录 -->
    <div v-else class="user-section">
      <div class="profile-card">
        <div class="avatar-wrapper" @click="triggerAvatarUpload">
          <div class="avatar" :style="{ background: avatarColor.bg, color: avatarColor.color }">
            <img v-if="avatarUrl" :src="avatarUrl" class="avatar-img" />
            <span v-else>{{ avatarText }}</span>
          </div>
          <div class="avatar-badge"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg></div>
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

      <div class="menu-list">
        <div class="menu-item" @click="onComingSoon">
          <div class="menu-icon" style="background:rgba(0,122,255,0.12);color:#007AFF"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/></svg></div>
          <div class="menu-text">我的数据</div>
          <div class="menu-arrow">›</div>
        </div>
        <div class="menu-item" @click="onComingSoon">
          <div class="menu-icon" style="background:rgba(52,199,89,0.12);color:#34C759"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg></div>
          <div class="menu-text">提醒设置</div>
          <div class="menu-arrow">›</div>
        </div>
        <div class="menu-item" @click="onComingSoon">
          <div class="menu-icon" style="background:rgba(175,82,222,0.12);color:#AF52DE"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg></div>
          <div class="menu-text">意见反馈</div>
          <div class="menu-arrow">›</div>
        </div>
        <div class="menu-item">
          <div class="menu-icon" style="background:rgba(255,149,0,0.12);color:#FF9500"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg></div>
          <div class="menu-text">关于系统</div>
          <div class="menu-arrow">v1.0.0</div>
        </div>
      </div>

      <button class="btn-logout" @click="onLogout">退出登录</button>
    </div>

    <ConfirmDialog
      :show="showConfirmLogout"
      title="退出登录"
      desc="确定要退出登录吗？"
      cancel-text="取消"
      confirm-text="退出"
      danger
      @cancel="showConfirmLogout = false"
      @confirm="doLogout"
    />

    <div class="toast" v-if="toast.show">{{ toast.message }}</div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import api from '../utils/api'
import { isLoggedIn as checkLoggedIn, getUserInfo, setUserInfo, clearAuth, getToken } from '../utils/auth'
import { getAvatarColor } from '../utils/constants'
import ConfirmDialog from '../components/ConfirmDialog.vue'

const router = useRouter()
const userInfo = ref(null)
const loggedIn = ref(false)
const editNickname = ref('')
const avatarInput = ref(null)
const toast = reactive({ show: false, message: '' })
const showConfirmLogout = ref(false)

const isAdmin = computed(() => userInfo.value?.role === 'admin')
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

function showToast(message, duration = 2000) {
  toast.message = message
  toast.show = true
  setTimeout(() => { toast.show = false }, duration)
}

function goToLogin() {
  router.push('/login')
}

function onComingSoon() {
  showToast('敬请期待')
}

function triggerAvatarUpload() {
  if (isAdmin.value) return
  avatarInput.value?.click()
}

async function onAvatarChange(e) {
  const file = e.target.files[0]
  if (!file) return

  if (file.size > 5 * 1024 * 1024) {
    showToast('图片大小不能超过5MB')
    return
  }

  const formData = new FormData()
  formData.append('file', file)

  try {
    showToast('上传中...')
    const res = await api.post('/user/avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    const updated = { ...userInfo.value, avatar_url: res.avatar_url }
    setUserInfo(updated)
    userInfo.value = updated
    showToast('头像更新成功')
  } catch (e) {
    showToast('头像上传失败')
  }
  e.target.value = ''
}

async function onNicknameBlur() {
  if (isAdmin.value) return
  const nickname = editNickname.value.trim()
  if (!nickname || nickname === userInfo.value?.nickname) return

  try {
    const res = await api.put('/user/info', { nickname })
    setUserInfo(res)
    userInfo.value = res
    editNickname.value = res.nickname || ''
    showToast('昵称更新成功')
  } catch (e) {
    showToast('更新失败')
    editNickname.value = userInfo.value?.nickname || ''
  }
}

function onLogout() {
  showConfirmLogout.value = true
}

function doLogout() {
  showConfirmLogout.value = false
  clearAuth()
  loggedIn.value = false
  userInfo.value = null
  showToast('已退出')
}

onMounted(() => {
  loggedIn.value = checkLoggedIn()
  if (loggedIn.value) {
    userInfo.value = getUserInfo()
    editNickname.value = userInfo.value?.nickname || ''
  }
})

</script>

<style scoped>
.mine-page {
  min-height: 100vh;
  background: #F5F5F7;
  padding: 0 14px 80px;
}

/* Login Prompt */
.login-prompt {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 70vh;
  padding: 20px;
}
.prompt-icon { width: 80px; height: 80px; border-radius: 50%; background: rgba(0,122,255,0.06); display: flex; align-items: center; justify-content: center; margin-bottom: 20px; }
.prompt-title { font-size: 20px; font-weight: 700; color: #1D1D1F; margin-bottom: 8px; }
.prompt-desc { font-size: 14px; color: rgba(29,29,31,0.55); margin-bottom: 30px; }
.btn-login { width: 200px; padding: 14px; border-radius: 980px; background: #007AFF; color: white; font-size: 15px; font-weight: 600; box-shadow: 0 4px 12px rgba(0,122,255,0.18); }

/* Profile Card */
.profile-card {
  background: white;
  border-radius: 18px;
  padding: 24px 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 16px;
  margin-top: 14px;
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
  background: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.15);
}
.profile-info { flex: 1; min-width: 0; }
.profile-name { font-size: 18px; font-weight: 700; color: #1D1D1F; }
.profile-name-input {
  width: 100%;
  font-size: 18px;
  font-weight: 700;
  color: #1D1D1F;
  border: none;
  outline: none;
  background: transparent;
  padding: 0;
}
.profile-name-input::placeholder { color: rgba(29,29,31,0.4); }
.profile-id { font-size: 12px; color: rgba(29,29,31,0.55); margin-top: 4px; }

/* Menu List */
.menu-list {
  background: white;
  border-radius: 18px;
  overflow: hidden;
  margin-bottom: 16px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.04);
}
.menu-item {
  display: flex;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid rgba(0,0,0,0.04);
  cursor: pointer;
}
.menu-item:last-child { border-bottom: none; }
.menu-item:active { background: #F5F5F7; }
.menu-icon {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  margin-right: 12px;
}
.menu-text { flex: 1; font-size: 15px; font-weight: 500; color: #1D1D1F; }
.menu-arrow { font-size: 18px; color: rgba(29,29,31,0.28); }
.menu-icon svg { width: 18px; height: 18px; }
.avatar-badge svg { width: 12px; height: 12px; color: var(--primary); }

/* Logout */
.btn-logout {
  width: 100%;
  padding: 16px;
  border-radius: 18px;
  background: white;
  color: #FF3B30;
  font-size: 15px;
  font-weight: 600;
  box-shadow: 0 2px 12px rgba(0,0,0,0.04);
}
.btn-logout:active { background: #F5F5F7; }

/* Toast */
.toast {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: rgba(0, 0, 0, 0.75);
  color: white;
  padding: 10px 20px;
  border-radius: 8px;
  font-size: 14px;
  z-index: 9999;
}

@media (min-width: 768px) {
  .mine-page { max-width: 414px; margin: 0 auto; }
}

/* PC 适配 */
@media (min-width: 1024px) {
  .mine-page {
    /* 解除 768 断点的 414px 锁宽,PC 下铺满 */
    max-width: none;
    margin: 0;
    padding: 24px 28px 40px;
  }

  .login-prompt {
    min-height: 60vh;
  }

  .prompt-icon {
    width: 96px;
    height: 96px;
  }

  .prompt-title {
    font-size: 24px;
  }

  /* 已登录：左右两栏 */
  .user-section {
    display: grid;
    grid-template-columns: 360px minmax(0, 1fr);
    gap: 18px;
    align-items: start;
  }

  .profile-card {
    margin-top: 0;
    padding: 28px 24px;
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: 16px;
  }

  .avatar {
    width: 88px;
    height: 88px;
    font-size: 36px;
  }

  .avatar-badge {
    width: 26px;
    height: 26px;
    font-size: 14px;
  }

  .profile-name,
  .profile-name-input {
    font-size: 22px;
    text-align: center;
  }

  .profile-info {
    width: 100%;
  }

  .profile-id {
    font-size: 13px;
    text-align: center;
  }

  /* 菜单改为网格 */
  .menu-list {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 0;
    overflow: visible;
  }

  .menu-item {
    padding: 18px 22px;
  }

  .menu-item:nth-child(2n) {
    border-left: 1px solid rgba(0, 0, 0, 0.04);
  }

  .menu-item:nth-last-child(-n+2) {
    border-bottom: none;
  }

  .menu-text {
    font-size: 16px;
  }

  .btn-logout {
    margin-top: 18px;
    padding: 18px;
    font-size: 16px;
  }

  .toast {
    top: 80px;
    bottom: auto;
  }

  /* ============ PC 增强:毛玻璃 + 配色图标放大 + 退出键胶囊（方案 A） ============ */
  .profile-card {
    background: var(--bg-card);
    backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
    border: 1px solid var(--border-glass);
  }
  .menu-list {
    background: var(--bg-card);
    backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
    border: 1px solid var(--border-glass);
  }
  .menu-icon { width: 40px; height: 40px; border-radius: 12px; }
  .menu-icon svg { width: 22px; height: 22px; }
  .menu-item { transition: background 0.2s; }
  .menu-item:hover { background: rgba(0, 0, 0, 0.03); }
  .avatar-badge svg { width: 14px; height: 14px; }

  /* 退出键:居中胶囊,不再横跨整宽 */
  .btn-logout {
    width: auto;
    justify-self: center;
    padding: 14px 56px;
    border-radius: 980px;
    background: white;
    border: 1px solid rgba(255, 59, 48, 0.2);
    box-shadow: 0 2px 12px rgba(255, 59, 48, 0.06);
  }
  .btn-logout:hover { background: rgba(255, 59, 48, 0.06); }
}

</style>

