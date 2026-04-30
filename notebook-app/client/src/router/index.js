/**
 * Vue Router 路由配置
 *
 * 定义应用路由结构：
 * - /login：登录页
 * - /portal：应用门户（登录后默认着陆页）
 * - /app/noteflow：NoteFlow 笔记应用
 *
 * 包含导航守卫，未登录用户自动重定向到登录页。
 */

import { createRouter, createWebHistory } from 'vue-router'

/** 路由表 */
const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/LoginView.vue'),
    meta: { requiresAuth: false }
  },
  {
    path: '/portal',
    name: 'Portal',
    component: () => import('../views/PortalView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/app/noteflow',
    name: 'NoteFlow',
    component: () => import('../views/NoteFlowApp.vue'),
    meta: { requiresAuth: true }
  },
  {
    // 根路径重定向到门户
    path: '/',
    redirect: '/portal'
  },
  {
    // 未匹配路径重定向到门户
    path: '/:pathMatch(.*)*',
    redirect: '/portal'
  }
]

/** 创建路由实例 */
const router = createRouter({
  history: createWebHistory(),
  routes
})

/**
 * 全局前置守卫
 * 检查目标路由是否需要认证，未登录则重定向到登录页。
 * 已登录用户访问 /login 时重定向到门户。
 */
router.beforeEach((to, from, next) => {
  const isAuthenticated = localStorage.getItem('noteflow_auth') === 'true'

  // 需要认证但未登录 → 重定向到登录页
  if (to.meta.requiresAuth && !isAuthenticated) {
    next({ name: 'Login', query: { redirect: to.fullPath } })
    return
  }

  // 已登录用户访问登录页 → 重定向到门户
  if (to.name === 'Login' && isAuthenticated) {
    next({ name: 'Portal' })
    return
  }

  next()
})

export default router
