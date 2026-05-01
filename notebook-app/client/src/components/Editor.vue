<template>
  <main id="editor-panel" @click="onEditorPanelClick">
    <div v-if="!notesStore.currentNoteId" id="editor-empty" class="empty-state">
      <p>选择或创建一条笔记开始编辑</p>
    </div>
    <div v-else id="editor-container">
      <div class="editor-toolbar">
        <input type="text" id="note-title" placeholder="笔记标题..." :value="noteTitle" @input="onTitleInput">
        <div class="toolbar-actions">
          <button class="toolbar-btn" @click="execCmd('bold')" title="粗体">B</button>
          <button class="toolbar-btn" @click="execCmd('italic')" title="斜体"><i>I</i></button>
          <button class="toolbar-btn" @click="execCmd('underline')" title="下划线"><u>U</u></button>
          <button class="toolbar-btn" @click="execCmd('strikeThrough')" title="删除线"><s>S</s></button>
          <span class="toolbar-sep"></span>
          <button class="toolbar-btn" @click="execCmd('insertUnorderedList')" title="无序列表">•</button>
          <button class="toolbar-btn" @click="execCmd('insertOrderedList')" title="有序列表">1.</button>
          <button class="toolbar-btn" @click="execCmd('formatBlock', 'h2')" title="标题">H</button>
          <button class="toolbar-btn" @click="execCmd('formatBlock', 'blockquote')" title="引用">❝</button>
          <button class="toolbar-btn" @click="execCmd('insertHorizontalRule')" title="分割线">—</button>
          <span class="toolbar-sep"></span>
          <button class="toolbar-btn" @click="onAddTag" title="添加标签">🏷️</button>
          <button class="toolbar-btn toolbar-btn-ai" :class="{ active: aiStore.showAiPanel }" @click="aiStore.toggleAiPanel()" title="AI 创意转化">✨</button>
          <button class="toolbar-btn" @click="onDeleteNote" title="删除笔记">🗑️</button>
        </div>
      </div>
      <div id="note-tags">
        <span v-for="tag in currentNoteTags" :key="tag" class="tag">
          {{ tag }}
          <span class="remove-tag" @click="onRemoveTag(tag)">&times;</span>
        </span>
      </div>
      <div ref="contentRef" id="note-content" contenteditable="true" placeholder="开始输入..." @input="onContentInput"></div>
      <div class="editor-status">
        <span>{{ notesStore.wordCount }} 字</span>
        <span>{{ notesStore.lastSavedText }}</span>
      </div>
    </div>
  </main>
</template>

<script setup>
import { ref, watch, nextTick } from 'vue'
import { useNotesStore } from '../stores/useNotesStore.js'
import { useAiStore } from '../stores/useAiStore.js'
import { useMobileStore } from '../stores/useMobileStore.js'
import { stripHtml } from '../utils/helpers.js'

const notesStore = useNotesStore()
const aiStore = useAiStore()
const mobile = useMobileStore()

const contentRef = ref(null)
const noteTitle = ref('')
const currentNoteTags = ref([])

watch(() => notesStore.currentNoteId, (newId) => {
  if (!newId) return
  const note = notesStore.notes.find(n => n.id === newId)
  if (!note) return
  noteTitle.value = note.title || ''
  currentNoteTags.value = [...(note.tags || [])]
  nextTick(() => {
    if (contentRef.value) {
      contentRef.value.innerHTML = note.content || ''
      notesStore.updateWordCount(stripHtml(note.content || ''))
    }
  })
})

function onTitleInput(e) {
  noteTitle.value = e.target.value
  notesStore.scheduleSave({ title: noteTitle.value, content: contentRef.value?.innerHTML || '' })
}

function onContentInput() {
  const html = contentRef.value?.innerHTML || ''
  notesStore.updateWordCount(stripHtml(html))
  notesStore.scheduleSave({ title: noteTitle.value, content: html })
}

function execCmd(cmd, value = null) {
  document.execCommand(cmd, false, value)
  contentRef.value?.focus()
}

async function onAddTag() {
  const tag = prompt('请输入标签名称：')
  if (!tag || !tag.trim()) return
  const trimmed = tag.trim()
  if (currentNoteTags.value.includes(trimmed)) return
  currentNoteTags.value.push(trimmed)
  await notesStore.updateNote(notesStore.currentNoteId, { tags: currentNoteTags.value })
}

async function onRemoveTag(tag) {
  currentNoteTags.value = currentNoteTags.value.filter(t => t !== tag)
  await notesStore.updateNote(notesStore.currentNoteId, { tags: currentNoteTags.value })
}

async function onDeleteNote() {
  const note = notesStore.notes.find(n => n.id === notesStore.currentNoteId)
  if (!note) return
  if (!confirm(`确定删除「${note.title || '无标题'}」吗？`)) return
  await notesStore.deleteCurrentNote()
}

function onEditorPanelClick() {
  if (mobile.isMobile) mobile.closeAllDrawers()
}
</script>

<style scoped>
/* 编辑器样式继承自全局 style.css */
</style>
