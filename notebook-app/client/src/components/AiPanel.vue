<!--
  AI 创意转化面板组件

  弹出面板，提供：
  - 转化类型选择（风格转换、内容扩展、摘要提炼）
  - 关键词自定义（添加/删除标签）
  - 转化按钮和加载动画
  - 原文与转化结果的左右对比预览
  - 采纳/放弃操作
-->

<template>
  <!-- 面板遮罩层（点击外部关闭） -->
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

        <!-- 关键词标签区 -->
        <div class="ai-keywords-section">
          <label>
            自定义关键词
            <span class="hint">（影响转化效果，可自由增删）</span>
          </label>

          <!-- 关键词标签列表 -->
          <div class="ai-keywords-tags">
            <span
              v-for="keyword in aiState.keywords"
              :key="keyword"
              class="ai-keyword-tag"
            >
              {{ keyword }}
              <span class="remove-keyword" @click="onRemoveKeyword(keyword)">&times;</span>
            </span>
          </div>

          <!-- 关键词输入框 -->
          <div class="ai-keyword-input-row">
            <input
              type="text"
              class="ai-keyword-input"
              placeholder="输入关键词后按回车或点击添加"
              maxlength="20"
              v-model="keywordInput"
              @keydown.enter.prevent="onAddKeyword"
            >
            <button class="ai-keyword-add-btn" @click="onAddKeyword">添加</button>
          </div>
        </div>

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

        <!-- 转化结果对比区 -->
        <div v-if="transformResult" class="ai-result-area">
          <div class="ai-compare">
            <div class="ai-compare-box">
              <div class="ai-compare-label">📄 原文</div>
              <div class="ai-compare-content">{{ originalText }}</div>
            </div>
            <div class="ai-compare-box">
              <div class="ai-compare-label">✨ {{ currentTypeName }}结果</div>
              <div class="ai-compare-content">{{ transformResult }}</div>
            </div>
          </div>
          <div class="ai-result-actions">
            <button @click="onClose">放弃</button>
            <button class="btn-accept" @click="onAcceptResult">采纳结果</button>
          </div>
        </div>

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
/**
 * AI 创意转化面板组件
 *
 * 管理 AI 转化的完整交互流程：
 * 1. 选择转化类型
 * 2. 配置关键词
 * 3. 执行转化
 * 4. 查看对比结果
 * 5. 采纳或放弃结果
 */
import { ref, computed } from 'vue'
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
import { currentNoteId, notes, updateNote, fetchNotes } from '../composables/useNotes.js'
import { stripHtml } from '../utils/helpers.js'

/** 关键词输入框的值 */
const keywordInput = ref('')

/** 转化结果文本 */
const transformResult = ref(null)

/** 错误信息 */
const errorMsg = ref('')

/** 原始笔记文本 */
const originalText = computed(() => {
  const note = notes.value.find(n => n.id === currentNoteId.value)
  return note ? stripHtml(note.content || '').trim() : ''
})

/** 当前转化类型的中文名称 */
const currentTypeName = computed(() => {
  return AI_TRANSFORM_TYPES[aiState.currentType]?.name || '转化'
})

/**
 * 选择转化类型
 * @param {string} type - 类型 ID
 */
function onSelectType(type) {
  selectAiType(type)
  transformResult.value = null
  errorMsg.value = ''
}

/**
 * 添加关键词
 */
function onAddKeyword() {
  if (addAiKeyword(keywordInput.value)) {
    keywordInput.value = ''
  }
}

/**
 * 移除关键词
 * @param {string} keyword - 要移除的关键词
 */
function onRemoveKeyword(keyword) {
  removeAiKeyword(keyword)
}

/**
 * 执行 AI 转化
 */
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

/**
 * 采纳转化结果
 * 将转化后的文本替换当前笔记的内容
 */
async function onAcceptResult() {
  if (!transformResult.value || !currentNoteId.value) return

  // 将纯文本转为 HTML（保留换行）
  const resultHtml = transformResult.value
    .split('\n')
    .map(line => line || '<br>')
    .join('<br>')

  // 更新笔记内容
  await updateNote(currentNoteId.value, { content: resultHtml })

  // 刷新笔记列表
  await fetchNotes()

  // 关闭面板
  onClose()
}

/**
 * 关闭面板
 */
function onClose() {
  closeAiPanel()
  transformResult.value = null
  errorMsg.value = ''
}
</script>

<style scoped>
/* AI 面板遮罩层 */
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
