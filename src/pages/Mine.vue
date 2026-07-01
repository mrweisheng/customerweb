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
      <div class="prompt-title">歡迎使用客資管理</div>
      <div class="prompt-desc">登錄後即可管理您的客戶資源</div>
      <button class="btn-login" @click="goToLogin">立即登錄</button>
    </div>

    <!-- 已登录 -->
    <div v-else class="user-section">
      <div class="profile-card">
        <div class="avatar-wrapper" @click="triggerAvatarUpload">
          <div class="avatar" :style="{ background: avatarColor.bg, color: avatarColor.color }">
            <img v-if="avatarUrl" :src="avatarUrl" class="avatar-img" />
            <span v-else>{{ avatarText }}</span>
          </div>
          <div class="avatar-badge">📷</div>
        </div>
        <input ref="avatarInput" type="file" accept="image/*" style="display:none" @change="onAvatarChange" />
        <div class="profile-info">
          <div v-if="isAdmin" class="profile-name">{{ userInfo?.nickname || '管理員' }}</div>
          <div v-else class="name-edit-wrapper">
            <input
              class="profile-name-input"
              v-model="editNickname"
              placeholder="點擊設置暱稱"
              @blur="onNicknameBlur"
              @keyup.enter="onNicknameBlur"
            />
          </div>
          <div class="profile-id">ID: {{ userInfo?.user_id }} · {{ isAdmin ? '管理員' : '已登錄' }}</div>
        </div>
      </div>

      <div class="menu-list">
        <div class="menu-item" @click="onComingSoon">
          <div class="menu-icon" style="background:rgba(0,122,255,0.08)">📊</div>
          <div class="menu-text">我的數據</div>
          <div class="menu-arrow">›</div>
        </div>
        <div class="menu-item" @click="onComingSoon">
          <div class="menu-icon" style="background:rgba(52,199,89,0.08)">🔔</div>
          <div class="menu-text">提醒設置</div>
          <div class="menu-arrow">›</div>
        </div>
        <div class="menu-item" @click="onComingSoon">
          <div class="menu-icon" style="background:rgba(175,82,222,0.08)">💬</div>
          <div class="menu-text">意見反饋</div>
          <div class="menu-arrow">›</div>
        </div>
        <div class="menu-item">
          <div class="menu-icon" style="background:rgba(255,149,0,0.08)">ℹ️</div>
          <div class="menu-text">關於系統</div>
          <div class="menu-arrow">v1.0.0</div>
        </div>
      </div>

      <button class="btn-logout" @click="onLogout">退出登錄</button>
    </div>

    <div class="toast" v-if="toast.show">{{ toast.message }}</div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import api from '../utils/api'
import { isLoggedIn as checkLoggedIn, getUserInfo, setUserInfo, clearAuth, getToken } from '../utils/auth'
import { getAvatarColor } from '../utils/constants'

const router = useRouter()
const userInfo = ref(null)
const loggedIn = ref(false)
const editNickname = ref('')
const avatarInput = ref(null)
const toast = reactive({ show: false, message: '' })

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
  const baseUrl = 'https://kehu.gaoshanguoji.top'
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
  showToast('敬請期待')
}

function triggerAvatarUpload() {
  if (isAdmin.value) return
  avatarInput.value?.click()
}

async function onAvatarChange(e) {
  const file = e.target.files[0]
  if (!file) return

  if (file.size > 5 * 1024 * 1024) {
    showToast('圖片大小不能超過5MB')
    return
  }

  const formData = new FormData()
  formData.append('file', file)

  try {
    showToast('上傳中...')
    const res = await api.post('/user/avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    const updated = { ...userInfo.value, avatar_url: res.avatar_url }
    setUserInfo(updated)
    userInfo.value = updated
    showToast('頭像更新成功')
  } catch (e) {
    showToast('頭像上傳失敗')
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
    showToast('暱稱更新成功')
  } catch (e) {
    showToast('更新失敗')
    editNickname.value = userInfo.value?.nickname || ''
  }
}

function onLogout() {
  if (confirm('確定要退出登錄嗎？')) {
    clearAuth()
    loggedIn.value = false
    userInfo.value = null
    showToast('已退出')
  }
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
  background: rgba(0,0,0,0.75);
  color: white;
  padding: 10px 20px;
  border-radius: 8px;
  font-size: 14px;
  z-index: 9999;
}

@media (min-width: 768px) {
  .mine-page { max-width: 414px; margin: 0 auto; }
}
</style>
