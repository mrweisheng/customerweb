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
      const detail = error.response.data?.detail
      // 登录接口自身的 401（密码错误等）原样透传，不做清token/跳转
      const isAuthApi = String(error.config?.url || '').startsWith('/auth/')
      if (error.response.status === 401 && !isAuthApi) {
        clearAuth()
        // 带上当前路径作为 redirect，登录成功后跳回原页面；并发 401 只跳一次
        const current = router.currentRoute.value
        if (current.path !== '/login') {
          const redirect = current.fullPath
          router.push({ path: '/login', query: { redirect } })
        }
        return Promise.reject(new Error('登录已过期，请重新登录'))
      }
      if (error.response.status >= 400) {
        return Promise.reject(new Error(detail || `请求失败 (${error.response.status})`))
      }
    }
    return Promise.reject(error)
  }
)

export default api
