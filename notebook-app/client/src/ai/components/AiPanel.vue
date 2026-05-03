<template>
  <aside id="ai-panel">
    <div class="ai-panel-header"><h3>✨ AI 创意转化</h3><button class="ai-panel-close" @click="onClose">&times;</button></div>
    <div class="ai-panel-body">
      <div class="ai-transform-types">
        <button v-for="(c, k) in AI_TRANSFORM_TYPES" :key="k" class="ai-type-btn" :class="{ active: ai.aiState.currentType === k }" @click="ai.selectAiType(k); result=null; err=''">{{ c.icon }} {{ c.name }}</button>
      </div>
      <div class="ai-keywords-section">
        <label>自定义关键词 <span class="hint">（影响转化效果）</span></label>
        <div class="ai-keywords-tags"><span v-for="kw in ai.aiState.keywords" :key="kw" class="ai-kw-tag">{{ kw }}<span @click="ai.removeKeyword(kw)">&times;</span></span></div>
        <div class="ai-kw-row"><input v-model="kwInput" placeholder="输入关键词后回车" @keydown.enter.prevent="onAddKw" maxlength="20"><button @click="onAddKw">添加</button></div>
      </div>
      <div v-if="!ai.aiState.apiConfigured" class="ai-not-configured"><p>⚠️ AI API 未配置</p><p>请在 <code>.env</code> 中设置 <code>AI_API_KEY</code></p></div>
      <button class="ai-transform-btn" :disabled="ai.aiState.loading" @click="onTransform">{{ ai.aiState.loading ? '转化中...' : '✨ 开始转化' }}</button>
      <div v-if="ai.aiState.loading" class="ai-loading"><span>AI 正在思考中</span><span class="ai-dots"><span></span><span></span><span></span></span></div>
      <div v-if="result" class="ai-result-area">
        <div class="ai-compare">
          <div class="ai-compare-box"><div class="ai-compare-label">📄 原文</div><div class="ai-compare-content">{{ originalText }}</div></div>
          <div class="ai-compare-box"><div class="ai-compare-label">✨ 结果</div><div class="ai-compare-content">{{ result }}</div></div>
        </div>
        <div class="ai-result-actions"><button @click="result=null">放弃</button><button class="btn-accept" @click="onPreview">预览并采纳</button></div>
      </div>
      <div v-if="err" style="padding:16px;text-align:center;color:var(--danger);"><p>转化失败</p><p style="font-size:13px;color:var(--text-secondary);">{{ err }}</p></div>
    </div>
  </aside>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useAiStore, AI_TRANSFORM_TYPES } from '../../stores/useAiStore.js'
import { useNotesStore } from '../../stores/useNotesStore.js'
import { stripHtml } from '../../utils/helpers.js'
import '../ai.css'

const ai = useAiStore()
const notesStore = useNotesStore()
const result = ref(null)
const err = ref('')
const kwInput = ref('')

const originalText = computed(() => {
  const n = notesStore.notes.find(x => x.id === notesStore.currentNoteId)
  return n ? (n.content || '').trim() : ''
})

function onAddKw() { if (ai.addKeyword(kwInput.value)) kwInput.value = '' }

async function onTransform() {
  if (!originalText.value) { err.value = '笔记内容为空'; return }
  result.value = null; err.value = ''
  try { result.value = await ai.executeTransform(originalText.value) } catch (e) { err.value = e.message }
}

function onPreview() {
  if (!result.value) return
  // 将 AI 结果发送到编辑器预览（diff 模式）
  notesStore.pendingAiContent = result.value
  result.value = null
}

function onClose() { ai.closeAiPanel(); result.value = null; err.value = '' }
</script>

<style scoped></style>
