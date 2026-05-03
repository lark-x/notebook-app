<template>
  <main id="editor-panel" @click="mob.isMobile && mob.closeAllDrawers()">
    <div v-if="!notesStore.currentNoteId" class="empty-state"><p>选择或创建一条笔记开始编辑</p></div>
    <div v-else id="editor-container">
      <div class="editor-toolbar">
        <input type="text" id="note-title" placeholder="笔记标题..." :value="noteTitle" @input="onTitleInput">
        <div class="toolbar-actions">
          <button class="toolbar-btn toolbar-btn-ai" :class="{ active: aiStore.showAiPanel }" @click.stop="aiStore.toggleAiPanel()">✨</button>
          <button class="toolbar-btn" @click="delNote">🗑️</button>
        </div>
      </div>
      <div v-if="showDiff" class="diff-bar">
        <span class="diff-label">📝 AI 预览 — 确认采纳？</span>
        <div class="diff-actions">
          <button class="diff-btn diff-accept" @click="acceptDiff">✓ 采纳</button>
          <button class="diff-btn diff-reject" @click="rejectDiff">✕ 放弃</button>
        </div>
      </div>
      <div class="version-timeline" v-if="versions.length > 1">
        <div class="version-track">
          <div v-for="(v, i) in versions" :key="v.id" class="version-dot" :class="{ active: i === currentVersionIndex, ai: v.type === 'ai' }" :title="v.label" @click="onRestoreVersion(i)">
            <span class="version-icon">{{ v.type === 'original' ? '📄' : '✨' }}</span>
            <span class="version-label">{{ v.label }}</span>
          </div>
        </div>
      </div>
      <div id="vditor-wrapper"></div>
      <div class="editor-status"><span>{{ wordCount }} 字</span><span>{{ notesStore.lastSavedText }}</span></div>
    </div>
  </main>
</template>

<script setup>
import { ref, watch, nextTick, onUnmounted } from 'vue'
import Vditor from 'vditor'
import 'vditor/dist/index.css'
import { useNotesStore } from '../stores/useNotesStore.js'
import { useAiStore } from '../stores/useAiStore.js'
import { useMobileStore } from '../stores/useMobileStore.js'
import { useVersionStore } from '../stores/useVersionStore.js'
import { stripHtml } from '../utils/helpers.js'

const notesStore = useNotesStore()
const aiStore = useAiStore()
const mob = useMobileStore()
const versionStore = useVersionStore()

const noteTitle = ref('')
const wordCount = ref(0)
const showDiff = ref(false)
const diffContent = ref('')
const pendingAiContent = ref('')
let vditor = null

const versions = ref([])
const currentVersionIndex = ref(0)

function getVditorValue() {
  return vditor ? vditor.getValue() : ''
}

function setVditorValue(val) {
  if (vditor) vditor.setValue(val || '')
}

// 初始化 Vditor
function initVditor() {
  if (vditor) { vditor.destroy(); vditor = null }
  const wrapper = document.getElementById('vditor-wrapper')
  if (!wrapper) return
  wrapper.innerHTML = ''

  vditor = new Vditor(wrapper, {
    mode: 'ir', // 即时渲染模式
    height: '100%',
    placeholder: '开始输入...',
    toolbar: [
      'emoji', 'bold', 'italic', 'strike', '|',
      'line', 'quote', 'list', 'ordered-list', '|',
      'code', 'inline-code', 'table', '|',
      'undo', 'redo', '|',
      'edit-mode', 'preview', 'fullscreen',
    ],
    toolbarConfig: { hide: false },
    cache: { enable: false },
    outline: { enable: false },
    after: () => {
      const n = notesStore.notes.find(x => x.id === notesStore.currentNoteId)
      if (n) {
        const content = n.content || ''
        vditor.setValue(content)
        updateWordCount(content)
      }
    },
    input: (value) => {
      updateWordCount(value)
      notesStore.scheduleSave({ title: noteTitle.value, content: value })
    },
  })
}

