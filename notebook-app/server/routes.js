/**
 * NoteFlow API 路由模块
 *
 * 集中定义所有 RESTful API 端点，包括：
 * - 笔记本 CRUD（/api/notebooks）
 * - 笔记 CRUD（/api/notes），支持分页和搜索
 * - 设置读写（/api/settings）
 * - 全量数据导入导出（/api/data）
 * - AI 创意转化（/api/ai-transform、/api/ai-status）
 */

const express = require('express');
const { db, genId, rowToNote, rowToNotebook, getSettings, stmts } = require('./db');

const router = express.Router();

// ===== AI 提示词模板 =====

/**
 * AI 转化类型对应的系统提示词
 * 每种类型定义了 AI 的角色和任务描述
 */
const AI_PROMPTS = {
  style: (keywords) => `你是一位文学风格转换专家。请将用户提供的文本改写为以下风格：${keywords.join('、')}。
要求：
1. 保持原文的核心含义不变
2. 自然地融入指定的风格特征
3. 输出纯文本，不要添加额外的标题或说明`,

  expand: (keywords) => `你是一位内容创作专家。请根据以下方向对用户提供的文本进行扩展丰富：${keywords.join('、')}。
要求：
1. 基于原文内容进行合理扩展，不要编造与原文无关的内容
2. 补充具体的细节、场景描写或论证
3. 保持与原文一致的语气和风格
4. 输出纯文本，不要添加额外的标题或说明`,

  summary: (keywords) => `你是一位文本分析专家。请对用户提供的文本进行摘要提炼，重点关注：${keywords.join('、')}。
要求：
1. 提取文本的核心要点
2. 用简洁清晰的语言重新组织
3. 保留关键信息，去除冗余表达
4. 输出纯文本，不要添加额外的标题或说明`
};

// ===== 全量数据路由 =====

/**
 * GET /api/data - 获取全部数据
 * 前端启动时调用，一次性获取所有笔记本、笔记和设置
 */
router.get('/data', (req, res) => {
  const notebooks = stmts.getAllNotebooks.all().map(rowToNotebook);
  const notes = stmts.getAllNotes.all().map(rowToNote);
  const settings = getSettings();
  res.json({ notebooks, notes, settings });
});

/**
 * PUT /api/data - 替换全部数据（导入功能）
 * 使用事务保证原子性：要么全部写入成功，要么全部回滚
 */
router.put('/data', (req, res) => {
  const { notebooks, notes, settings } = req.body;
  if (!notebooks || !notes) {
    return res.status(400).json({ error: 'Invalid data format' });
  }

  // 在事务中执行：清空旧数据 → 写入新数据
  const transaction = db.transaction(() => {
    // 按外键依赖顺序删除：先删笔记，再删笔记本
    db.prepare('DELETE FROM notes').run();
    db.prepare('DELETE FROM notebooks').run();
    db.prepare('DELETE FROM settings').run();

    // 写入笔记本
    for (const nb of notebooks) {
      stmts.insertNotebook.run(nb.id, nb.name, nb.icon || '📓');
    }

    // 写入笔记（tags 需要序列化为 JSON 字符串）
    for (const note of notes) {
      stmts.insertNote.run(
        note.id,
        note.notebookId,
        note.title || '',
        note.content || '',
        JSON.stringify(note.tags || []),
        note.createdAt || Date.now(),
        note.updatedAt || Date.now()
      );
    }

    // 写入设置
    if (settings) {
      for (const [key, value] of Object.entries(settings)) {
        stmts.upsertSetting.run(key, JSON.stringify(value));
      }
    }
  });

  try {
    transaction();
    res.json({ success: true });
  } catch (e) {
    console.error('Import failed:', e.message);
    res.status(500).json({ error: 'Failed to import data' });
  }
});

// ===== 设置路由 =====

/**
 * PUT /api/settings - 更新设置
 * 接收键值对，逐项写入数据库（upsert 语义）
 */
