<template>
  <div class="login-page">
    <div class="login-hero">
      <div class="login-logo">
        <svg viewBox="0 0 24 24" fill="none" stroke="#007AFF" stroke-width="2" width="28" height="28">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
          <polyline points="9 22 9 12 15 12 15 22"></polyline>
        </svg>
      </div>
      <div class="login-title">歡迎登錄</div>
      <div class="login-subtitle">管理您的客戶資源</div>
      <div class="hero-features">
        <div class="hero-feature"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg><span>AI 智能識別導入</span></div>
        <div class="hero-feature"><svg viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg><span>重點客戶優先管理</span></div>
        <div class="hero-feature"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/></svg><span>回訪數據可視化</span></div>
      </div>
    </div>

    <div class="login-form">
      <div class="form-group">
        <div class="form-label">用戶名</div>
        <input class="form-input" placeholder="請輸入用戶名" v-model="username" @keyup.enter="onLogin" />
      </div>

      <div class="form-group">
        <div class="form-label">密碼</div>
        <input class="form-input" type="password" placeholder="請輸入密碼" v-model="password" @keyup.enter="onLogin" />
      </div>

      <button class="btn-login" :class="{ disabled: loading }" @click="onLogin" :disabled="loading">
        {{ loading ? '登錄中...' : '登錄' }}
      </button>
    </div>

    <div class="toast" v-if="toast.show">{{ toast.message }}</div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import api from '../utils/api'
import { setToken, setUserInfo } from '../utils/auth'

const router = useRouter()
const route = useRoute()
const username = ref('')
const password = ref('')
const loading = ref(false)
const toast = reactive({ show: false, message: '' })

function showToast(message, duration = 2000) {
  toast.message = message
  toast.show = true
  setTimeout(() => {
    toast.show = false
  }, duration)
}

function navigateBack() {
  // 优先使用 redirect 参数（401 拦截器跳转时会带上），让用户登录后回到原页面
  const redirect = route.query.redirect
  // 只接受内部路径（避免 open redirect：//evil.com 这种 protocol-relative 也会被排除）
  if (redirect && typeof redirect === 'string' && redirect.startsWith('/') && !redirect.startsWith('//')) {
    router.replace(redirect)
    return
  }
  if (window.history.length > 1) {
    router.back()
  } else {
    router.push('/index')
  }
}

async function onLogin() {
  if (loading.value) return

  if (!username.value || !username.value.trim()) {
    showToast('請輸入用戶名')
    return
  }
  if (!password.value || !password.value.trim()) {
    showToast('請輸入密碼')
    return
  }

  loading.value = true
  try {
    const res = await api.post('/auth/account-login', {
      username: username.value,
      password: password.value,
    })
    setToken(res.token)
    setUserInfo(res)
    showToast('登錄成功')
    setTimeout(() => {
      navigateBack()
    }, 1000)
  } catch (e) {
    showToast(e.message || '登錄失敗')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  background: var(--bg-primary);
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 60px 20px 40px;
  position: relative;
  overflow: hidden;
}

.login-page::before {
  content: '';
  position: absolute;
  top: -50px;
  left: -25px;
  width: 150px;
  height: 150px;
  background: radial-gradient(circle, rgba(0, 122, 255, 0.04) 0%, transparent 70%);
  pointer-events: none;
}

.login-page::after {
  content: '';
  position: absolute;
  bottom: -40px;
  right: -20px;
  width: 100px;
  height: 100px;
  background: radial-gradient(circle, rgba(255, 149, 0, 0.04) 0%, transparent 70%);
  pointer-events: none;
}

.login-hero {
  text-align: center;
  margin-bottom: 40px;
  padding-top: 20px;
  z-index: 1;
}

.login-logo {
  width: 60px;
  height: 60px;
  border-radius: 18px;
  background: linear-gradient(145deg, #ffffff 0%, #f0f4ff 100%);
  border: 1px solid rgba(0, 122, 255, 0.1);
  box-shadow: 0 8px 24px rgba(0, 122, 255, 0.08), 0 2px 6px rgba(0, 0, 0, 0.02);
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 12px;
  position: relative;
  overflow: hidden;
}

.login-logo::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, rgba(0, 122, 255, 0.04) 0%, transparent 100%);
  opacity: 0.3;
}

