import { defineStore } from 'pinia'
import { ref } from 'vue'
import { apiRequest } from '../utils/api.js'

export const useSettingsStore = defineStore('settings', () => {
  const theme = ref('light')

  async function applyTheme(t) {
    theme.value = t
    document.documentElement.setAttribute('data-theme', t)
    try { await apiRequest('PUT', '/settings', { theme: t }) } catch (e) {}
  }

  async function toggleTheme() { await applyTheme(theme.value === 'dark' ? 'light' : 'dark') }

  async function exportData() {
    const data = await apiRequest('GET', '/data')
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `noteflow_backup_${new Date().toISOString().slice(0, 10)}.json`
    a.click(); URL.revokeObjectURL(a.href)
  }

  async function importData(data) { await apiRequest('PUT', '/data', data); return true }

  return { theme, applyTheme, toggleTheme, exportData, importData }
})
