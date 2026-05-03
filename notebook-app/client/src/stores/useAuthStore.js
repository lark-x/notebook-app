import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { apiRequest } from '../utils/api.js'

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null)
  const token = ref(localStorage.getItem('noteflow_token') || '')
  const isLoggedIn = computed(() => !!token.value)
  const isAdmin = computed(() => user.value?.role === 'admin')

  async function login(username, password) {
    const data = await apiRequest('POST', '/login', { username, password })
    token.value = data.token
    user.value = data.user
    localStorage.setItem('noteflow_token', data.token)
    localStorage.setItem('noteflow_auth', 'true')
    localStorage.setItem('noteflow_user', data.user.username)
    return data.user
  }

  function logout() {
    token.value = ''
    user.value = null
    localStorage.removeItem('noteflow_token')
    localStorage.removeItem('noteflow_auth')
    localStorage.removeItem('noteflow_user')
  }

  async function checkAuth() {
    if (!token.value) return false
    try {
      const data = await apiRequest('GET', '/me')
      user.value = data.user
      return true
    } catch {
      logout()
      return false
    }
  }

  return { user, token, isLoggedIn, isAdmin, login, logout, checkAuth }
})
