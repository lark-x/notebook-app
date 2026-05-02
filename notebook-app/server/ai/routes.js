const express = require('express');
const { getPromptTypes, buildPrompt } = require('./prompts');
const { chatCompletion, getConfig } = require('./providers/openai');
const router = express.Router();

router.post('/ai-transform', async (req, res) => {
  const { content, type, keywords = [] } = req.body;
  if (!content?.trim()) return res.status(400).json({ error: '笔记内容不能为空' });
  if (!type || !getPromptTypes().includes(type)) return res.status(400).json({ error: '无效的转化类型' });
  const config = getConfig();
  if (!config.apiKey) return res.status(503).json({ error: 'AI API 未配置', notConfigured: true });
  try {
    const result = await chatCompletion({ ...config, systemPrompt: buildPrompt(type, keywords), userContent: content });
    res.json({ result });
  } catch (e) {
    console.error('AI transform failed:', e.message);
    const status = e.message.includes('超时') ? 504 : e.message.includes('请求失败') ? 502 : 500;
    res.status(status).json({ error: e.message });
  }
});

router.get('/ai-status', (req, res) => {
  const c = getConfig();
  const configured = !!c.apiKey;
  res.json({ configured, model: configured ? c.model : null, baseUrl: configured ? c.apiBase : null });
});

module.exports = router;
