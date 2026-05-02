/**
 * AI 路由模块
 */

const express = require('express');
const { getPromptTypes, buildPrompt } = require('./prompts');
const { chatCompletion, getConfig } = require('./providers/openai');

const router = express.Router();

router.post('/ai-transform', async (req, res) => {
  const { content, type, keywords = [] } = req.body;

  if (!content || !content.trim()) {
    return res.status(400).json({ error: '笔记内容不能为空' });
  }

  const validTypes = getPromptTypes();
  if (!type || !validTypes.includes(type)) {
    return res.status(400).json({ error: `无效的转化类型，支持：${validTypes.join('、')}` });
  }

  const config = getConfig();
  if (!config.apiKey) {
    return res.status(503).json({ error: 'AI API 未配置，请在 .env 文件中设置 AI_API_KEY', notConfigured: true });
  }

  const systemPrompt = buildPrompt(type, keywords);

  try {
    const result = await chatCompletion({
      apiKey: config.apiKey,
      apiBase: config.apiBase,
      model: config.model,
      systemPrompt,
      userContent: content
    });
    res.json({ result });
  } catch (e) {
    console.error('AI transform failed:', e.message);
    if (e.message.includes('超时')) return res.status(504).json({ error: e.message });
    if (e.message.includes('请求失败')) return res.status(502).json({ error: e.message });
    res.status(500).json({ error: 'AI 转化失败：' + e.message });
  }
});

router.get('/ai-status', (req, res) => {
  const config = getConfig();
  const configured = !!config.apiKey;
  res.json({ configured, model: configured ? config.model : null, baseUrl: configured ? config.apiBase : null });
});

module.exports = router;
