/**
 * NoteFlow API 路由模块
 *
 * 集中定义所有 RESTful API 端点，包括：
 * - 笔记本 CRUD（/api/notebooks）
 * - 笔记 CRUD（/api/notes），支持分页和搜索
 * - 设置读写（/api/settings）
 * - 全量数据导入导出（/api/data）
 *
 * AI 路由已迁移至 server/ai/routes.js
 */

const express = require('express');
const { db, genId, rowToNote, rowToNotebook, getSettings, stmts } = require('./db');

const router = express.Router();

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

module.exports = router;
