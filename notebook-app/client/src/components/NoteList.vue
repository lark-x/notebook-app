<template>
  <section id="note-list-panel">
    <div class="panel-header">
      <h2>{{ nbStore.getCurrentNotebookName() }}</h2>
      <button id="btn-new-note" @click="onCreateNote">+ 新建</button>
    </div>
    <div id="note-list">
      <div v-if="notesStore.notes.length === 0" class="empty-state" style="padding:40px;font-size:13px;">暂无笔记</div>
      <div v-for="note in notesStore.notes" :key="note.id" class="note-item"
        :class="{ active: note.id === notesStore.currentNoteId }" @click="notesStore.selectNote(note.id)">
        <div class="note-title">{{ note.title || '无标题' }}</div>
        <div class="note-preview">{{ getPreview(note) || '空白笔记' }}</div>
        <div class="note-meta">
          <span>{{ formatDate(note.updatedAt) }}</span>
          <div v-if="note.tags && note.tags.length > 0" class="note-tags">
            <span v-for="tag in note.tags" :key="tag" class="tag">{{ tag }}</span>
          </div>
        </div>
      </div>
      <div v-if="notesStore.totalPages > 1" class="pagination">
        <div class="pagination-info">第 {{ notesStore.currentPage }}/{{ notesStore.totalPages }} 页，共 {{ notesStore.totalNotes }} 条</div>
        <div class="pagination-controls">
          <button class="pagination-btn" :disabled="notesStore.currentPage === 1" @click="notesStore.goToPage(1)" title="首页">«</button>
          <button class="pagination-btn" :disabled="notesStore.currentPage === 1" @click="notesStore.goToPage(notesStore.currentPage - 1)" title="上一页">‹</button>
          <button class="pagination-btn" :disabled="notesStore.currentPage === notesStore.totalPages" @click="notesStore.goToPage(notesStore.currentPage + 1)" title="下一页">›</button>
          <button class="pagination-btn" :disabled="notesStore.currentPage === notesStore.totalPages" @click="notesStore.goToPage(notesStore.totalPages)" title="末页">»</button>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { useNotebooksStore } from '../stores/useNotebooksStore.js'
import { useNotesStore } from '../stores/useNotesStore.js'
import { stripHtml, formatDate } from '../utils/helpers.js'

const nbStore = useNotebooksStore()
const notesStore = useNotesStore()

function getPreview(note) { return stripHtml(note.content || '').slice(0, 80) }
async function onCreateNote() { await notesStore.createNote() }
</script>

<style scoped>
/* 笔记列表样式继承自全局 style.css */
</style>
