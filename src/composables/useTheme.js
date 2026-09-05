import { ref, computed, watchEffect } from 'vue'

// ── 全局主题（夜间模式）─────────────────────────────────
// 三档模式：light 浅色 / dark 深色 / auto 按时刻表自动（18:30 入夜 ~ 06:30 天亮）
// 不做定位授权：自动模式直接以设备时钟（北京时间）按固定作息切换
// 模式持久化到 localStorage；isDark 变化时在 <html> 上挂 .dark 类驱动全站令牌切换

const MODE_KEY = 'appearance_mode'

// 自动模式的简易时刻表
const NIGHT_START = 18.5  // 18:30
const NIGHT_END = 6.5     // 06:30

function readMode() {
  try { return localStorage.getItem(MODE_KEY) || 'light' } catch (_) { return 'light' }
}

const mode = ref(readMode())
const isNight = ref(false)

function refreshNight() {
  const d = new Date()
  const h = d.getHours() + d.getMinutes() / 60
  isNight.value = h >= NIGHT_START || h < NIGHT_END
}
refreshNight()
setInterval(refreshNight, 60000)

const isDark = computed(() => mode.value === 'dark' || (mode.value === 'auto' && isNight.value))

watchEffect(() => {
  if (typeof document !== 'undefined') {
    document.documentElement.classList.toggle('dark', isDark.value)
  }
})

function setMode(next) {
  mode.value = next
  try { localStorage.setItem(MODE_KEY, next) } catch (_) {}
}

export function useTheme() {
  return {
    mode,
    isDark,
    isNight,
    setMode,
    toggle() {
      setMode(isDark.value ? 'light' : 'dark')
    },
  }
}
