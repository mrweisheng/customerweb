import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  // 打包前强制校验：缺少 API 地址直接让构建失败，避免产出 /undefined/ 的错误产物
  if (!env.VITE_API_BASE) {
    throw new Error('缺少 VITE_API_BASE 环境变量：请在 customerweb/.env 中配置（参考 .env.example）后重新打包')
  }
  return {
    plugins: [vue()],
    server: {
      host: '0.0.0.0',
      port: 5173,
    },
  }
})
