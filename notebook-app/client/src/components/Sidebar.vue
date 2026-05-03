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
        <span class="icon">📋</span><span class="name">全部笔记</span><span class="count">{{ notesStore.notes.length }}</span>
      </div>
      <div v-for="nb in nbStore.notebooks" :key="nb.id" class="notebook-item" :class="{ active: nbStore.currentNotebookId === nb.id }" @click="nbStore.selectNotebook(nb.id)">
        <span class="icon">{{ nb.icon }}</span><span class="name">{{ nb.name }}</span>
        <span class="count">{{ notesStore.notes.filter(n => n.notebookId === nb.id).length }}</span>
        <span class="actions">
          <button @click.stop="onRename(nb)">✏️</button>
          <button @click.stop="onDelete(nb)">✕</button>
        </span>
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

<style scoped></style>
