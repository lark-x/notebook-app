/**
 * 移动端布局 Store（Pinia）
 */
import { defineStore } from 'pinia'
import { ref, onMounted, onUnmounted } from 'vue'

export const useMobileStore = defineStore('mobile', () => {
  const sidebarOpen = ref(false)
  const noteListOpen = ref(false)
  const aiPanelOpen = ref(false)
  const isMobile = ref(window.innerWidth <= 900)

  function toggleSidebar() {
    sidebarOpen.value = !sidebarOpen.value
    if (sidebarOpen.value) noteListOpen.value = false
  }

  function toggleNoteList() {
    noteListOpen.value = !noteListOpen.value
    if (noteListOpen.value) sidebarOpen.value = false
  }

  function closeAllDrawers() {
    sidebarOpen.value = false
    noteListOpen.value = false
    aiPanelOpen.value = false
  }

  function onResize() {
    isMobile.value = window.innerWidth <= 900
    if (!isMobile.value) closeAllDrawers()
  }

  function useResizeListener() {
    onMounted(() => window.addEventListener('resize', onResize))
    onUnmounted(() => window.removeEventListener('resize', onResize))
  }

  return {
    sidebarOpen, noteListOpen, aiPanelOpen, isMobile,
    toggleSidebar, toggleNoteList, closeAllDrawers, useResizeListener
  }
})
