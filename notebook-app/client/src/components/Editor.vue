<!--
  富文本编辑器组件

  包含：
  - 未选中笔记时的空状态提示
  - 编辑器工具栏（标题输入、格式化按钮、标签、AI 转化、删除）
  - 标签展示区（支持删除标签）
  - contenteditable 可编辑内容区
  - 状态栏（字数统计、保存状态）
  - AI 创意转化面板（弹出层）
-->

<template>
  <main id="editor-panel">
    <!-- 未选中笔记时显示的空状态提示 -->
    <div v-if="!currentNoteId" id="editor-empty" class="empty-state">
      <p>选择或创建一条笔记开始编辑</p>
    </div>

    <!-- 编辑器容器（选中笔记后显示） -->
    <div v-else id="editor-container">
      <!-- 编辑器工具栏 -->
      <div class="editor-toolbar">
        <!-- 笔记标题输入框 -->
        <input
          type="text"
          id="note-title"
          placeholder="笔记标题..."
          :value="noteTitle"
          @input="onTitleInput"
        >

        <!-- 格式化工具按钮组 -->
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
          <button @click="onAddTag" title="添加标签">🏷️</button>
          <button
            class="toolbar-btn toolbar-btn-ai"
            @click="onOpenAiPanel"
            title="AI 创意转化"
          >✨</button>
          <button @click="onDeleteNote" title="删除笔记">🗑️</button>
        </div>
      </div>

      <!-- 标签展示区 -->
      <div id="note-tags">
        <span
          v-for="tag in currentNoteTags"
          :key="tag"
          class="tag"
        >
          {{ tag }}
          <span class="remove-tag" @click="onRemoveTag(tag)">&times;</span>
        </span>
      </div>

      <!-- 可编辑的内容区域（contenteditable） -->
      <div
        ref="contentRef"
        id="note-content"
        contenteditable="true"
        placeholder="开始输入..."
        @input="onContentInput"
      ></div>

      <!-- 编辑器状态栏 -->
      <div class="editor-status">
        <span id="word-count">{{ wordCount }} 字</span>
        <span id="last-saved">{{ lastSavedText }}</span>
      </div>
    </div>

    <!-- AI 创意转化面板（弹出层） -->
    <AiPanel />
  </main>
</template>

<script setup>
/**
 * 富文本编辑器组件
 *
 * 管理笔记的编辑界面，包括：
 * - 标题输入（双向绑定 + 自动保存）
 * - 富文本编辑（contenteditable + execCommand）
 * - 标签管理（添加/删除）
 * - 自动保存（500ms 防抖）
 * - 字数统计
 * - AI 创意转化面板
 */
import { ref, watch, nextTick } from 'vue'
import { currentNoteId, notes, scheduleSave, updateWordCount, wordCount, lastSavedText, deleteCurrentNote } from '../composables/useNotes.js'
import { updateNote } from '../composables/useNotes.js'
import { openAiPanel } from '../composables/useAi.js'
import { stripHtml } from '../utils/helpers.js'
import AiPanel from './AiPanel.vue'

/** contenteditable 元素的模板引用 */
const contentRef = ref(null)

/** 笔记标题（本地状态，与输入框绑定） */
const noteTitle = ref('')

/** 当前笔记的标签列表 */
const currentNoteTags = ref([])

/**
 * 监听当前选中笔记的变化
 * 当用户选中不同笔记时，更新编辑器内容
 */
watch(currentNoteId, (newId) => {
  if (!newId) return
  const note = notes.value.find(n => n.id === newId)
  if (!note) return

  // 更新标题
  noteTitle.value = note.title || ''

  // 更新标签
  currentNoteTags.value = [...(note.tags || [])]

  // 更新编辑器内容（需要等待 DOM 更新）
  nextTick(() => {
    if (contentRef.value) {
      contentRef.value.innerHTML = note.content || ''
      // 更新字数统计
      const text = stripHtml(note.content || '')
      updateWordCount(text)
    }
  })
})

/**
 * 标题输入事件处理
 * @param {Event} e - 输入事件
 */
function onTitleInput(e) {
  noteTitle.value = e.target.value
  // 触发自动保存
  scheduleSave({
    title: noteTitle.value,
    content: contentRef.value?.innerHTML || ''
  })
}

/**
 * 内容输入事件处理
 * contenteditable 区域的 input 事件
 */
function onContentInput() {
  const html = contentRef.value?.innerHTML || ''
  const text = stripHtml(html)
  updateWordCount(text)

  // 触发自动保存
  scheduleSave({
    title: noteTitle.value,
    content: html
  })
}

/**
 * 执行富文本编辑命令
 * 使用浏览器原生的 document.execCommand
 *
 * @param {string} cmd - 命令名称（如 'bold'、'italic'）
 * @param {string} [value] - 命令参数（如 formatBlock 的标签名）
 */
function execCmd(cmd, value = null) {
  document.execCommand(cmd, false, value)
  contentRef.value?.focus()
}

/**
 * 添加标签
 * 使用 prompt 获取标签名称（简化实现）
 */
async function onAddTag() {
  const tag = prompt('请输入标签名称：')
  if (!tag || !tag.trim()) return
  const trimmed = tag.trim()

  // 避免重复添加
  if (currentNoteTags.value.includes(trimmed)) return

  currentNoteTags.value.push(trimmed)

  // 保存到后端
  await updateNote(currentNoteId.value, { tags: currentNoteTags.value })
}

/**
 * 删除标签
 * @param {string} tag - 要删除的标签
 */
async function onRemoveTag(tag) {
  currentNoteTags.value = currentNoteTags.value.filter(t => t !== tag)
  await updateNote(currentNoteId.value, { tags: currentNoteTags.value })
}

/**
 * 删除笔记
 */
async function onDeleteNote() {
  const note = notes.value.find(n => n.id === currentNoteId.value)
  if (!note) return
  if (!confirm(`确定删除「${note.title || '无标题'}」吗？`)) return
  await deleteCurrentNote()
}

/**
 * 打开 AI 创意转化面板
 */
function onOpenAiPanel() {
  openAiPanel()
}
</script>

<style scoped>
/* 编辑器样式继承自全局 style.css */
</style>
