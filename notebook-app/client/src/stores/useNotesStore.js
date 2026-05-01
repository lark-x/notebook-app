/**
 * 笔记管理 Store（Pinia）
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { apiRequest } from '../utils/api.js'
import { stripHtml } from '../utils/helpers.js'
import { useNotebooksStore } from './useNotebooksStore.js'
import { useMobileStore } from './useMobileStore.js'

export const useNotesStore = defineStore('notes', () => {
  const notes = ref([])
  const currentNoteId = ref(null)
  const searchQuery = ref('')
  const currentPage = ref(1)
  const pageSize = ref(15)
  const totalNotes = ref(0)
  const totalPages = ref(0)
  const lastSavedText = ref('')
  const wordCount = ref(0)

  let saveTimer = null

  function calcTotalPages() {
    return Math.max(1, Math.ceil(totalNotes.value / pageSize.value))
  }

  async function fetchNotes() {
    try {
      const nbStore = useNotebooksStore()
      const params = new URLSearchParams({ page: currentPage.value, pageSize: pageSize.value })
      if (nbStore.currentNotebookId !== 'all') params.set('notebookId', nbStore.currentNotebookId)
      if (searchQuery.value) params.set('search', searchQuery.value)

      const result = await apiRequest('GET', `/notes?${params.toString()}`)
      notes.value = result.notes
      totalNotes.value = result.total
      currentPage.value = result.page
      totalPages.value = calcTotalPages()
    } catch (e) {
      console.warn('获取笔记列表失败:', e.message)
      notes.value = []
      totalNotes.value = 0
    }
  }

  async function resetAndFetch() {
    currentPage.value = 1
    await fetchNotes()
  }

  async function goToPage(page) {
    if (page < 1 || page > totalPages.value || page === currentPage.value) return
    currentPage.value = page
    await fetchNotes()
  }

  function selectNote(id) {
    const note = notes.value.find(n => n.id === id)
    if (!note) return null
    currentNoteId.value = id
    const mobileStore = useMobileStore()
    mobileStore.closeAllDrawers()
    return note
  }

  function getCurrentNote() {
    return notes.value.find(n => n.id === currentNoteId.value) || null
  }

  async function createNote() {
    const nbStore = useNotebooksStore()
    const notebookId = nbStore.currentNotebookId === 'all' ? 'default' : nbStore.currentNotebookId
    try {
      const created = await apiRequest('POST', '/notes', { notebookId, title: '', content: '', tags: [] })
      currentPage.value = 1
      await fetchNotes()
      currentNoteId.value = created.id
      return created
    } catch (e) {
      console.warn('创建笔记失败:', e.message)
      return null
    }
  }

  async function updateNote(id, updates) {
    try {
      await apiRequest('PUT', `/notes/${id}`, updates)
      const note = notes.value.find(n => n.id === id)
      if (note) {
        Object.assign(note, updates)
        note.updatedAt = Date.now()
      }
      return true
    } catch (e) {
      console.warn('更新笔记失败:', e.message)
      return false
    }
  }

  async function deleteCurrentNote() {
    if (!currentNoteId.value) return false
    try {
      await apiRequest('DELETE', `/notes/${currentNoteId.value}`)
    } catch (e) {
      console.warn('删除笔记失败:', e.message)
    }
    currentNoteId.value = null
    await fetchNotes()
    return true
  }

  function scheduleSave(noteData) {
    clearTimeout(saveTimer)
    saveTimer = setTimeout(async () => {
      if (!currentNoteId.value) return
      await updateNote(currentNoteId.value, { title: noteData.title, content: noteData.content })
      lastSavedText.value = `已保存 ${new Date().toLocaleTimeString('zh-CN')}`
      await fetchNotes()
    }, 500)
  }

  function updateWordCount(text) {
    wordCount.value = text.length
  }

  return {
    notes, currentNoteId, searchQuery, currentPage, pageSize, totalNotes, totalPages,
    lastSavedText, wordCount,
    fetchNotes, resetAndFetch, goToPage, selectNote, getCurrentNote,
    createNote, updateNote, deleteCurrentNote, scheduleSave, updateWordCount
  }
})
