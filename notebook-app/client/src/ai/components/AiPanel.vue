<!--
  AI 创意转化面板组件（重构版 - 壳组件）

  职责：协调子组件，管理整体面板生命周期。
  具体 UI 已拆分至：
  - AiKeywords.vue — 关键词编辑
  - AiResultCompare.vue — 结果对比
-->

<template>
  <div v-if="showAiPanel" class="ai-panel-mask" @click.self="onClose">
    <div class="ai-panel">
      <!-- 面板顶栏 -->
      <div class="ai-panel-header">
        <h3>✨ AI 创意转化</h3>
        <button class="ai-panel-close" @click="onClose">&times;</button>
      </div>

      <!-- 面板主体 -->
      <div class="ai-panel-body">
        <!-- 转化类型选择 -->
        <div class="ai-transform-types">
          <button
            v-for="(config, key) in AI_TRANSFORM_TYPES"
            :key="key"
            class="ai-type-btn"
            :class="{ active: aiState.currentType === key }"
            @click="onSelectType(key)"
          >
            {{ config.icon }} {{ config.name }}
          </button>
        </div>

        <!-- 关键词编辑（子组件） -->
        <AiKeywords
          :keywords="aiState.keywords"
          @add="onAddKeyword"
          @remove="onRemoveKeyword"
        />

        <!-- AI 未配置提示 -->
        <div v-if="!aiState.apiConfigured" class="ai-not-configured">
          <p>⚠️ AI API 未配置</p>
          <p>请在项目根目录的 <code>.env</code> 文件中设置 <code>AI_API_KEY</code></p>
          <p>支持 OpenAI、DeepSeek、Qwen 等 OpenAI 兼容接口</p>
        </div>

        <!-- 转化按钮 -->
        <button
          class="ai-transform-btn"
          :disabled="aiState.loading"
          @click="onTransform"
        >
          {{ aiState.loading ? '正在转化中...' : '✨ 开始转化' }}
        </button>

        <!-- 加载动画 -->
        <div v-if="aiState.loading" class="ai-loading">
          <span>AI 正在思考中</span>
          <span class="ai-loading-dots"><span></span><span></span><span></span></span>
        </div>

        <!-- 结果对比（子组件） -->
        <AiResultCompare
          v-if="transformResult"
          :original-text="originalText"
          :result="transformResult"
          :type-name="currentTypeName"
          @accept="onAcceptResult"
          @discard="onClose"
        />

        <!-- 错误信息 -->
        <div v-if="errorMsg" style="padding:16px;text-align:center;color:var(--danger);">
          <p style="margin-bottom:8px;">转化失败</p>
          <p style="font-size:13px;color:var(--text-secondary);">{{ errorMsg }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import '../ai.module.css'
import {
  showAiPanel,
  aiState,
  AI_TRANSFORM_TYPES,
  closeAiPanel,
  selectAiType,
  addAiKeyword,
  removeAiKeyword,
  executeAiTransform
} from '../composables/useAi.js'
import { currentNoteId, notes, updateNote, fetchNotes } from '../../composables/useNotes.js'
import { stripHtml } from '../../utils/helpers.js'
import AiKeywords from './AiKeywords.vue'
import AiResultCompare from './AiResultCompare.vue'

const transformResult = ref(null)
const errorMsg = ref('')

const originalText = computed(() => {
  const note = notes.value.find(n => n.id === currentNoteId.value)
  return note ? stripHtml(note.content || '').trim() : ''
})

const currentTypeName = computed(() => {
  return AI_TRANSFORM_TYPES[aiState.currentType]?.name || '转化'
})

function onSelectType(type) {
  selectAiType(type)
  transformResult.value = null
  errorMsg.value = ''
}

function onAddKeyword(keyword) {
  return addAiKeyword(keyword)
}

function onRemoveKeyword(keyword) {
  removeAiKeyword(keyword)
}

async function onTransform() {
  if (!originalText.value) {
    errorMsg.value = '笔记内容为空，请先输入一些内容再进行转化。'
    return
  }

  transformResult.value = null
  errorMsg.value = ''

  try {
    const result = await executeAiTransform(originalText.value)
    transformResult.value = result
  } catch (e) {
    errorMsg.value = e.message || '转化失败，请重试'
  }
}

async function onAcceptResult() {
  if (!transformResult.value || !currentNoteId.value) return

  const resultHtml = transformResult.value
    .split('\n')
    .map(line => line || '<br>')
    .join('<br>')

  await updateNote(currentNoteId.value, { content: resultHtml })
  await fetchNotes()
  onClose()
}

function onClose() {
  closeAiPanel()
  transformResult.value = null
  errorMsg.value = ''
}
</script>

<style scoped>
.ai-panel-mask {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1001;
  backdrop-filter: blur(2px);
}
</style>
