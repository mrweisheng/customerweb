import axios from 'axios'
import { getToken, clearAuth } from './auth'
import router from '../router'

const BASE_URL = 'https://kehu.gaoshanguoji.top/customerapi'

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
        router.push('/mine')
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
