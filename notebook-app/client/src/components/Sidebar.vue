<template>
  <aside id="sidebar">
    <div class="sidebar-header">
      <h1 class="logo">NoteFlow</h1>
      <button title="新建笔记本" @click="onNew">+</button>
    </div>
    <div class="sidebar-search">
      <input type="text" placeholder="搜索笔记..." :value="notesStore.searchQuery" @input="onSearch">
    </div>
    <nav id="notebook-list">
      <div class="notebook-item" :class="{ active: nbStore.currentNotebookId === 'all' }" @click="nbStore.selectNotebook('all')">
        <span class="icon">📋</span><span class="name">全部笔记</span><span class="count">{{ notesStore.sidebarNotes.length }}</span>
      </div>
      <div v-for="nb in nbStore.notebooks" :key="nb.id">
        <div class="notebook-item" :class="{ active: nbStore.currentNotebookId === nb.id }" @click="nbStore.selectNotebook(nb.id)">
          <span class="expand-toggle" @click="nbStore.toggleNotebookExpand(nb.id, $event)" :class="{ expanded: nbStore.expandedNotebookIds.has(nb.id) }">▸</span>
          <span class="icon">{{ nb.icon }}</span><span class="name">{{ nb.name }}</span>
          <span class="count">{{ notesStore.sidebarNotes.filter(n => n.notebookId === nb.id).length }}</span>
          <span class="actions">
            <button @click.stop="onRename(nb)">✏️</button>
            <button @click.stop="onDelete(nb)">✕</button>
          </span>
        </div>
        <div v-if="nbStore.expandedNotebookIds.has(nb.id)" class="notebook-notes">
          <div v-for="note in notesStore.sidebarNotes.filter(n => n.notebookId === nb.id)" :key="note.id" class="sub-note-item" :class="{ active: note.id === notesStore.currentNoteId }" @click="selectAndLoad(note.id)">
            <span class="sub-note-title">{{ note.title || '无标题' }}</span>
          </div>
          <div v-if="!notesStore.sidebarNotes.filter(n => n.notebookId === nb.id).length" class="sub-note-empty">暂无笔记</div>
        </div>
      </div>
    </nav>
    <div class="sidebar-footer">
      <button @click="onExport">导出</button>
      <button @click="onImport">导入</button>
      <button @click="settingsStore.toggleTheme()">{{ settingsStore.theme === 'dark' ? '☀️' : '🌙' }}</button>
    </div>
    <input type="file" ref="fileRef" accept=".json" style="display:none" @change="onFile">
  </aside>
</template>

<script setup>
import { ref } from 'vue'
import { useNotebooksStore } from '../stores/useNotebooksStore.js'
import { useNotesStore } from '../stores/useNotesStore.js'
import { useSettingsStore } from '../stores/useSettingsStore.js'

const nbStore = useNotebooksStore()
const notesStore = useNotesStore()
const settingsStore = useSettingsStore()
const fileRef = ref(null)

async function onNew() { const n = prompt('请输入笔记本名称：'); if (n?.trim()) await nbStore.createNotebook(n.trim()) }
async function onRename(nb) { const n = prompt('请输入新名称：', nb.name); if (n?.trim() && n.trim() !== nb.name) await nbStore.renameNotebook(nb.id, n.trim()) }
async function onDelete(nb) { if (confirm(`确定删除「${nb.name}」吗？`)) await nbStore.deleteNotebook(nb.id) }

function selectAndLoad(noteId) {
  // 切换到对应笔记本并选中笔记
  const note = notesStore.sidebarNotes.find(n => n.id === noteId)
  if (note) {
    nbStore.selectNotebook(note.notebookId)
    notesStore.selectNote(noteId)
  }
}

let timer = null
function onSearch(e) { clearTimeout(timer); timer = setTimeout(() => { notesStore.searchQuery = e.target.value.trim(); notesStore.resetAndFetch() }, 300) }

async function onExport() { try { await settingsStore.exportData() } catch (e) { alert('导出失败') } }
function onImport() { fileRef.value?.click() }
async function onFile(e) {
  const f = e.target.files?.[0]; if (!f) return
  const r = new FileReader()
  r.onload = async (ev) => {
    try {
      const d = JSON.parse(ev.target.result)
      if (!d.notebooks || !d.notes) throw new Error('格式无效')
      if (!confirm(`将导入 ${d.notes.length} 条笔记，现有数据将被覆盖？`)) return
      await settingsStore.importData(d); window.location.reload()
    } catch (err) { alert('导入失败：' + err.message) }
  }
  r.readAsText(f); e.target.value = ''
}
</script>

<style scoped>
.expand-toggle { font-size:10px; width:14px; display:inline-flex; align-items:center; justify-content:center; cursor:pointer; transition:transform .2s; flex-shrink:0; color:var(--text-sidebar-dim); }
.expand-toggle.expanded { transform:rotate(90deg); }
.notebook-notes { padding-left:20px; }
.sub-note-item { padding:6px 12px; font-size:13px; color:var(--text-sidebar-dim); cursor:pointer; border-radius:4px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; transition:background .15s; }
.sub-note-item:hover { background:rgba(255,255,255,.06); color:var(--text-sidebar); }
.sub-note-item.active { background:rgba(255,255,255,.12); color:#fff; }
.sub-note-empty { padding:6px 12px; font-size:12px; color:var(--text-sidebar-dim); opacity:.6; }
</style>
