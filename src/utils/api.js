import axios from 'axios'
import { getToken, clearAuth } from './auth'
import router from '../router'

// 后端地址统一从 .env 读取（VITE_API_BASE），切换环境只改 .env 即可
const BASE_URL = `${import.meta.env.VITE_API_BASE}/customerapi`

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 60000,
  headers: {
    'Content-Type': 'application/json',
  },
})

api.interceptors.request.use(
  (config) => {
    const token = getToken()
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response) {
      if (error.response.status === 401) {
        clearAuth()
        // 带上当前路径作为 redirect，登录成功后跳回原页面，避免「跳 /mine 再点一次登录按钮」的体验
        const redirect = router.currentRoute.value.fullPath
        router.push({ path: '/login', query: { redirect } })
        return Promise.reject(new Error('登錄已過期，請重新登錄'))
      }
      if (error.response.status >= 400) {
        return Promise.reject(new Error(error.response.data?.detail || `請求失敗 (${error.response.status})`))
      }
    }
    return Promise.reject(error)
  }
)

export default api
