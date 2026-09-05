<template>
  <div class="login-page">
    <div class="login-card">
      <div class="login-logo">
        <svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" width="28" height="28">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
          <polyline points="9 22 9 12 15 12 15 22"></polyline>
        </svg>
      </div>
      <div class="login-title">客户管理</div>
      <div class="login-subtitle">客资管理系统 · 内部工具</div>

      <div class="form-group">
        <div class="form-label">用户名</div>
        <input class="form-input" placeholder="请输入用户名" v-model="username" @keyup.enter="onLogin" />
      </div>

      <div class="form-group">
        <div class="form-label">密码</div>
        <input class="form-input" type="password" placeholder="请输入密码" v-model="password" @keyup.enter="onLogin" />
      </div>

      <button class="btn-login" :class="{ disabled: loading }" @click="onLogin" :disabled="loading">
        {{ loading ? '登录中...' : '登录' }}
      </button>

      <div class="login-foot">登录后可录入客户、跟进重点、查看统计</div>
    </div>

    <div class="toast" v-if="toast.show">{{ toast.message }}</div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import api from '../utils/api'
import { setToken, setUserInfo } from '../utils/auth'
import { useToast } from '../composables/useToast'

const router = useRouter()
const route = useRoute()
const { toast, showToast } = useToast()
const username = ref('')
const password = ref('')
const loading = ref(false)

function navigateBack() {
  // 优先使用 redirect 参数（路由守卫/401 拦截器跳转时会带上），让用户登录后回到原页面
  const redirect = route.query.redirect
  // 只接受内部路径（避免 open redirect：//evil.com 这种 protocol-relative 也会被排除）
  if (redirect && typeof redirect === 'string' && redirect.startsWith('/') && !redirect.startsWith('//')) {
    router.replace(redirect)
    return
  }
  router.replace('/index')
}

async function onLogin() {
  if (loading.value) return

  if (!username.value || !username.value.trim()) {
    showToast('请输入用户名')
    return
  }
  if (!password.value || !password.value.trim()) {
    showToast('请输入密码')
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
    navigateBack()
  } catch (e) {
    showToast(e.message || '登录失败')
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
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  position: relative;
  overflow: hidden;
}

.login-page::before {
  content: '';
  position: absolute;
  top: -60px;
  left: -30px;
  width: 220px;
  height: 220px;
  background: radial-gradient(circle, rgba(0, 122, 255, 0.07) 0%, transparent 70%);
  pointer-events: none;
}

.login-page::after {
  content: '';
  position: absolute;
  bottom: -50px;
  right: -30px;
  width: 180px;
  height: 180px;
  background: radial-gradient(circle, rgba(90, 200, 250, 0.09) 0%, transparent 70%);
  pointer-events: none;
}

.login-card {
  width: 100%;
  max-width: 360px;
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border: 1px solid rgba(0, 0, 0, 0.05);
  border-radius: 22px;
  padding: 36px 30px 28px;
  box-shadow: 0 24px 60px -20px rgba(15, 23, 42, 0.18);
  text-align: center;
  position: relative;
  z-index: 1;
}

.login-logo {
  width: 58px;
  height: 58px;
  border-radius: 16px;
  margin: 0 auto 16px;
  background: linear-gradient(135deg, #007AFF, #32ADE6);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 10px 24px rgba(0, 122, 255, 0.35);
}

.login-title {
  font-size: 21px;
  font-weight: 700;
  color: var(--text-primary);
  letter-spacing: 0.5px;
}

.login-subtitle {
  font-size: 12px;
  color: var(--text-tertiary);
  margin-top: 4px;
  margin-bottom: 24px;
}

.form-group {
  margin-bottom: 14px;
  text-align: left;
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
  font-family: inherit;
  box-sizing: border-box;
}

.form-input:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(0, 122, 255, 0.1);
  outline: none;
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
  margin-top: 10px;
  box-shadow: 0 4px 12px rgba(0, 122, 255, 0.18);
  transition: all 0.2s;
  font-family: inherit;
  cursor: pointer;
}

@media (min-width: 1024px) {
  .btn-login:hover { filter: brightness(1.06); }
}

.btn-login:active {
  transform: scale(0.98);
}

.btn-login.disabled {
  opacity: 0.6;
  pointer-events: none;
}

.login-foot {
  margin-top: 16px;
  font-size: 11px;
  color: var(--text-tertiary);
}
</style>