router.put('/settings', (req, res) => {
  try {
    for (const [key, value] of Object.entries(req.body)) {
      stmts.upsertSetting.run(key, JSON.stringify(value));
    }
    res.json({ success: true, settings: getSettings() });
  } catch (e) {
    console.error('Update settings failed:', e.message);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// ===== 笔记本路由 =====

/**
 * GET /api/notebooks - 获取所有笔记本列表
 */
router.get('/notebooks', (req, res) => {
  res.json(stmts.getAllNotebooks.all().map(rowToNotebook));
});

/**
 * POST /api/notebooks - 创建笔记本
 * 请求体：{ name: string, icon?: string }
 */
router.post('/notebooks', (req, res) => {
  const { name, icon } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Name is required' });
  }
  const id = genId();
  try {
    stmts.insertNotebook.run(id, name.trim(), icon || '📓');
    res.json({ id, name: name.trim(), icon: icon || '📓' });
  } catch (e) {
    console.error('Create notebook failed:', e.message);
    res.status(500).json({ error: 'Failed to create notebook' });
  }
});

/**
 * PUT /api/notebooks/:id - 更新笔记本
 * 支持部分更新：只传 name 则只更新名称，只传 icon 则只更新图标
 */
router.put('/notebooks/:id', (req, res) => {
  const nb = stmts.getNotebook.get(req.params.id);
  if (!nb) {
    return res.status(404).json({ error: 'Notebook not found' });
  }
  // 未传入的字段保持原值
  const name = req.body.name !== undefined ? req.body.name : nb.name;
  const icon = req.body.icon !== undefined ? req.body.icon : nb.icon;
  try {
    stmts.updateNotebook.run(name, icon, req.params.id);
    res.json({ id: req.params.id, name, icon });
  } catch (e) {
    console.error('Update notebook failed:', e.message);
    res.status(500).json({ error: 'Failed to update notebook' });
  }
});

/**
 * DELETE /api/notebooks/:id - 删除笔记本
 * 使用事务保证：先删除该笔记本下的所有笔记，再删除笔记本本身
 */
router.delete('/notebooks/:id', (req, res) => {
  const nb = stmts.getNotebook.get(req.params.id);
  if (!nb) {
    return res.status(404).json({ error: 'Notebook not found' });
  }
  try {
    const transaction = db.transaction(() => {
      stmts.deleteNotesByNotebook.run(req.params.id);
      stmts.deleteNotebook.run(req.params.id);
    });
    transaction();
    res.json({ success: true });
  } catch (e) {
    console.error('Delete notebook failed:', e.message);
    res.status(500).json({ error: 'Failed to delete notebook' });
  }
});

// ===== 笔记路由 =====

/**
 * GET /api/notes - 获取笔记列表（分页 + 搜索）
 *
 * 查询参数：
 *   - notebookId: 按笔记本过滤（可选）
 *   - search: 搜索关键词，匹配标题/内容/标签（可选）
 *   - page: 页码，默认 1
 *   - pageSize: 每页条数，默认 15，最大 100
 *
 * 返回：{ notes: [...], total: number, page: number, pageSize: number }
 */
router.get('/notes', (req, res) => {
  // 分页参数，默认第 1 页，每页 15 条
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize) || 15));
  const offset = (page - 1) * pageSize;

  // 动态构建查询条件（参数化防注入）
  let where = '';
  const params = [];

  if (req.query.notebookId) {
    where += ' WHERE notebook_id = ?';
    params.push(req.query.notebookId);
  }

  if (req.query.search) {
    where += where ? ' AND' : ' WHERE';
    where += ' (title LIKE ? OR content LIKE ? OR tags LIKE ?)';
    const q = `%${req.query.search}%`;
    params.push(q, q, q);
  }

  // 查询总数
  const countRow = db.prepare(`SELECT COUNT(*) as total FROM notes${where}`).get(...params);
  const total = countRow.total;

  // 查询当前页数据
  const rows = db.prepare(`SELECT * FROM notes${where} ORDER BY updated_at DESC LIMIT ? OFFSET ?`)
    .all(...params, pageSize, offset);

  res.json({
    notes: rows.map(rowToNote),
    total,
    page,
    pageSize
  });
});

/**
 * POST /api/notes - 创建笔记
 * 请求体：{ notebookId?, title?, content?, tags? }
 */
router.post('/notes', (req, res) => {
  const { notebookId, title, content, tags } = req.body;
  const id = genId();
  const now = Date.now();
  // 未指定笔记本则归入默认笔记本
  const nbId = notebookId || 'default';

  try {
    stmts.insertNote.run(id, nbId, title || '', content || '', JSON.stringify(tags || []), now, now);
    res.json({
      id,
      notebookId: nbId,
      title: title || '',
      content: content || '',
      tags: tags || [],
      createdAt: now,
      updatedAt: now
    });
  } catch (e) {
    console.error('Create note failed:', e.message);
    res.status(500).json({ error: 'Failed to create note' });
  }
});

