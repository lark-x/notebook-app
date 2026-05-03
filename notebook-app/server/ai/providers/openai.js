async function chatCompletion({ apiKey, apiBase, model, systemPrompt, userContent, timeout = 60000 }) {
  const url = `${apiBase}/chat/completions`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({ model, messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userContent }], temperature: 0.7, max_tokens: 2000 }),
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`API 请求失败 (${res.status}): ${await res.text()}`);
    const data = await res.json();
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
  const { getAiSettings } = require('../../db');
  const dbConfig = getAiSettings();
  return {
    apiKey: dbConfig.apiKey || process.env.AI_API_KEY || '',
    apiBase: (dbConfig.baseUrl || process.env.AI_BASE_URL || 'https://api.openai.com/v1').replace(/\/+$/, ''),
    model: dbConfig.model || process.env.AI_MODEL || 'gpt-4o-mini',
  };
}

module.exports = { chatCompletion, getConfig };
