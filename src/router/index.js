import { createRouter, createWebHistory } from 'vue-router'
import { isLoggedIn, getUserInfo } from '../utils/auth'

const routes = [
  {
    path: '/',
    redirect: '/index',
  },
  {
    path: '/index',
    name: 'Workbench',
    component: () => import('../pages/Workbench.vue'),
    meta: { title: '工作台', showTabbar: true },
  },
  {
    path: '/statistics',
    name: 'Statistics',
    component: () => import('../pages/Statistics.vue'),
    meta: { title: '统计', showTabbar: true },
  },
  {
    path: '/mine',
    name: 'Mine',
    component: () => import('../pages/Mine.vue'),
    meta: { title: '我的', showTabbar: true },
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('../pages/Login.vue'),
    meta: { title: '登录' },
  },
  {
    // 旧表单式录入页已由对话式智能导入替代，旧链接统一重定向
    path: '/import',
    redirect: '/ai-import',
  },
  {
    path: '/ai-import',
    name: 'AiImport',
    component: () => import('../pages/AiImport.vue'),
    meta: { title: '智能导入', showTabbar: true },
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/index',
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  // 各页面滚动互不影响：路由前进一律回到顶部；
  // 浏览器前进/后退（popstate）则恢复原位置，详情页返回列表不丢滚动
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) return savedPosition
    return { top: 0 }
  },
})

router.beforeEach((to) => {
  document.title = to.meta.title ? `${to.meta.title} - 客资管理` : '客资管理'

  // 未登录一律跳登录页（带 redirect 回跳），删除各页假数据模式
  if (to.name !== 'Login' && !isLoggedIn()) {
    return { path: '/login', query: { redirect: to.fullPath } }
  }
  // 已登录不再进登录页
  if (to.name === 'Login' && isLoggedIn()) {
    return { path: '/index' }
  }
  // 智能导入（对话式 AI 录入）仅限普通用户（管理员数据只读）
  if (to.name === 'AiImport' && getUserInfo()?.role === 'admin') {
    return { path: '/index' }
  }
})

export default router
