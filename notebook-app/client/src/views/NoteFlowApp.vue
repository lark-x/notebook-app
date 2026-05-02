<template>
  <div id="app-grid"
    :class="{ 'mobile': mobile.isMobile, 'ai-open': mobile.aiPanelOpen, 'drawer-active': mobile.isMobile && (mobile.sidebarOpen || mobile.noteListOpen || mobile.aiPanelOpen) }"
    @click.self="onGridClick">

    <header v-if="mobile.isMobile" class="mobile-nav">
      <button class="mobile-nav-btn" @click="mobile.toggleSidebar" title="笔记本">☰</button>
      <span class="mobile-nav-title">{{ currentTitle }}</span>
      <button class="mobile-nav-btn portal-btn" @click="goToPortal" title="返回门户">🏠</button>
      <button class="mobile-nav-btn" @click="mobile.toggleNoteList" title="笔记列表">📋</button>
    </header>

    <div v-if="!mobile.isMobile" class="back-to-portal">
      <button @click="goToPortal" title="返回门户">← 门户</button>
    </div>

    <Sidebar :class="{ open: mobile.sidebarOpen }" />
    <NoteList :class="{ open: mobile.noteListOpen }" />
    <Editor />
    <AiPanel :class="{ open: mobile.aiPanelOpen }" />
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import Sidebar from '../components/Sidebar.vue'
import NoteList from '../components/NoteList.vue'
import Editor from '../components/Editor.vue'
import AiPanel from '../ai/components/AiPanel.vue'
import { useNotebooksStore } from '../stores/useNotebooksStore.js'
import { useNotesStore } from '../stores/useNotesStore.js'
import { useAiStore } from '../stores/useAiStore.js'
import { useSettingsStore } from '../stores/useSettingsStore.js'
import { useMobileStore } from '../stores/useMobileStore.js'
import { apiRequest } from '../utils/api.js'

const router = useRouter()
const nbStore = useNotebooksStore()
const notesStore = useNotesStore()
const aiStore = useAiStore()
const settingsStore = useSettingsStore()
const mobile = useMobileStore()

mobile.useResizeListener()

function goToPortal() { router.push('/portal') }

const currentTitle = computed(() => {
  if (notesStore.currentNoteId) {
    const note = notesStore.notes.find(n => n.id === notesStore.currentNoteId)
    if (note) return note.title || '无标题'
  }
  return 'NoteFlow'
})

function onGridClick() {
  if (mobile.isMobile && (mobile.sidebarOpen || mobile.noteListOpen || mobile.aiPanelOpen)) {
    mobile.closeAllDrawers()
  }
}

onMounted(async () => {
  await nbStore.loadNotebooks()
  await notesStore.fetchNotes()
  await aiStore.checkAiStatus()
  try {
    const data = await apiRequest('GET', '/data')
    if (data.settings?.theme) await settingsStore.applyTheme(data.settings.theme)
  } catch (e) {
    console.warn('加载设置失败:', e.message)
  }
})
</script>

<style scoped>
.back-to-portal { position: absolute; top: 12px; left: 12px; z-index: 10; }

.back-to-portal button {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  background: var(--bg-hover);
  border: 1px solid var(--border);
  border-radius: 6px;
  font-size: 13px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all var(--transition);
}

.back-to-portal button:hover { background: var(--bg-active); color: var(--text); }

.mobile-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  padding-top: calc(8px + env(safe-area-inset-top));
  background: var(--bg-sidebar);
  color: var(--text-sidebar);
  min-height: 44px;
  flex-shrink: 0;
}

.mobile-nav-title {
  font-size: 15px;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
  text-align: center;
  padding: 0 8px;
}

.mobile-nav-btn {
  background: none;
  border: none;
  color: var(--text-sidebar);
  font-size: 20px;
  padding: 4px 10px;
  cursor: pointer;
  border-radius: 6px;
  flex-shrink: 0;
}

.mobile-nav-btn:hover { background: rgba(255,255,255,0.1); }

.drawer-active::before {
  content: '';
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.4);
  z-index: 100;
  pointer-events: none;
}
</style>
