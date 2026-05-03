import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  { path: '/login', name: 'Login', component: () => import('../views/LoginView.vue'), meta: { requiresAuth: false } },
  { path: '/portal', name: 'Portal', component: () => import('../views/PortalView.vue'), meta: { requiresAuth: true } },
  { path: '/app/noteflow', name: 'NoteFlow', component: () => import('../views/NoteFlowApp.vue'), meta: { requiresAuth: true } },
  { path: '/', redirect: '/portal' },
  { path: '/:pathMatch(.*)*', redirect: '/portal' },
]

const router = createRouter({ history: createWebHistory(), routes })

router.beforeEach((to, from, next) => {
  const auth = localStorage.getItem('noteflow_auth') === 'true'
  if (to.meta.requiresAuth && !auth) return next({ name: 'Login', query: { redirect: to.fullPath } })
  if (to.name === 'Login' && auth) return next({ name: 'Portal' })
  next()
})

export default router
