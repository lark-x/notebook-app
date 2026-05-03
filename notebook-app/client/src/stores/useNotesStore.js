import { defineStore } from 'pinia'
import { ref } from 'vue'
import { apiRequest } from '../utils/api.js'
import { useNotebooksStore } from './useNotebooksStore.js'
import { useMobileStore } from './useMobileStore.js'

export const useNotesStore = defineStore('notes', () => {
  const notes = ref([])
  const sidebarNotes = ref([])
  const currentNoteId = ref(null)
  const searchQuery = ref('')
  const currentPage = ref(1)
  const pageSize = ref(15)
  const totalNotes = ref(0)
  const totalPages = ref(0)
  const lastSavedText = ref('')
  const wordCount = ref(0)
  const pendingAiContent = ref(null)
  let saveTimer = null

  async function fetchNotes() {
    try {
      const nb = useNotebooksStore()
      const p = new URLSearchParams({ page: currentPage.value, pageSize: pageSize.value })
      if (nb.currentNotebookId !== 'all') p.set('notebookId', nb.currentNotebookId)
      if (searchQuery.value) p.set('search', searchQuery.value)
      const r = await apiRequest('GET', `/notes?${p}`)
      notes.value = r.notes; totalNotes.value = r.total; currentPage.value = r.page
      totalPages.value = Math.max(1, Math.ceil(r.total / pageSize.value))
    } catch (e) { notes.value = []; totalNotes.value = 0 }
  }

  async function fetchSidebarNotes() {
    try {
      const r = await apiRequest('GET', '/notes?pageSize=9999')
      sidebarNotes.value = r.notes
    } catch { sidebarNotes.value = [] }
  }

  async function resetAndFetch() { currentPage.value = 1; await fetchNotes() }

  async function goToPage(page) {
    if (page < 1 || page > totalPages.value || page === currentPage.value) return
    currentPage.value = page; await fetchNotes()
  }

  function selectNote(id) {
    if (!notes.value.find(n => n.id === id)) return null
    currentNoteId.value = id
    useMobileStore().closeAllDrawers()
    return id
  }

  async function createNote() {
    const nb = useNotebooksStore()
    const nbId = nb.currentNotebookId === 'all' ? 'default' : nb.currentNotebookId
    try {
      const c = await apiRequest('POST', '/notes', { notebookId: nbId, title: '', content: '', tags: [] })
      currentPage.value = 1; await fetchNotes(); await fetchSidebarNotes(); currentNoteId.value = c.id; return c
    } catch (e) { return null }
  }

  async function updateNote(id, updates) {
    try {
      await apiRequest('PUT', `/notes/${id}`, updates)
      const n = notes.value.find(x => x.id === id)
      if (n) { Object.assign(n, updates); n.updatedAt = Date.now() }
      const sn = sidebarNotes.value.find(x => x.id === id)
      if (sn) { Object.assign(sn, updates); sn.updatedAt = Date.now() }
      return true
    } catch (e) { return false }
  }

  async function deleteCurrentNote() {
    if (!currentNoteId.value) return
    try { await apiRequest('DELETE', `/notes/${currentNoteId.value}`) } catch (e) {}
    currentNoteId.value = null; await fetchNotes(); await fetchSidebarNotes()
  }

  function scheduleSave(data) {
    clearTimeout(saveTimer)
    saveTimer = setTimeout(async () => {
      if (!currentNoteId.value) return
      await updateNote(currentNoteId.value, { title: data.title, content: data.content })
      lastSavedText.value = `已保存 ${new Date().toLocaleTimeString('zh-CN')}`
      await fetchNotes()
    }, 500)
  }

  function updateWordCount(text) { wordCount.value = text.length }

  return {
    notes, sidebarNotes, currentNoteId, searchQuery, currentPage, pageSize, totalNotes, totalPages,
    lastSavedText, wordCount, pendingAiContent,
    fetchNotes, fetchSidebarNotes, resetAndFetch, goToPage, selectNote, createNote, updateNote,
    deleteCurrentNote, scheduleSave, updateWordCount,
  }
})