.login-title {
  font-size: 24px;
  font-weight: 700;
  color: var(--text-primary);
  letter-spacing: -0.5px;
  margin-bottom: 4px;
  background: linear-gradient(135deg, #1D1D1F 0%, #007AFF 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.login-subtitle {
  font-size: 13px;
  color: var(--text-secondary);
  font-weight: 500;
}

/* hero 特性列表仅 PC 显示,移动端隐藏 */
.hero-features { display: none; }

.login-form {
  width: 100%;
  max-width: 320px;
  z-index: 1;
}

.form-group {
  margin-bottom: 16px;
}

.form-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-secondary);
  margin-bottom: 6px;
}

.form-input {
  width: 100%;
  background: white;
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 12px;
  padding: 12px 14px;
  font-size: 15px;
  color: var(--text-primary);
  transition: all 0.2s;
}

.form-input:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(0, 122, 255, 0.1);
}

.btn-login {
  width: 100%;
  padding: 14px;
  border-radius: 12px;
  background: var(--primary);
  color: white;
  font-size: 15px;
  font-weight: 600;
  text-align: center;
  margin-top: 8px;
  box-shadow: 0 4px 12px rgba(0, 122, 255, 0.18);
  transition: all 0.2s;
}

.btn-login:active {
  transform: scale(0.98);
}

.btn-login.disabled {
  opacity: 0.6;
  pointer-events: none;
}
@media (min-width: 1024px) {
  .login-page { display: grid; grid-template-columns: 1.1fr 1fr; align-items: stretch; padding: 0; min-height: 100vh; overflow: hidden; }
  .login-page::before, .login-page::after { display: none; }
  .login-hero { text-align: left; margin: 0; padding: 0 72px; display: flex; flex-direction: column; justify-content: center; align-items: flex-start; align-self: stretch; background: linear-gradient(135deg, #eaf2ff 0%, #f7faff 60%, #ffffff 100%); position: relative; }
  .login-hero::after { content: ''; position: absolute; right: -120px; top: 50%; transform: translateY(-50%); width: 360px; height: 360px; border-radius: 50%; background: radial-gradient(circle, rgba(0, 122, 255, 0.1) 0%, transparent 70%); pointer-events: none; }
  .login-logo { margin: 0 0 24px; width: 68px; height: 68px; border-radius: 20px; }
  .login-title { font-size: 32px; margin-bottom: 8px; }
  .login-subtitle { font-size: 15px; }
  .login-form { max-width: 360px; width: 100%; margin: 0; padding: 0; align-self: center; justify-self: center; }

  /* ============ PC 增强:hero 特性列表 + 装饰球 + logo 动效（方案 A） ============ */
  .hero-features {
    display: flex;
    flex-direction: column;
    gap: 14px;
    margin-top: 36px;
  }
  .hero-feature {
    display: flex;
    align-items: center;
    gap: 12px;
    font-size: 14px;
    font-weight: 500;
    color: var(--text-primary);
  }
  .hero-feature svg {
    width: 22px;
    height: 22px;
    padding: 5px;
    box-sizing: content-box;
    border-radius: 10px;
    flex-shrink: 0;
  }
  .hero-feature:nth-child(1) svg { background: var(--blue-light); color: var(--primary); }
  .hero-feature:nth-child(2) svg { background: var(--orange-light); color: var(--warning); }
  .hero-feature:nth-child(3) svg { background: var(--green-light); color: var(--success); }

  /* 左栏第二个装饰球(橙),呼应右侧蓝球,丰富色彩 */
  .login-hero::before {
    content: '';
    position: absolute;
    left: -80px;
    bottom: 8%;
    width: 240px;
    height: 240px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(255, 149, 0, 0.08) 0%, transparent 70%);
    pointer-events: none;
  }

  .login-logo { transition: transform 0.3s; }
  .login-logo:hover { transform: scale(1.06) rotate(-3deg); }
}
</style>