/**
 * PUT /api/notes/:id - 更新笔记
 * 支持部分更新：标题、内容、标签、所属笔记本均可独立更新
 * 更新时自动刷新 updated_at 时间戳
 */
router.put('/notes/:id', (req, res) => {
  const note = stmts.getNote.get(req.params.id);
  if (!note) {
    return res.status(404).json({ error: 'Note not found' });
  }

  // 未传入的字段保持原值
  const title = req.body.title !== undefined ? req.body.title : note.title;
  const content = req.body.content !== undefined ? req.body.content : note.content;
  const tags = req.body.tags !== undefined ? JSON.stringify(req.body.tags) : note.tags;
  const notebookId = req.body.notebookId !== undefined ? req.body.notebookId : note.notebook_id;
  const now = Date.now();

  try {
    stmts.updateNote.run(title, content, tags, notebookId, now, req.params.id);
    res.json({
      id: req.params.id,
      notebookId,
      title,
      content,
      tags: JSON.parse(tags),
      createdAt: note.created_at,
      updatedAt: now
    });
  } catch (e) {
    console.error('Update note failed:', e.message);
    res.status(500).json({ error: 'Failed to update note' });
  }
});

/**
 * DELETE /api/notes/:id - 删除笔记
 */
router.delete('/notes/:id', (req, res) => {
  const note = stmts.getNote.get(req.params.id);
  if (!note) {
    return res.status(404).json({ error: 'Note not found' });
  }
  try {
    stmts.deleteNote.run(req.params.id);
    res.json({ success: true });
  } catch (e) {
    console.error('Delete note failed:', e.message);
    res.status(500).json({ error: 'Failed to delete note' });
  }
});

// ===== AI 创意转化路由 =====

/**
 * POST /api/ai-transform - AI 创意转化
 *
 * 接收笔记内容、转化类型和关键词，调用 OpenAI 兼容 API 进行内容转化。
 *
 * 请求体：
 *   { content: string, type: 'style'|'expand'|'summary', keywords?: string[] }
 *
 * 响应：
 *   { result: string } - 转化后的文本
 *   { error: string }  - 错误信息
 */
router.post('/ai-transform', async (req, res) => {
  const { content, type, keywords = [] } = req.body;

  // 参数校验
  if (!content || !content.trim()) {
    return res.status(400).json({ error: '笔记内容不能为空' });
  }
  if (!type || !AI_PROMPTS[type]) {
    return res.status(400).json({ error: '无效的转化类型，支持：style、expand、summary' });
  }

  // 检查 AI API 配置
  const apiKey = process.env.AI_API_KEY;
  const apiBase = (process.env.AI_API_BASE || 'https://api.openai.com/v1').replace(/\/+$/, '');
  const model = process.env.AI_MODEL || 'gpt-3.5-turbo';

  if (!apiKey) {
    return res.status(503).json({
      error: 'AI API 未配置，请在 .env 文件中设置 AI_API_KEY',
      notConfigured: true
    });
  }

  // 构建请求
  const systemPrompt = AI_PROMPTS[type](keywords.length > 0 ? keywords : ['通用']);
  const url = `${apiBase}/chat/completions`;

  const body = {
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: content }
    ],
    temperature: 0.7,
    max_tokens: 2000
  };

  try {
    // 使用 AbortController 实现 30 秒超时
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(body),
      signal: controller.signal
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('AI API error:', response.status, errorBody);
      return res.status(502).json({
        error: `AI API 请求失败 (${response.status})，请检查 API 配置`
      });
    }

    const data = await response.json();
    const result = data.choices?.[0]?.message?.content?.trim();

    if (!result) {
      return res.status(502).json({ error: 'AI 返回结果为空，请重试' });
    }

    res.json({ result });

  } catch (e) {
    if (e.name === 'AbortError') {
      return res.status(504).json({ error: 'AI 请求超时（30秒），请稍后重试' });
    }
    console.error('AI transform failed:', e.message);
    res.status(500).json({ error: 'AI 转化失败：' + e.message });
  }
});

/**
 * GET /api/ai-status - 检查 AI API 配置状态
 * 前端用来判断 AI 功能是否可用
 */
router.get('/ai-status', (req, res) => {
  const configured = !!process.env.AI_API_KEY;
  res.json({
    configured,
    model: configured ? (process.env.AI_MODEL || 'gpt-3.5-turbo') : null,
    base: configured ? (process.env.AI_API_BASE || 'https://api.openai.com/v1') : null
  });
});

module.exports = router;
