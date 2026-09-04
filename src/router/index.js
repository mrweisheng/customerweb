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
    path: '/import',
    name: 'Import',
    component: () => import('../pages/Import.vue'),
    meta: { title: '录入客户' },
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/index',
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
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
  // 录入客户仅限普通用户（管理员数据只读）
  if (to.name === 'Import' && getUserInfo()?.role === 'admin') {
    return { path: '/index' }
  }
})

export default router
