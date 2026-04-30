<!--
  笔记列表面板组件

  包含：
  - 面板顶栏（当前笔记本名称 + 新建笔记按钮）
  - 笔记列表（每条显示标题、预览、时间、标签）
  - 分页控件（首页/上一页/下一页/末页 + 页码信息）
-->

<template>
  <section id="note-list-panel">
    <!-- 面板顶栏 -->
    <div class="panel-header">
      <h2>{{ currentNotebookName }}</h2>
      <button id="btn-new-note" @click="onCreateNote">+ 新建</button>
    </div>

    <!-- 笔记列表容器 -->
    <div id="note-list">
      <!-- 空状态提示 -->
      <div v-if="notes.length === 0" class="empty-state" style="padding:40px;font-size:13px;">
        暂无笔记
      </div>

      <!-- 笔记列表项 -->
      <div
        v-for="note in notes"
        :key="note.id"
        class="note-item"
        :class="{ active: note.id === currentNoteId }"
        @click="onSelectNote(note.id)"
      >
        <div class="note-title">{{ note.title || '无标题' }}</div>
        <div class="note-preview">{{ getPreview(note) || '空白笔记' }}</div>
        <div class="note-meta">
          <span>{{ formatDate(note.updatedAt) }}</span>
          <div v-if="note.tags && note.tags.length > 0" class="note-tags">
            <span v-for="tag in note.tags" :key="tag" class="tag">{{ tag }}</span>
          </div>
        </div>
      </div>

      <!-- 分页控件（总页数 > 1 时显示） -->
      <div v-if="totalPages > 1" class="pagination">
        <div class="pagination-info">
          第 {{ currentPage }}/{{ totalPages }} 页，共 {{ totalNotes }} 条
        </div>
        <div class="pagination-controls">
          <button
            class="pagination-btn"
            :disabled="currentPage === 1"
            @click="onGoToPage(1)"
            title="首页"
          >«</button>
          <button
            class="pagination-btn"
            :disabled="currentPage === 1"
            @click="onGoToPage(currentPage - 1)"
            title="上一页"
          >‹</button>
          <button
            class="pagination-btn"
            :disabled="currentPage === totalPages"
            @click="onGoToPage(currentPage + 1)"
            title="下一页"
          >›</button>
          <button
            class="pagination-btn"
            :disabled="currentPage === totalPages"
            @click="onGoToPage(totalPages)"
            title="末页"
          >»</button>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
/**
 * 笔记列表面板组件
 *
 * 展示当前笔记本下的笔记列表，支持：
 * - 点击选中笔记
 * - 新建笔记
 * - 分页浏览（首页/上一页/下一页/末页）
 * - 笔记预览（标题、内容摘要、时间、标签）
 */
import { computed } from 'vue'
import { currentNotebookId, getCurrentNotebookName } from '../composables/useNotebooks.js'
import {
  notes,
  currentNoteId,
  currentPage,
  totalPages,
  totalNotes,
  selectNote,
  createNote,
  goToPage
} from '../composables/useNotes.js'
import { stripHtml, formatDate } from '../utils/helpers.js'

/** 当前笔记本名称（响应式） */
const currentNotebookName = computed(() => getCurrentNotebookName())

/**
 * 获取笔记内容预览（前 80 个字符的纯文本）
 * @param {Object} note - 笔记对象
 * @returns {string} 预览文本
 */
function getPreview(note) {
  return stripHtml(note.content || '').slice(0, 80)
}

/**
 * 选中笔记
 * @param {string} id - 笔记 ID
 */
function onSelectNote(id) {
  selectNote(id)
}

/**
 * 创建新笔记
 */
async function onCreateNote() {
  await createNote()
}

/**
 * 跳转到指定页码
 * @param {number} page - 目标页码
 */
function onGoToPage(page) {
  goToPage(page)
}
</script>

<style scoped>
/* 笔记列表样式继承自全局 style.css */
</style>
