<template>
  <div class="login-page">
    <section class="login-hero">
      <div class="blob b-blush b-lg" style="top:-120px;left:-100px;width:380px;height:380px;"></div>
      <div class="blob b-coral" style="bottom:-90px;right:-80px;width:300px;height:300px;"></div>
      <div class="blob b-sun b-sm" style="top:35%;left:42%;width:220px;height:220px;"></div>

      <div class="hero-brand">
        <div class="hero-logo">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="22" height="22">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
            <polyline points="9 22 9 12 15 12 15 22"></polyline>
          </svg>
        </div>
        <div>
          <div class="hero-brand-title">客户管理</div>
          <div class="hero-brand-sub">Customer CRM</div>
        </div>
      </div>

      <div class="hero-headline">
        <div class="hero-eyebrow">CUSTOMER &middot; OS</div>
        <h1 class="hero-h1">每段关系，<br/>都被认真记住。</h1>
        <p class="hero-desc">在截图、到店与跟进之间，留住值得留住的人。</p>
      </div>

      <div class="hero-stats">
        <div class="hero-stat"><span class="hero-stat-num">12<span class="unit">位</span></span><span class="hero-stat-cap">今日线索</span></div>
        <div class="hero-stat"><span class="hero-stat-num">4<span class="unit">位</span></span><span class="hero-stat-cap">待回访</span></div>
        <div class="hero-stat"><span class="hero-stat-num">98<span class="unit">%</span></span><span class="hero-stat-cap">更新率</span></div>
      </div>
    </section>

    <div class="login-form-wrap">
      <div class="login-form-card bloom-card">
        <div class="form-eyebrow">登录 &middot; SIGN IN</div>
        <div class="form-title">嗨，欢迎回来。</div>
        <div class="form-subtitle">继续把今天遇见的人，照顾好。</div>

        <div class="form-group">
          <div class="form-label">用户名</div>
          <input class="form-input" placeholder="请输入用户名" v-model="username" autocomplete="username" @keyup.enter="onLogin" />
        </div>

        <div class="form-group">
          <div class="form-label">密码</div>
          <input class="form-input" type="password" placeholder="请输入密码" v-model="password" autocomplete="current-password" @keyup.enter="onLogin" />
        </div>

        <button class="btn-login" :class="{ disabled: loading }" @click="onLogin" :disabled="loading">
          {{ loading ? '登录中…' : '登录' }}
        </button>

        <div class="login-foot">登录后可录入客户、跟进重点、查看统计</div>
      </div>
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
  const redirect = route.query.redirect
  if (redirect && typeof redirect === 'string' && redirect.startsWith('/') && !redirect.startsWith('//')) {
    router.replace(redirect)
    return
  }
  router.replace('/index')
}

async function onLogin() {
  if (loading.value) return
  if (!username.value || !username.value.trim()) { showToast('请输入用户名'); return }
  if (!password.value || !password.value.trim()) { showToast('请输入密码'); return }
  loading.value = true
  try {
    const res = await api.post('/auth/account-login', { username: username.value, password: password.value })
    setToken(res.token)
    setUserInfo(res)
    navigateBack()
  } catch (e) { showToast(e.message || '登录失败') }
  finally { loading.value = false }
}
</script>

<style scoped>
.login-page { min-height: 100vh; background: var(--bloom-canvas); position: relative; overflow: hidden; }

.login-hero {
  display: none;
  position: relative;
  overflow: hidden;
  padding: 56px 64px;
  background:
    radial-gradient(circle at 90% 8%,  var(--bloom-blush-soft),  transparent 55%),
    radial-gradient(circle at  0% 95%, var(--bloom-coral-soft), transparent 55%),
    radial-gradient(circle at 60% 60%, var(--bloom-sun-soft),   transparent 60%),
    var(--bloom-canvas);
}

.hero-brand { display: flex; align-items: center; gap: 14px; position: relative; z-index: 2; }
.hero-logo {
  width: 44px; height: 44px;
  border-radius: 14px;
  background: conic-gradient(from 0deg, var(--bloom-coral), var(--bloom-lavender), var(--bloom-mint), var(--bloom-coral));
  color: var(--bloom-ink-on-accent);
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 8px 20px -10px rgba(255, 107, 71, 0.55);
}
.hero-brand-title {
  font-family: "DM Serif Display", "Noto Serif SC", Georgia, serif;
  font-size: 22px; font-weight: 400; letter-spacing: -0.02em;
  color: var(--bloom-ink); line-height: 1;
}
.hero-brand-sub {
  font-family: "JetBrains Mono", ui-monospace, monospace;
  font-size: 10.5px; color: var(--bloom-ink-3);
  letter-spacing: 0.06em; text-transform: uppercase; margin-top: 4px;
}

