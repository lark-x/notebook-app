<!--
  左侧边栏组件

  包含：
  - Logo 和新建笔记本按钮
  - 搜索框
  - 笔记本列表（支持重命名和删除操作）
  - 底部操作栏（导出、导入、主题切换）
-->

<template>
  <aside id="sidebar">
    <!-- 顶栏：Logo 和新建笔记本按钮 -->
    <div class="sidebar-header">
      <h1 class="logo">NoteFlow</h1>
      <button title="新建笔记本" @click="onNewNotebook">+</button>
    </div>

    <!-- 搜索框 -->
    <div class="sidebar-search">
      <input
        type="text"
        placeholder="搜索笔记..."
        :value="searchQuery"
        @input="onSearchInput"
      >
    </div>

    <!-- 笔记本列表（可滚动区域） -->
    <nav id="notebook-list">
      <!-- 全部笔记入口 -->
      <div
        class="notebook-item"
        :class="{ active: currentNotebookId === 'all' }"
        @click="onSelectNotebook('all')"
      >
        <span class="icon">📋</span>
        <span class="name">全部笔记</span>
        <span class="count">{{ allNotesCount }}</span>
      </div>

      <!-- 笔记本列表项 -->
      <div
        v-for="nb in notebooks"
        :key="nb.id"
        class="notebook-item"
        :class="{ active: currentNotebookId === nb.id }"
        @click="onSelectNotebook(nb.id)"
      >
        <span class="icon">{{ nb.icon || '📓' }}</span>
        <span class="name">{{ nb.name }}</span>
        <span class="count">{{ getNotebookNoteCount(nb.id) }}</span>
        <span class="actions">
          <button class="btn-edit-nb" title="重命名" @click.stop="onRenameNotebook(nb)">✏️</button>
          <button class="btn-del-nb" title="删除" @click.stop="onDeleteNotebook(nb)">✕</button>
        </span>
      </div>
    </nav>

    <!-- 底部操作栏 -->
    <div class="sidebar-footer">
      <button title="导出数据" @click="onExport">导出</button>
      <button title="导入数据" @click="onImport">导入</button>
      <button title="切换主题" @click="onToggleTheme">{{ theme === 'dark' ? '☀️' : '🌙' }}</button>
    </div>

    <!-- 隐藏的文件选择框，用于导入 -->
    <input
      type="file"
      ref="importFileRef"
      accept=".json"
      style="display:none"
      @change="onFileSelected"
    >
  </aside>
</template>

<script setup>
/**
 * 侧边栏组件
 *
 * 管理笔记本列表的显示和交互操作，包括：
 * - 选中笔记本（触发笔记列表刷新）
 * - 创建新笔记本（弹出模态框输入名称）
 * - 重命名和删除笔记本
 * - 搜索笔记
 * - 导入导出数据
 * - 切换主题
 */
import { ref, computed } from 'vue'
import {
  notebooks,
  currentNotebookId,
  selectNotebook,
  createNotebook,
  renameNotebook,
  deleteNotebook
} from '../composables/useNotebooks.js'
import { notes, searchQuery, resetAndFetch } from '../composables/useNotes.js'
import { theme, toggleTheme, exportData, importData } from '../composables/useSettings.js'

/** 文件选择框的模板引用 */
const importFileRef = ref(null)

/** 笔记总数（用于"全部笔记"的计数显示） */
const allNotesCount = computed(() => {
  // 注意：这里显示的是当前已加载的笔记数，实际总数需要从 API 获取
  // 为简化实现，此处使用 notes 列表的长度
  return notes.value.length
})

/**
 * 获取指定笔记本的笔记数量
 * @param {string} notebookId - 笔记本 ID
 * @returns {number} 笔记数量
 */
function getNotebookNoteCount(notebookId) {
  return notes.value.filter(n => n.notebookId === notebookId).length
}

/**
 * 选中笔记本
 * @param {string} id - 笔记本 ID
 */
function onSelectNotebook(id) {
  selectNotebook(id)
}

/**
 * 新建笔记本
 * 使用 prompt 获取名称（简化实现，避免复杂的模态框状态管理）
 */
async function onNewNotebook() {
  const name = prompt('请输入笔记本名称：')
  if (!name || !name.trim()) return
  await createNotebook(name.trim())
}

/**
 * 重命名笔记本
 * @param {Object} nb - 笔记本对象
 */
async function onRenameNotebook(nb) {
  const newName = prompt('请输入新名称：', nb.name)
  if (!newName || !newName.trim() || newName.trim() === nb.name) return
  await renameNotebook(nb.id, newName.trim())
}

/**
 * 删除笔记本
 * @param {Object} nb - 笔记本对象
 */
async function onDeleteNotebook(nb) {
  if (!confirm(`确定删除「${nb.name}」吗？`)) return
  await deleteNotebook(nb.id)
}

/**
 * 搜索输入事件处理
 * 使用防抖避免频繁请求
 */
let searchTimer = null
function onSearchInput(e) {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    searchQuery.value = e.target.value.trim()
    resetAndFetch()
  }, 300)
}

/**
 * 导出数据
 */
async function onExport() {
  try {
    await exportData()
  } catch (e) {
    alert('导出失败：' + e.message)
  }
}

/**
 * 触发文件选择框
 */
function onImport() {
  importFileRef.value?.click()
}

/**
 * 文件选择后解析 JSON 并导入
 * @param {Event} e - 文件选择事件
 */
async function onFileSelected(e) {
  const file = e.target.files?.[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = async (ev) => {
    try {
      const imported = JSON.parse(ev.target.result)
      if (!imported.notebooks || !imported.notes) {
        throw new Error('文件格式无效')
      }

      if (!confirm(`将导入 ${imported.notes.length} 条笔记和 ${imported.notebooks.length} 个笔记本，现有数据将被覆盖，确定继续？`)) {
        return
      }

      await importData(imported)
      // 刷新页面以加载新数据
      window.location.reload()
    } catch (err) {
      alert('导入失败：' + err.message)
    }
  }
  reader.readAsText(file)
  // 清空 input 值，允许重复选择同一文件
  e.target.value = ''
}

/**
 * 切换主题
 */
function onToggleTheme() {
  toggleTheme()
}
</script>

<style scoped>
/* 侧边栏样式继承自全局 style.css */
</style>
