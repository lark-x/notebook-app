<template>
  <section id="note-list-panel">
    <div class="panel-header">
      <h2>{{ nbStore.getCurrentNotebookName() }}</h2>
      <button id="btn-new-note" @click="notesStore.createNote()">+ 新建</button>
    </div>
    <div id="note-list">
      <div v-if="!notesStore.notes.length" class="empty-state" style="padding:40px;font-size:13px;">暂无笔记</div>
      <div v-for="note in notesStore.notes" :key="note.id" class="note-item" :class="{ active: note.id === notesStore.currentNoteId }" @click="notesStore.selectNote(note.id)">
        <div class="note-title">{{ note.title || '无标题' }}</div>
        <div class="note-preview">{{ stripHtml(note.content || '').slice(0, 80) || '空白笔记' }}</div>
        <div class="note-meta">
          <span>{{ formatDate(note.updatedAt) }}</span>
          <div v-if="note.tags?.length" class="note-tags"><span v-for="t in note.tags" :key="t" class="tag">{{ t }}</span></div>
        </div>
      </div>
      <div v-if="notesStore.totalPages > 1" class="pagination">
        <div class="pagination-info">第 {{ notesStore.currentPage }}/{{ notesStore.totalPages }} 页，共 {{ notesStore.totalNotes }} 条</div>
        <div class="pagination-controls">
          <button class="pagination-btn" :disabled="notesStore.currentPage===1" @click="notesStore.goToPage(1)">«</button>
          <button class="pagination-btn" :disabled="notesStore.currentPage===1" @click="notesStore.goToPage(notesStore.currentPage-1)">‹</button>
          <button class="pagination-btn" :disabled="notesStore.currentPage===notesStore.totalPages" @click="notesStore.goToPage(notesStore.currentPage+1)">›</button>
          <button class="pagination-btn" :disabled="notesStore.currentPage===notesStore.totalPages" @click="notesStore.goToPage(notesStore.totalPages)">»</button>
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
</script>

<style scoped></style>
