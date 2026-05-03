<template>
  <main id="editor-panel" @click="mob.isMobile && mob.closeAllDrawers()">
    <div v-if="!notesStore.currentNoteId" class="empty-state"><p>选择或创建一条笔记开始编辑</p></div>
    <div v-else id="editor-container">
      <div class="editor-toolbar">
        <input type="text" id="note-title" placeholder="笔记标题..." :value="noteTitle" @input="onTitleInput">
        <div class="toolbar-actions">
          <button class="toolbar-btn" @click="exec('bold')" title="粗体">B</button>
          <button class="toolbar-btn" @click="exec('italic')"><i>I</i></button>
          <button class="toolbar-btn" @click="exec('underline')"><u>U</u></button>
          <button class="toolbar-btn" @click="exec('strikeThrough')"><s>S</s></button>
          <span class="toolbar-sep"></span>
          <button class="toolbar-btn" @click="exec('insertUnorderedList')">•</button>
          <button class="toolbar-btn" @click="exec('insertOrderedList')">1.</button>
          <button class="toolbar-btn" @click="exec('formatBlock','h2')">H</button>
          <button class="toolbar-btn" @click="exec('formatBlock','blockquote')">❝</button>
          <button class="toolbar-btn" @click="exec('insertHorizontalRule')">—</button>
          <span class="toolbar-sep"></span>
          <button class="toolbar-btn" @click="addTag">🏷️</button>
          <button class="toolbar-btn toolbar-btn-ai" :class="{ active: aiStore.showAiPanel }" @click.stop="aiStore.toggleAiPanel()">✨</button>
          <button class="toolbar-btn" @click="delNote">🗑️</button>
        </div>
      </div>
      <div id="note-tags">
        <span v-for="tag in currentTags" :key="tag" class="tag">{{ tag }} <span class="remove-tag" @click="removeTag(tag)">&times;</span></span>
      </div>
      <div ref="contentRef" id="note-content" contenteditable="true" placeholder="开始输入..." @input="onContentInput"></div>
      <div class="editor-status"><span>{{ notesStore.wordCount }} 字</span><span>{{ notesStore.lastSavedText }}</span></div>
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
const mob = useMobileStore()
const contentRef = ref(null)
const noteTitle = ref('')
const currentTags = ref([])

watch(() => notesStore.currentNoteId, (id) => {
  if (!id) return
  const n = notesStore.notes.find(x => x.id === id)
  if (!n) return
  noteTitle.value = n.title || ''
  currentTags.value = [...(n.tags || [])]
  nextTick(() => { if (contentRef.value) { contentRef.value.innerHTML = n.content || ''; notesStore.updateWordCount(stripHtml(n.content || '')) } })
})

// AI 采纳结果后直接更新编辑器 DOM
watch(() => notesStore.lastAcceptedContent, (content) => {
  if (content && contentRef.value) {
    contentRef.value.innerHTML = content
    notesStore.updateWordCount(stripHtml(content))
  }
})

function onTitleInput(e) { noteTitle.value = e.target.value; notesStore.scheduleSave({ title: noteTitle.value, content: contentRef.value?.innerHTML || '' }) }
function onContentInput() { const h = contentRef.value?.innerHTML || ''; notesStore.updateWordCount(stripHtml(h)); notesStore.scheduleSave({ title: noteTitle.value, content: h }) }
function exec(cmd, val) { document.execCommand(cmd, false, val); contentRef.value?.focus() }
async function addTag() { const t = prompt('请输入标签名称：'); if (t?.trim() && !currentTags.value.includes(t.trim())) { currentTags.value.push(t.trim()); await notesStore.updateNote(notesStore.currentNoteId, { tags: currentTags.value }) } }
async function removeTag(tag) { currentTags.value = currentTags.value.filter(t => t !== tag); await notesStore.updateNote(notesStore.currentNoteId, { tags: currentTags.value }) }
async function delNote() { const n = notesStore.notes.find(x => x.id === notesStore.currentNoteId); if (n && confirm(`确定删除「${n.title || '无标题'}」吗？`)) await notesStore.deleteCurrentNote() }
</script>

<style scoped></style>
