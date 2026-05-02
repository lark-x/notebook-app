import { defineStore } from 'pinia'
import { ref } from 'vue'
import { apiRequest } from '../utils/api.js'

export const useNotebooksStore = defineStore('notebooks', () => {
  const notebooks = ref([])
  const currentNotebookId = ref('all')

  async function loadNotebooks() {
    try { notebooks.value = await apiRequest('GET', '/notebooks') } catch (e) { console.warn('加载笔记本失败:', e.message) }
  }

  async function createNotebook(name, icon) {
    const icons = ['📓', '📔', '📕', '📗', '📘', '📙', '📒', '🗂️']
    const sel = icon || icons[Math.floor(Math.random() * icons.length)]
    try {
      const created = await apiRequest('POST', '/notebooks', { name, icon: sel })
      notebooks.value.push(created)
      return created
    } catch (e) { console.warn('创建失败:', e.message); return null }
  }

  async function renameNotebook(id, newName) {
    const nb = notebooks.value.find(n => n.id === id)
    if (!nb) return
    try { await apiRequest('PUT', `/notebooks/${id}`, { name: newName }); nb.name = newName } catch (e) { nb.name = newName }
  }

  async function deleteNotebook(id) {
    try { await apiRequest('DELETE', `/notebooks/${id}`) } catch (e) { console.warn('删除失败:', e.message) }
    notebooks.value = notebooks.value.filter(n => n.id !== id)
    if (currentNotebookId.value === id) currentNotebookId.value = 'all'
  }

  function selectNotebook(id) { currentNotebookId.value = id }

  function getCurrentNotebookName() {
    if (currentNotebookId.value === 'all') return '全部笔记'
    return notebooks.value.find(n => n.id === currentNotebookId.value)?.name || '笔记'
  }

  return { notebooks, currentNotebookId, loadNotebooks, createNotebook, renameNotebook, deleteNotebook, selectNotebook, getCurrentNotebookName }
})
