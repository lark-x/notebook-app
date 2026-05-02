<template>
  <aside id="ai-panel">
    <div class="ai-panel-header">
      <h3>✨ AI 创意转化</h3>
      <button class="ai-panel-close" @click="onClose">&times;</button>
    </div>
    <div class="ai-panel-body">
      <div class="ai-transform-types">
        <button v-for="(config, key) in AI_TRANSFORM_TYPES" :key="key" class="ai-type-btn"
          :class="{ active: aiStore.aiState.currentType === key }" @click="onSelectType(key)">
          {{ config.icon }} {{ config.name }}
        </button>
      </div>

      <AiKeywords :keywords="aiStore.aiState.keywords" @add="onAddKeyword" @remove="onRemoveKeyword" />

      <div v-if="!aiStore.aiState.apiConfigured" class="ai-not-configured">
        <p>⚠️ AI API 未配置</p>
        <p>请在项目根目录的 <code>.env</code> 文件中设置 <code>AI_API_KEY</code></p>
        <p>支持 OpenAI、DeepSeek、Qwen 等 OpenAI 兼容接口</p>
      </div>

      <button class="ai-transform-btn" :disabled="aiStore.aiState.loading" @click="onTransform">
        {{ aiStore.aiState.loading ? '正在转化中...' : '✨ 开始转化' }}
      </button>

      <div v-if="aiStore.aiState.loading" class="ai-loading">
        <span>AI 正在思考中</span>
        <span class="ai-loading-dots"><span></span><span></span><span></span></span>
      </div>

      <AiResultCompare v-if="transformResult" :original-text="originalText" :result="transformResult"
        :type-name="currentTypeName" @accept="onAcceptResult" @discard="onDiscard" />

      <div v-if="errorMsg" style="padding:16px;text-align:center;color:var(--danger);">
        <p style="margin-bottom:8px;">转化失败</p>
        <p style="font-size:13px;color:var(--text-secondary);">{{ errorMsg }}</p>
      </div>
    </div>
  </aside>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useAiStore, AI_TRANSFORM_TYPES } from '../../stores/useAiStore.js'
import { useNotesStore } from '../../stores/useNotesStore.js'
import { stripHtml } from '../../utils/helpers.js'
import AiKeywords from './AiKeywords.vue'
import AiResultCompare from './AiResultCompare.vue'
import '../ai.module.css'

const aiStore = useAiStore()
const notesStore = useNotesStore()

const transformResult = ref(null)
const errorMsg = ref('')

const originalText = computed(() => {
  const note = notesStore.notes.find(n => n.id === notesStore.currentNoteId)
  return note ? stripHtml(note.content || '').trim() : ''
})

const currentTypeName = computed(() => AI_TRANSFORM_TYPES[aiStore.aiState.currentType]?.name || '转化')

function onSelectType(type) {
  aiStore.selectAiType(type)
  transformResult.value = null
  errorMsg.value = ''
}

function onAddKeyword(keyword) { return aiStore.addAiKeyword(keyword) }
function onRemoveKeyword(keyword) { aiStore.removeAiKeyword(keyword) }

async function onTransform() {
  if (!originalText.value) { errorMsg.value = '笔记内容为空，请先输入一些内容再进行转化。'; return }
  transformResult.value = null
  errorMsg.value = ''
  try {
    const result = await aiStore.executeAiTransform(originalText.value)
    transformResult.value = result
  } catch (e) { errorMsg.value = e.message || '转化失败，请重试' }
}

async function onAcceptResult() {
  if (!transformResult.value || !notesStore.currentNoteId) return
  const resultHtml = transformResult.value.split('\n').map(line => line || '<br>').join('<br>')
  await notesStore.updateNote(notesStore.currentNoteId, { content: resultHtml })
  await notesStore.fetchNotes()
  onDiscard()
}

function onDiscard() { transformResult.value = null; errorMsg.value = '' }
function onClose() { aiStore.closeAiPanel(); transformResult.value = null; errorMsg.value = '' }
</script>
