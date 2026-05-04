import { defineStore } from 'pinia'
import { ref } from 'vue'
import { apiRequest } from '../utils/api.js'

export const useVersionStore = defineStore('versions', () => {
  const versions = ref([])
  const currentVersionIndex = ref(-1)

  async function loadVersions(noteId, currentContent) {
    try {
      versions.value = await apiRequest('GET', `/notes/${noteId}/versions`)
      const originalIdx = versions.value.findIndex(v => v.type === 'original')
      if (originalIdx === -1) {
        // 没有"原文"版本，自动补充
        if (currentContent) {
          await apiRequest('POST', `/notes/${noteId}/versions`, {
            content: currentContent,
            type: 'original',
            aiType: '',
            label: '原文',
          })
          versions.value = await apiRequest('GET', `/notes/${noteId}/versions`)
        }
      } else if (currentContent && !versions.value[originalIdx].content) {
        // "原文"版本存在但内容为空，用当前内容补充
        versions.value[originalIdx].content = currentContent
      }
      // 确保"原文"排在最前
      versions.value.sort((a, b) => {
        if (a.type === 'original' && b.type !== 'original') return -1
        if (a.type !== 'original' && b.type === 'original') return 1
        return a.timestamp - b.timestamp
      })
      currentVersionIndex.value = versions.value.length > 0 ? versions.value.length - 1 : -1
    } catch { versions.value = []; currentVersionIndex.value = -1 }
  }

  async function addVersion(noteId, content, aiType, label, originalContent) {
    const typeNames = { style: '风格转换', expand: '内容扩展', summary: '摘要提炼' }
    try {
      await apiRequest('POST', `/notes/${noteId}/versions`, {
        content,
        type: 'ai',
        aiType,
        label: label || typeNames[aiType] || 'AI',
      })
      await loadVersions(noteId, originalContent || '')
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
