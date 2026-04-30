/**
 * AI 创意转化组合式函数
 *
 * 提供基于关键词的文本风格转换、内容扩展和摘要提炼能力。
 * 通过后端 /api/ai-transform 接口调用 OpenAI 兼容 API。
 */

import { ref, reactive } from 'vue';
import { apiRequest } from '../utils/api.js';

// ===== AI 面板状态 =====

/** 是否显示 AI 面板 */
export const showAiPanel = ref(false);

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

/**
 * 预设的转化类型配置
 * 每种类型包含：名称、图标、默认关键词
 */
export const AI_TRANSFORM_TYPES = {
  style: {
    name: '风格转换',
    icon: '🎨',
    defaultKeywords: ['诗意化', '优美']
  },
  expand: {
    name: '内容扩展',
    icon: '📝',
    defaultKeywords: ['细节', '场景']
  },
  summary: {
    name: '摘要提炼',
    icon: '📋',
    defaultKeywords: ['核心', '精简']
  }
};

/**
 * 检测后端 AI API 配置状态
 * 向 /api/ai-status 发起请求，判断 AI 功能是否可用
 */
export async function checkAiStatus() {
  try {
    const status = await apiRequest('GET', '/ai-status');
    aiState.apiConfigured = status.configured;
  } catch (e) {
    aiState.apiConfigured = false;
  }
}

/**
 * 打开 AI 面板
 */
export function openAiPanel() {
  showAiPanel.value = true;
}

/**
 * 关闭 AI 面板
 * 重置转化结果和加载状态
 */
export function closeAiPanel() {
  showAiPanel.value = false;
  aiState.result = null;
  aiState.loading = false;
}

/**
 * 选择转化类型
 * 切换类型时重置结果，并加载该类型的默认关键词
 * @param {string} type - 转化类型 ID
 */
export function selectAiType(type) {
  aiState.currentType = type;
  aiState.result = null;

  // 加载该类型的默认关键词
  const typeConfig = AI_TRANSFORM_TYPES[type];
  if (typeConfig) {
    aiState.keywords = [...typeConfig.defaultKeywords];
  }
}

/**
 * 添加关键词
 * @param {string} keyword - 要添加的关键词
 * @returns {boolean} 是否添加成功
 */
export function addAiKeyword(keyword) {
  if (!keyword || !keyword.trim()) return false;
  const trimmed = keyword.trim();

  // 避免重复添加
  if (aiState.keywords.includes(trimmed)) return false;

  // 最多 8 个关键词
  if (aiState.keywords.length >= 8) return false;

  aiState.keywords.push(trimmed);
  return true;
}

/**
 * 移除指定关键词
 * @param {string} keyword - 要移除的关键词
 */
export function removeAiKeyword(keyword) {
  aiState.keywords = aiState.keywords.filter(k => k !== keyword);
}

/**
 * 执行 AI 转化
 * 调用后端 /api/ai-transform 接口进行内容转化
 *
 * @param {string} originalText - 原始笔记纯文本内容
 * @returns {Promise<string|null>} 转化结果文本，失败返回 null
 */
export async function executeAiTransform(originalText) {
  // 检查 AI API 是否已配置
  if (!aiState.apiConfigured) {
    throw new Error('AI API 未配置。请在 .env 文件中设置 AI_API_KEY。');
  }

  // 防止重复触发
  if (aiState.loading) return null;
  aiState.loading = true;
  aiState.result = null;

  try {
    const response = await apiRequest('POST', '/ai-transform', {
      content: originalText,
      type: aiState.currentType,
      keywords: aiState.keywords
    });

    aiState.result = response.result;
    return response.result;
  } catch (e) {
    // 如果是 API 未配置错误，更新状态
    if (e.message.includes('未配置') || e.message.includes('notConfigured')) {
      aiState.apiConfigured = false;
    }
    throw e;
  } finally {
    aiState.loading = false;
  }
}
