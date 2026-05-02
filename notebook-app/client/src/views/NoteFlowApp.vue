<template>
  <div id="app-grid" :class="{ mobile: mob.isMobile, 'ai-open': mob.aiPanelOpen, 'drawer-active': mob.isMobile && (mob.sidebarOpen || mob.noteListOpen || mob.aiPanelOpen) }" @click.self="onGridClick">
    <header v-if="mob.isMobile" class="mobile-nav">
      <button class="mobile-nav-btn" @click="mob.toggleSidebar">☰</button>
      <span class="mobile-nav-title">{{ currentTitle }}</span>
      <button class="mobile-nav-btn" @click="router.push('/portal')">🏠</button>
      <button class="mobile-nav-btn" @click="mob.toggleNoteList">📋</button>
    </header>
    <div v-if="!mob.isMobile" class="back-to-portal"><button @click="router.push('/portal')">← 门户</button></div>
    <Sidebar :class="{ open: mob.sidebarOpen }" />
    <NoteList :class="{ open: mob.noteListOpen }" />
    <Editor />
    <AiPanel :class="{ open: mob.aiPanelOpen }" />
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
const mob = useMobileStore()
mob.useResizeListener()

const currentTitle = computed(() => {
  if (notesStore.currentNoteId) { const n = notesStore.notes.find(x => x.id === notesStore.currentNoteId); if (n) return n.title || '无标题' }
  return 'NoteFlow'
})

function onGridClick() { if (mob.isMobile && (mob.sidebarOpen || mob.noteListOpen || mob.aiPanelOpen)) mob.closeAllDrawers() }

onMounted(async () => {
  await nbStore.loadNotebooks()
  await notesStore.fetchNotes()
  await aiStore.checkAiStatus()
  try { const d = await apiRequest('GET', '/data'); if (d.settings?.theme) await settingsStore.applyTheme(d.settings.theme) } catch {}
})
</script>

<style scoped>
.back-to-portal { position:absolute; top:12px; left:12px; z-index:10; }
.back-to-portal button { display:flex; align-items:center; gap:4px; padding:6px 12px; background:var(--bg-hover); border:1px solid var(--border); border-radius:6px; font-size:13px; color:var(--text-secondary); cursor:pointer; transition:all var(--transition); }
.back-to-portal button:hover { background:var(--bg-active); color:var(--text); }
.mobile-nav { display:flex; align-items:center; justify-content:space-between; padding:8px 12px; padding-top:calc(8px + env(safe-area-inset-top)); background:var(--bg-sidebar); color:var(--text-sidebar); min-height:44px; flex-shrink:0; }
.mobile-nav-title { font-size:15px; font-weight:600; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; flex:1; text-align:center; padding:0 8px; }
.mobile-nav-btn { background:none; border:none; color:var(--text-sidebar); font-size:20px; padding:4px 10px; cursor:pointer; border-radius:6px; flex-shrink:0; }
.mobile-nav-btn:hover { background:rgba(255,255,255,.1); }
.drawer-active::before { content:''; position:fixed; inset:0; background:rgba(0,0,0,.4); z-index:100; pointer-events:none; }
</style>