function updateWordCount(text) {
  wordCount.value = (text || '').replace(/[#*`>\-\[\]()!\s]/g, '').length
}

// 切换笔记时重新初始化
watch(() => notesStore.currentNoteId, (id) => {
  if (!id) return
  const n = notesStore.notes.find(x => x.id === id)
  if (!n) return
  noteTitle.value = n.title || ''

  // 初始化版本
  versionStore.initNote(id, n.content || '')
  versions.value = versionStore.getVersions(id)
  currentVersionIndex.value = versionStore.currentVersionIndex

  showDiff.value = false
  diffContent.value = ''

  nextTick(() => {
    if (vditor) {
      vditor.setValue(n.content || '')
      updateWordCount(n.content || '')
    } else {
      initVditor()
    }
  })
})

// AI 预览 diff（不替换，先展示）
watch(() => notesStore.pendingAiContent, (content) => {
  if (!content) return
  pendingAiContent.value = content
  showDiff.value = true
  // 用 diff 模式展示差异
  if (vditor) {
    const original = vditor.getValue()
    // 渲染 AI 结果预览
    vditor.setValue(content)
    updateWordCount(content)
  }
})

function acceptDiff() {
  if (!pendingAiContent.value || !notesStore.currentNoteId) return
  const content = pendingAiContent.value

  // 添加版本
  const aiType = aiStore.aiState.currentType
  const typeNames = { style: '风格转换', expand: '内容扩展', summary: '摘要提炼' }
  versionStore.addVersion(notesStore.currentNoteId, content, aiType, typeNames[aiType] || 'AI')
  versions.value = versionStore.getVersions(notesStore.currentNoteId)
  currentVersionIndex.value = versionStore.currentVersionIndex

  // 保存到服务端
  notesStore.updateNote(notesStore.currentNoteId, { content })
  notesStore.fetchNotes()

  showDiff.value = false
  notesStore.pendingAiContent = null
}

function rejectDiff() {
  // 恢复原文
  if (vditor && notesStore.currentNoteId) {
    const versions = versionStore.getVersions(notesStore.currentNoteId)
    const current = versions[currentVersionIndex.value]
    if (current) {
      vditor.setValue(current.content)
      updateWordCount(current.content)
    }
  }
  showDiff.value = false
  notesStore.pendingAiContent = null
}

function onRestoreVersion(index) {
  if (!notesStore.currentNoteId) return
  const v = versionStore.restoreVersion(notesStore.currentNoteId, index)
  if (v && vditor) {
    vditor.setValue(v.content)
    updateWordCount(v.content)
    currentVersionIndex.value = index
    // 保存恢复的版本
    notesStore.updateNote(notesStore.currentNoteId, { content: v.content })
    notesStore.fetchNotes()
  }
}

function onTitleInput(e) {
  noteTitle.value = e.target.value
  notesStore.scheduleSave({ title: noteTitle.value, content: getVditorValue() })
}

async function delNote() {
  const n = notesStore.notes.find(x => x.id === notesStore.currentNoteId)
  if (n && confirm(`确定删除「${n.title || '无标题'}」吗？`)) {
    versionStore.clearNote(notesStore.currentNoteId)
    await notesStore.deleteCurrentNote()
  }
}

onUnmounted(() => { if (vditor) { vditor.destroy(); vditor = null } })
</script>

<style scoped>
#vditor-wrapper { flex:1; min-height:0; overflow:hidden; }
#vditor-wrapper :deep(.vditor) { border:none; border-radius:0; height:100%!important; }
#vditor-wrapper :deep(.vditor-content) { height:100%!important; }

.diff-bar { display:flex; align-items:center; justify-content:space-between; padding:8px 24px; background:#fff3bf; border-bottom:1px solid #ffe066; flex-shrink:0; }
.diff-label { font-size:13px; font-weight:600; color:#e67700; }
.diff-actions { display:flex; gap:8px; }
.diff-btn { padding:5px 16px; border-radius:6px; font-size:12px; font-weight:600; cursor:pointer; border:none; transition:all var(--transition); }
.diff-accept { background:#40c057; color:#fff; }
.diff-accept:hover { background:#37b24d; }
.diff-reject { background:var(--bg); color:var(--text); border:1px solid var(--border); }
.diff-reject:hover { background:var(--bg-hover); }

.version-timeline { padding:6px 24px; border-bottom:1px solid var(--border); background:var(--bg); flex-shrink:0; overflow-x:auto; }
.version-track { display:flex; align-items:center; gap:4px; }
.version-dot { display:flex; align-items:center; gap:4px; padding:3px 10px; border-radius:12px; font-size:11px; cursor:pointer; transition:all .15s; background:var(--bg-panel); border:1px solid var(--border); color:var(--text-secondary); white-space:nowrap; }
.version-dot:hover { border-color:var(--accent); color:var(--accent); }
.version-dot.active { background:var(--accent); color:#fff; border-color:var(--accent); }
.version-dot.ai.active { background:linear-gradient(135deg,#667eea,#764ba2); border-color:transparent; }
.version-icon { font-size:10px; }
.version-label { font-size:11px; }
</style>
