/**
 * OpenAI 兼容 Provider
 */

const DEFAULT_TIMEOUT = 60000;

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
    if (!result) throw new Error('AI 返回结果为空');
    return result;
  } catch (e) {
    clearTimeout(timer);
    if (e.name === 'AbortError') throw new Error('AI 请求超时（60秒），请稍后重试');
    throw e;
  }
}

function getConfig() {
  return {
    apiKey: process.env.AI_API_KEY || '',
    apiBase: (process.env.AI_BASE_URL || 'https://api.openai.com/v1').replace(/\/+$/, ''),
    model: process.env.AI_MODEL || 'gpt-4o-mini'
  };
}

module.exports = { chatCompletion, getConfig };
