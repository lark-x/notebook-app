/**
 * AI 创意转化 Store（Pinia）
 */
import { defineStore } from 'pinia'
import { ref, reactive, computed } from 'vue'
import { apiRequest } from '../utils/api.js'
import { useMobileStore } from './useMobileStore.js'

const MAX_RETRIES = 2

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function transformContent({ content, type, keywords }) {
  let lastError = null
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await apiRequest('POST', '/ai-transform', { content, type, keywords })
      return response.result
    } catch (e) {
      lastError = e
      if (e.message.includes('未配置') || e.message.includes('notConfigured')) throw e
      if (attempt < MAX_RETRIES) await sleep(1000 * (attempt + 1))
    }
  }
  throw lastError
}

export const AI_TRANSFORM_TYPES = {
  style: { name: '风格转换', icon: '🎨', defaultKeywords: ['诗意化', '优美'] },
  expand: { name: '内容扩展', icon: '📝', defaultKeywords: ['细节', '场景'] },
  summary: { name: '摘要提炼', icon: '📋', defaultKeywords: ['核心', '精简'] }
}

export const useAiStore = defineStore('ai', () => {
  const mobileStore = useMobileStore()

  const aiState = reactive({
    currentType: 'style',
    keywords: ['诗意化', '优美'],
    result: null,
    loading: false,
    apiConfigured: true
  })

  const showAiPanel = computed(() => mobileStore.aiPanelOpen)

  async function checkAiStatus() {
    try {
      const status = await apiRequest('GET', '/ai-status')
      aiState.apiConfigured = status.configured
    } catch (e) {
      aiState.apiConfigured = false
    }
  }

  function openAiPanel() { mobileStore.aiPanelOpen = true }
  function closeAiPanel() {
    mobileStore.aiPanelOpen = false
    aiState.result = null
    aiState.loading = false
  }
  function toggleAiPanel() {
    if (mobileStore.aiPanelOpen) closeAiPanel()
    else openAiPanel()
  }

  function selectAiType(type) {
    aiState.currentType = type
    aiState.result = null
    const config = AI_TRANSFORM_TYPES[type]
    if (config) aiState.keywords = [...config.defaultKeywords]
  }

  function addAiKeyword(keyword) {
    if (!keyword || !keyword.trim()) return false
    const trimmed = keyword.trim()
    if (aiState.keywords.includes(trimmed)) return false
    if (aiState.keywords.length >= 8) return false
    aiState.keywords.push(trimmed)
    return true
  }

  function removeAiKeyword(keyword) {
    aiState.keywords = aiState.keywords.filter(k => k !== keyword)
  }

  async function executeAiTransform(originalText) {
    if (!aiState.apiConfigured) throw new Error('AI API 未配置。请在 .env 文件中设置 AI_API_KEY。')
    if (aiState.loading) return null
    aiState.loading = true
    aiState.result = null
    try {
      const result = await transformContent({
        content: originalText,
        type: aiState.currentType,
        keywords: aiState.keywords
      })
      aiState.result = result
      return result
    } catch (e) {
      if (e.message.includes('未配置') || e.message.includes('notConfigured')) aiState.apiConfigured = false
      throw e
    } finally {
      aiState.loading = false
    }
  }

  return {
    aiState, showAiPanel, AI_TRANSFORM_TYPES,
    checkAiStatus, openAiPanel, closeAiPanel, toggleAiPanel,
    selectAiType, addAiKeyword, removeAiKeyword, executeAiTransform
  }
})
