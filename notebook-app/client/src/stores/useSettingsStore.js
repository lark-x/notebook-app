/**
 * 设置管理 Store（Pinia）
 */
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { apiRequest } from '../utils/api.js'

export const useSettingsStore = defineStore('settings', () => {
  const theme = ref('light')

  async function applyTheme(newTheme) {
    theme.value = newTheme
    document.documentElement.setAttribute('data-theme', newTheme)
    try {
      await apiRequest('PUT', '/settings', { theme: newTheme })
    } catch (e) {
      console.warn('保存主题设置失败:', e.message)
    }
  }

  async function toggleTheme() {
    await applyTheme(theme.value === 'dark' ? 'light' : 'dark')
  }

  async function exportData() {
    const data = await apiRequest('GET', '/data')
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `noteflow_backup_${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function importData(imported) {
    await apiRequest('PUT', '/data', imported)
    return true
  }

  return { theme, applyTheme, toggleTheme, exportData, importData }
})
