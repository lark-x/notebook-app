<template>
  <aside id="sidebar">
    <div class="sidebar-header">
      <h1 class="logo">NoteFlow</h1>
      <button title="新建笔记本" @click="onNewNotebook">+</button>
    </div>
    <div class="sidebar-search">
      <input type="text" placeholder="搜索笔记..." :value="notesStore.searchQuery" @input="onSearchInput">
    </div>
    <nav id="notebook-list">
      <div class="notebook-item" :class="{ active: nbStore.currentNotebookId === 'all' }" @click="nbStore.selectNotebook('all')">
        <span class="icon">📋</span>
        <span class="name">全部笔记</span>
        <span class="count">{{ notesStore.notes.length }}</span>
      </div>
      <div v-for="nb in nbStore.notebooks" :key="nb.id" class="notebook-item"
        :class="{ active: nbStore.currentNotebookId === nb.id }" @click="nbStore.selectNotebook(nb.id)">
        <span class="icon">{{ nb.icon || '📓' }}</span>
        <span class="name">{{ nb.name }}</span>
        <span class="count">{{ getNotebookNoteCount(nb.id) }}</span>
        <span class="actions">
          <button class="btn-edit-nb" title="重命名" @click.stop="onRenameNotebook(nb)">✏️</button>
          <button class="btn-del-nb" title="删除" @click.stop="onDeleteNotebook(nb)">✕</button>
        </span>
      </div>
    </nav>
    <div class="sidebar-footer">
      <button title="导出数据" @click="onExport">导出</button>
      <button title="导入数据" @click="onImport">导入</button>
      <button title="切换主题" @click="onToggleTheme">{{ settingsStore.theme === 'dark' ? '☀️' : '🌙' }}</button>
    </div>
    <input type="file" ref="importFileRef" accept=".json" style="display:none" @change="onFileSelected">
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

const importFileRef = ref(null)

function getNotebookNoteCount(notebookId) {
  return notesStore.notes.filter(n => n.notebookId === notebookId).length
}

async function onNewNotebook() {
  const name = prompt('请输入笔记本名称：')
  if (!name || !name.trim()) return
  await nbStore.createNotebook(name.trim())
}

async function onRenameNotebook(nb) {
  const newName = prompt('请输入新名称：', nb.name)
  if (!newName || !newName.trim() || newName.trim() === nb.name) return
  await nbStore.renameNotebook(nb.id, newName.trim())
}

async function onDeleteNotebook(nb) {
  if (!confirm(`确定删除「${nb.name}」吗？`)) return
  await nbStore.deleteNotebook(nb.id)
}

let searchTimer = null
function onSearchInput(e) {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    notesStore.searchQuery = e.target.value.trim()
    notesStore.resetAndFetch()
  }, 300)
}

async function onExport() {
  try { await settingsStore.exportData() }
  catch (e) { alert('导出失败：' + e.message) }
}

function onImport() { importFileRef.value?.click() }

async function onFileSelected(e) {
  const file = e.target.files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = async (ev) => {
    try {
      const imported = JSON.parse(ev.target.result)
      if (!imported.notebooks || !imported.notes) throw new Error('文件格式无效')
      if (!confirm(`将导入 ${imported.notes.length} 条笔记和 ${imported.notebooks.length} 个笔记本，现有数据将被覆盖，确定继续？`)) return
      await settingsStore.importData(imported)
      window.location.reload()
    } catch (err) { alert('导入失败：' + err.message) }
  }
  reader.readAsText(file)
  e.target.value = ''
}

function onToggleTheme() { settingsStore.toggleTheme() }
</script>

<style scoped>
/* 侧边栏样式继承自全局 style.css */
</style>
