import { ref } from 'vue'

// 与 CSS 中的断点保持一致：>= 1024 视为 PC
export const PC_BREAKPOINT = 1024

const isDesktop = ref(typeof window !== 'undefined' && window.innerWidth >= PC_BREAKPOINT)

function update() {
  if (typeof window === 'undefined') return
  const next = window.innerWidth >= PC_BREAKPOINT
  if (isDesktop.value !== next) isDesktop.value = next
}

// 在模块加载时立即绑定一次，确保刷新后首次渲染就是正确的断点
if (typeof window !== 'undefined') {
  update()
  window.addEventListener('resize', update)
}

export function useDevice() {
  return { isDesktop, PC_BREAKPOINT }
}
