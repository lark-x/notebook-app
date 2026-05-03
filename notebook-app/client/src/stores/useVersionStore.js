import { defineStore } from 'pinia'
import { ref } from 'vue'
import { apiRequest } from '../utils/api.js'

export const useVersionStore = defineStore('versions', () => {
  const versions = ref([])
  const currentVersionIndex = ref(-1)

  async function loadVersions(noteId, currentContent) {
    try {
      versions.value = await apiRequest('GET', `/notes/${noteId}/versions`)
      // 旧笔记没有初始版本，自动补充
      if (versions.value.length === 0 && currentContent) {
        await apiRequest('POST', `/notes/${noteId}/versions`, {
          content: currentContent,
          type: 'original',
          aiType: '',
          label: '原文',
        })
        versions.value = await apiRequest('GET', `/notes/${noteId}/versions`)
      }
      currentVersionIndex.value = versions.value.length > 0 ? versions.value.length - 1 : -1
    } catch { versions.value = []; currentVersionIndex.value = -1 }
  }

  async function addVersion(noteId, content, aiType, label) {
    const typeNames = { style: '风格转换', expand: '内容扩展', summary: '摘要提炼' }
    try {
      await apiRequest('POST', `/notes/${noteId}/versions`, {
        content,
        type: 'ai',
        aiType,
        label: label || typeNames[aiType] || 'AI',
      })
      await loadVersions(noteId)
    } catch (e) { console.warn('保存版本失败:', e.message) }
  }

  function restoreVersion(index) {
    if (index < 0 || index >= versions.value.length) return null
    currentVersionIndex.value = index
    return versions.value[index]
  }

  function clear() {
    versions.value = []
    currentVersionIndex.value = -1
  }

  return {
    versions, currentVersionIndex,
    loadVersions, addVersion, restoreVersion, clear,
  }
})
