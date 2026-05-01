/**
 * AI 创意转化组合式函数（重构版）
 *
 * 职责：状态管理 + 方法协调（瘦 composable）
 * 具体逻辑已拆分至：
 * - aiService.js — API 调用 + 重试
 * - transformTypes.js — 类型配置
 */

import { ref, reactive } from 'vue';
import { transformContent, checkApiStatus } from '../modules/aiService.js';
import { AI_TRANSFORM_TYPES, getTypeConfig } from '../modules/transformTypes.js';
import { aiPanelOpen } from '../../composables/useMobile.js';

// ===== AI 面板状态 =====

/** 是否显示 AI 面板（与移动端状态联动） */
export const showAiPanel = aiPanelOpen;

/** AI 转化状态 */
export const aiState = reactive({
  /** 当前选中的转化类型 */
  currentType: 'style',
  /** 用户自定义关键词列表 */
  keywords: ['诗意化', '优美'],
  /** 当前转化结果（null 表示尚未转化） */
  result: null,
  /** 是否正在转化中 */
  loading: false,
  /** AI API 是否已配置（启动时检测） */
  apiConfigured: true
});

// 重新导出类型配置，保持对外 API 兼容
export { AI_TRANSFORM_TYPES };

/**
 * 检测后端 AI API 配置状态
 */
export async function checkAiStatus() {
  try {
    const status = await checkApiStatus();
    aiState.apiConfigured = status.configured;
  } catch (e) {
    aiState.apiConfigured = false;
  }
}

/**
 * 打开 AI 面板
 */
export function openAiPanel() {
  aiPanelOpen.value = true;
}

/**
 * 关闭 AI 面板
 */
export function closeAiPanel() {
  aiPanelOpen.value = false;
  aiState.result = null;
  aiState.loading = false;
}

/**
 * 切换 AI 面板显示/隐藏
 */
export function toggleAiPanel() {
  if (aiPanelOpen.value) {
    closeAiPanel()
  } else {
    openAiPanel()
  }
}

/**
 * 选择转化类型
 * @param {string} type - 转化类型 ID
 */
export function selectAiType(type) {
  aiState.currentType = type;
  aiState.result = null;

  const config = getTypeConfig(type);
  if (config) {
    aiState.keywords = [...config.defaultKeywords];
  }
}

/**
 * 添加关键词
 * @param {string} keyword
 * @returns {boolean} 是否添加成功
 */
export function addAiKeyword(keyword) {
  if (!keyword || !keyword.trim()) return false;
  const trimmed = keyword.trim();
  if (aiState.keywords.includes(trimmed)) return false;
  if (aiState.keywords.length >= 8) return false;
  aiState.keywords.push(trimmed);
  return true;
}

/**
 * 移除指定关键词
 * @param {string} keyword
 */
export function removeAiKeyword(keyword) {
  aiState.keywords = aiState.keywords.filter(k => k !== keyword);
}

/**
 * 执行 AI 转化（委托给 aiService）
 * @param {string} originalText - 原始笔记纯文本内容
 * @returns {Promise<string|null>} 转化结果文本
 */
export async function executeAiTransform(originalText) {
  if (!aiState.apiConfigured) {
    throw new Error('AI API 未配置。请在 .env 文件中设置 AI_API_KEY。');
  }

  if (aiState.loading) return null;
  aiState.loading = true;
  aiState.result = null;

  try {
    const result = await transformContent({
      content: originalText,
      type: aiState.currentType,
      keywords: aiState.keywords
    });

    aiState.result = result;
    return result;
  } catch (e) {
    if (e.message.includes('未配置') || e.message.includes('notConfigured')) {
      aiState.apiConfigured = false;
    }
    throw e;
  } finally {
    aiState.loading = false;
  }
}
