/**
 * 笔记本管理 Store（Pinia）
 */
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { apiRequest } from '../utils/api.js'
import { genId } from '../utils/helpers.js'

export const useNotebooksStore = defineStore('notebooks', () => {
  const notebooks = ref([])
  const currentNotebookId = ref('all')

  async function loadNotebooks() {
    try {
      notebooks.value = await apiRequest('GET', '/notebooks')
    } catch (e) {
      console.warn('加载笔记本列表失败:', e.message)
    }
  }

  async function createNotebook(name, icon) {
    const icons = ['📓', '📔', '📕', '📗', '📘', '📙', '📒', '🗂️']
    const selectedIcon = icon || icons[Math.floor(Math.random() * icons.length)]
    try {
      const created = await apiRequest('POST', '/notebooks', { name, icon: selectedIcon })
      notebooks.value.push(created)
      return created
    } catch (e) {
      console.warn('创建笔记本失败:', e.message)
      const local = { id: genId(), name, icon: selectedIcon }
      notebooks.value.push(local)
      return local
    }
  }

  async function renameNotebook(id, newName) {
    const nb = notebooks.value.find(n => n.id === id)
    if (!nb) return false
    try {
      await apiRequest('PUT', `/notebooks/${id}`, { name: newName })
      nb.name = newName
      return true
    } catch (e) {
      console.warn('重命名笔记本失败:', e.message)
      nb.name = newName
      return false
    }
  }

  async function deleteNotebook(id) {
    try {
      await apiRequest('DELETE', `/notebooks/${id}`)
    } catch (e) {
      console.warn('删除笔记本失败:', e.message)
    }
    notebooks.value = notebooks.value.filter(n => n.id !== id)
    if (currentNotebookId.value === id) currentNotebookId.value = 'all'
    return true
  }

  function selectNotebook(id) {
    currentNotebookId.value = id
  }

  function getCurrentNotebookName() {
    if (currentNotebookId.value === 'all') return '全部笔记'
    const nb = notebooks.value.find(n => n.id === currentNotebookId.value)
    return nb ? nb.name : '笔记'
  }

  return {
    notebooks, currentNotebookId,
    loadNotebooks, createNotebook, renameNotebook, deleteNotebook,
    selectNotebook, getCurrentNotebookName
  }
})
