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
      <div class="version-timeline" v-if="versionStore.versions.length > 1">
        <div class="version-track">
          <div v-for="(v, i) in versionStore.versions" :key="v.id" class="version-dot" :class="{ active: i === versionStore.currentVersionIndex, ai: v.type === 'ai' }" :title="v.label" @click="onRestoreVersion(i)">
            <span class="version-icon">{{ v.type === 'original' ? '📄' : '✨' }}</span>
            <span class="version-label">{{ v.label }}</span>
          </div>
        </div>
      </div>
      <MdEditor
        v-model="editorContent"
        :theme="editorTheme"
        :preview="true"
        :htmlPreview="false"
        style="flex:1;min-height:0;"
        @onHtmlChanged="onHtmlChanged"
      />
      <div class="editor-status"><span>{{ wordCount }} 字</span><span>{{ notesStore.lastSavedText }}</span></div>
    </div>
  </main>
</template>

<script setup>
import { ref, watch, nextTick, computed } from 'vue'
import { MdEditor } from 'md-editor-v3'
import 'md-editor-v3/lib/style.css'
import { useNotesStore } from '../stores/useNotesStore.js'
import { useAiStore } from '../stores/useAiStore.js'
import { useMobileStore } from '../stores/useMobileStore.js'
import { useVersionStore } from '../stores/useVersionStore.js'
import { useSettingsStore } from '../stores/useSettingsStore.js'

const notesStore = useNotesStore()
const aiStore = useAiStore()
const mob = useMobileStore()
const versionStore = useVersionStore()
const settingsStore = useSettingsStore()

const noteTitle = ref('')
const editorContent = ref('')
const wordCount = ref(0)
const showDiff = ref(false)
const pendingAiContent = ref('')
const skipSave = ref(false)

const editorTheme = computed(() => settingsStore.theme === 'dark' ? 'dark' : 'light')

function updateWordCount(text) {
  wordCount.value = (text || '').replace(/[#*`>\-\[\]()!\s]/g, '').length
}

// 切换笔记
watch(() => notesStore.currentNoteId, async (id) => {
  if (!id) return
  const n = notesStore.notes.find(x => x.id === id)
  if (!n) return
  noteTitle.value = n.title || ''
  editorContent.value = n.content || ''
  updateWordCount(n.content || '')
  showDiff.value = false
  pendingAiContent.value = ''
  await versionStore.loadVersions(id)
})

// AI 预览
watch(() => notesStore.pendingAiContent, (content) => {
  if (!content) return
  pendingAiContent.value = content
  showDiff.value = true
  skipSave.value = true
  editorContent.value = content
  updateWordCount(content)
  nextTick(() => { skipSave.value = false })
})

// 内容变化 → 保存
watch(editorContent, (val) => {
  if (skipSave.value || showDiff.value) return
  updateWordCount(val)
  notesStore.scheduleSave({ title: noteTitle.value, content: val })
})

function acceptDiff() {
  if (!pendingAiContent.value || !notesStore.currentNoteId) return
  const content = pendingAiContent.value
  // 保存版本到 DB
  versionStore.addVersion(notesStore.currentNoteId, content, aiStore.aiState.currentType)
  // 更新笔记
  notesStore.updateNote(notesStore.currentNoteId, { content })
  notesStore.fetchNotes()
  showDiff.value = false
  notesStore.pendingAiContent = null
  pendingAiContent.value = ''
}

function rejectDiff() {
  // 恢复到当前版本
  const v = versionStore.versions[versionStore.currentVersionIndex]
  if (v) {
    skipSave.value = true
    editorContent.value = v.content
    updateWordCount(v.content)
    nextTick(() => { skipSave.value = false })
  }
  showDiff.value = false
  notesStore.pendingAiContent = null
  pendingAiContent.value = ''
}

function onRestoreVersion(index) {
  const v = versionStore.restoreVersion(index)
  if (v) {
    skipSave.value = true
    editorContent.value = v.content
    updateWordCount(v.content)
    notesStore.updateNote(notesStore.currentNoteId, { content: v.content })
    notesStore.fetchNotes()
    nextTick(() => { skipSave.value = false })
  }
}

function onTitleInput(e) {
  noteTitle.value = e.target.value
  notesStore.scheduleSave({ title: noteTitle.value, content: editorContent.value })
}

function onHtmlChanged() { /* noop - html preview handled by md-editor */ }

async function delNote() {
  const n = notesStore.notes.find(x => x.id === notesStore.currentNoteId)
  if (n && confirm(`确定删除「${n.title || '无标题'}」吗？`)) {
    await notesStore.deleteCurrentNote()
  }
}
</script>

<style scoped>
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
