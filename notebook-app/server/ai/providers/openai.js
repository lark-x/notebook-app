/**
 * OpenAI 兼容 Provider
 *
 * 封装 OpenAI Chat Completions API 调用，
 * 支持所有 OpenAI 兼容接口（OpenAI、DeepSeek、Qwen、Moonshot 等）。
 */

const DEFAULT_TIMEOUT = 30000;

/**
 * 调用 OpenAI 兼容 API
 *
 * @param {Object} options
 * @param {string} options.apiKey - API 密钥
 * @param {string} options.apiBase - API 基础地址
 * @param {string} options.model - 模型名称
 * @param {string} options.systemPrompt - 系统提示词
 * @param {string} options.userContent - 用户内容
 * @param {number} [options.timeout=30000] - 超时时间（毫秒）
 * @returns {Promise<string>} AI 生成的文本
 */
async function chatCompletion({ apiKey, apiBase, model, systemPrompt, userContent, timeout = DEFAULT_TIMEOUT }) {
  const url = `${apiBase}/chat/completions`;

  const body = {
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent }
    ],
    temperature: 0.7,
    max_tokens: 2000
  };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(body),
      signal: controller.signal
    });

    clearTimeout(timer);

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`AI API 请求失败 (${response.status}): ${errorBody}`);
    }

    const data = await response.json();
    const result = data.choices?.[0]?.message?.content?.trim();

    if (!result) {
      throw new Error('AI 返回结果为空');
    }

    return result;
  } catch (e) {
    clearTimeout(timer);
    if (e.name === 'AbortError') {
      throw new Error('AI 请求超时（30秒），请稍后重试');
    }
    throw e;
  }
}

/**
 * 从环境变量读取 AI 配置
 */
function getConfig() {
  return {
    apiKey: process.env.AI_API_KEY || '',
    apiBase: (process.env.AI_API_BASE || 'https://api.openai.com/v1').replace(/\/+$/, ''),
    model: process.env.AI_MODEL || 'gpt-3.5-turbo'
  };
}

module.exports = { chatCompletion, getConfig };
