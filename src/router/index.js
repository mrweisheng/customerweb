import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    redirect: '/index',
  },
  {
    path: '/index',
    name: 'Home',
    component: () => import('../pages/Home.vue'),
    meta: { title: '首頁', showTabbar: true },
  },
  {
    path: '/statistics',
    name: 'Statistics',
    component: () => import('../pages/Statistics.vue'),
    meta: { title: '統計', showTabbar: true },
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
    meta: { title: '登錄' },
  },
  {
    path: '/search',
    name: 'Search',
    component: () => import('../pages/Search.vue'),
    meta: { title: '搜索' },
  },
  {
    path: '/ai-import',
    name: 'AiImport',
    component: () => import('../pages/AiImport.vue'),
    meta: { title: 'AI導入' },
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach((to, from, next) => {
  document.title = to.meta.title ? `${to.meta.title} - 客資管理` : '客資管理'
  next()
})

export default router
