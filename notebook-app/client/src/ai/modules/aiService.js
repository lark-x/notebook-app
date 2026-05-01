/**
 * AI 服务层
 *
 * 封装所有 AI 相关的 API 调用，提供统一的错误处理和重试机制。
 */

import { apiRequest } from '../../utils/api.js';

const MAX_RETRIES = 2;
const RETRY_DELAY = 1000;

/**
 * 延迟指定毫秒
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 执行 AI 创意转化
 *
 * @param {Object} params
 * @param {string} params.content - 原始笔记纯文本
 * @param {string} params.type - 转化类型（style/expand/summary）
 * @param {string[]} params.keywords - 自定义关键词
 * @returns {Promise<string>} 转化结果文本
 */
export async function transformContent({ content, type, keywords }) {
  let lastError = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await apiRequest('POST', '/ai-transform', {
        content,
        type,
        keywords
      });
      return response.result;
    } catch (e) {
      lastError = e;

      // 不可重试的错误：直接抛出
      if (e.message.includes('未配置') || e.message.includes('notConfigured')) {
        throw e;
      }

      // 还有重试机会则等待后重试
      if (attempt < MAX_RETRIES) {
        await sleep(RETRY_DELAY * (attempt + 1));
      }
    }
  }

  throw lastError;
}

/**
 * 检查 AI API 配置状态
 *
 * @returns {Promise<{ configured: boolean, model: string|null, base: string|null }>}
 */
export async function checkApiStatus() {
  return apiRequest('GET', '/ai-status');
}
