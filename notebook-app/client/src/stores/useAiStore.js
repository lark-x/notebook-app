import { defineStore } from 'pinia'
import { reactive, computed } from 'vue'
import { apiRequest } from '../utils/api.js'
import { useMobileStore } from './useMobileStore.js'

const MAX_RETRIES = 2
const sleep = (ms) => new Promise(r => setTimeout(r, ms))

export const AI_TRANSFORM_TYPES = {
  style: { name: '风格转换', icon: '🎨', defaultKeywords: ['诗意化', '优美'] },
  expand: { name: '内容扩展', icon: '📝', defaultKeywords: ['细节', '场景'] },
  summary: { name: '摘要提炼', icon: '📋', defaultKeywords: ['核心', '精简'] },
}

export const useAiStore = defineStore('ai', () => {
  const mobile = useMobileStore()

  const aiState = reactive({
    currentType: 'style',
    keywords: ['诗意化', '优美'],
    result: null,
    loading: false,
    apiConfigured: true,
  })

  const showAiPanel = computed(() => mobile.aiPanelOpen)

  async function checkAiStatus() {
    try { const s = await apiRequest('GET', '/ai-status'); aiState.apiConfigured = s.configured } catch { aiState.apiConfigured = false }
  }

  function openAiPanel() { mobile.aiPanelOpen = true }
  function closeAiPanel() { mobile.aiPanelOpen = false; aiState.result = null; aiState.loading = false }
  function toggleAiPanel() { mobile.aiPanelOpen ? closeAiPanel() : openAiPanel() }

  function selectAiType(type) {
    aiState.currentType = type; aiState.result = null
    const c = AI_TRANSFORM_TYPES[type]
    if (c) aiState.keywords = [...c.defaultKeywords]
  }

  function addKeyword(kw) {
    if (!kw?.trim() || aiState.keywords.includes(kw.trim()) || aiState.keywords.length >= 8) return false
    aiState.keywords.push(kw.trim()); return true
  }
  function removeKeyword(kw) { aiState.keywords = aiState.keywords.filter(k => k !== kw) }

  async function executeTransform(text) {
    if (!aiState.apiConfigured) throw new Error('AI API 未配置')
    if (aiState.loading) return null
    aiState.loading = true; aiState.result = null
    try {
      let lastErr = null
      for (let i = 0; i <= MAX_RETRIES; i++) {
        try {
          const r = await apiRequest('POST', '/ai-transform', { content: text, type: aiState.currentType, keywords: aiState.keywords })
          aiState.result = r.result; return r.result
        } catch (e) {
          lastErr = e
          if (e.message.includes('未配置')) { aiState.apiConfigured = false; throw e }
          if (i < MAX_RETRIES) await sleep(1000 * (i + 1))
        }
      }
      throw lastErr
    } finally { aiState.loading = false }
  }

  return { aiState, showAiPanel, AI_TRANSFORM_TYPES, checkAiStatus, openAiPanel, closeAiPanel, toggleAiPanel, selectAiType, addKeyword, removeKeyword, executeTransform }
})