.hero-headline { position: relative; z-index: 2; margin-top: 96px; max-width: 460px; }
.hero-eyebrow {
  font-family: "JetBrains Mono", ui-monospace, monospace;
  font-size: 11px; font-weight: 700; letter-spacing: 0.18em;
  color: var(--bloom-coral); margin-bottom: 18px;
}
.hero-h1 {
  font-family: "DM Serif Display", "Noto Serif SC", Georgia, serif;
  font-size: 56px; font-weight: 400; line-height: 1.05;
  letter-spacing: -0.02em; color: var(--bloom-ink); margin-bottom: 18px;
}
.hero-desc { font-size: 16px; line-height: 1.65; color: var(--bloom-ink-2); max-width: 420px; }

.hero-stats { position: relative; z-index: 2; margin-top: 64px; display: flex; gap: 32px; }
.hero-stat { display: flex; flex-direction: column; gap: 4px; }
.hero-stat-num {
  font-family: "DM Serif Display", "Noto Serif SC", Georgia, serif;
  font-size: 32px; font-weight: 400; color: var(--bloom-ink); line-height: 1;
}
.hero-stat-num .unit { font-size: 14px; color: var(--bloom-ink-3); margin-left: 2px; }
.hero-stat-cap {
  font-family: "JetBrains Mono", ui-monospace, monospace;
  font-size: 10.5px; font-weight: 600; color: var(--bloom-ink-3);
  letter-spacing: 0.08em; text-transform: uppercase;
}

.login-form-wrap { flex: 1; display: flex; align-items: center; justify-content: center; padding: 40px 24px; position: relative; z-index: 2; }
.login-form-card { width: 100%; max-width: 380px; padding: 36px 32px 28px; display: flex; flex-direction: column; }
.form-eyebrow {
  font-family: "JetBrains Mono", ui-monospace, monospace;
  font-size: 10.5px; font-weight: 700; letter-spacing: 0.18em;
  color: var(--bloom-coral); margin-bottom: 10px;
}
.form-title {
  font-family: "DM Serif Display", "Noto Serif SC", Georgia, serif;
  font-size: 30px; font-weight: 400; letter-spacing: -0.01em;
  color: var(--bloom-ink); line-height: 1.15;
}
.form-subtitle { font-size: 13.5px; color: var(--bloom-ink-2); margin-top: 6px; margin-bottom: 26px; line-height: 1.6; }

.form-group { margin-bottom: 14px; }
.form-label {
  font-family: "JetBrains Mono", ui-monospace, monospace;
  font-size: 10.5px; font-weight: 700; color: var(--bloom-ink-3);
  letter-spacing: 0.08em; text-transform: uppercase; margin-bottom: 7px;
}
.form-input {
  width: 100%; background: var(--bloom-canvas);
  border: 1px solid var(--bloom-rule); border-radius: 12px;
  padding: 13px 14px; font-size: 15px; color: var(--bloom-ink);
  font-family: inherit; box-sizing: border-box;
  transition: border-color var(--bloom-t-fast) var(--bloom-ease-out),
              box-shadow var(--bloom-t-fast) var(--bloom-ease-out);
}
.form-input:focus {
  border-color: var(--bloom-coral);
  box-shadow: 0 0 0 3px var(--bloom-coral-soft);
  outline: none;
}

.btn-login {
  width: 100%; padding: 14px; border-radius: 12px;
  background: var(--bloom-ink); color: var(--bloom-canvas);
  font-size: 15px; font-weight: 600; text-align: center;
  margin-top: 12px; font-family: inherit; border: none; cursor: pointer;
  transition: background var(--bloom-t-fast) var(--bloom-ease-out),
              transform var(--bloom-t-fast) var(--bloom-ease-out);
}
.btn-login:hover { background: var(--bloom-coral); }
.btn-login:active { transform: scale(0.98); }
.btn-login.disabled { opacity: 0.55; pointer-events: none; }

.login-foot { margin-top: 18px; font-size: 11px; color: var(--bloom-ink-3); text-align: center; }

@media (max-width: 1023px) {
  .login-page { display: flex; flex-direction: column; align-items: stretch; }
  .login-form-wrap { padding: 24px 20px 40px; min-height: 100vh; align-items: center; }
  .login-form-card { padding: 28px 24px 22px; }
  .form-title { font-size: 26px; }
}

@media (min-width: 1024px) {
  .login-page { display: flex; align-items: stretch; }
  .login-hero { display: flex; flex-direction: column; width: 52%; min-height: 100vh; }
  .login-form-wrap { flex: 1; min-height: 100vh; padding: 24px 32px; }
}

@media (min-width: 1280px) {
  .login-hero { padding: 64px 80px; }
  .hero-h1 { font-size: 64px; }
  .hero-headline { margin-top: 120px; }
}
</style>
