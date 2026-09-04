// 全局共享 toast 状态：模块级单例，各页面渲染自己的 <div class="toast"> 即可
import { reactive } from 'vue'

const toast = reactive({ show: false, message: '' })
let timer = null

export function useToast() {
  function showToast(message, duration = 2000) {
    toast.message = message
    toast.show = true
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => { toast.show = false }, duration)
  }
  return { toast, showToast }
}
