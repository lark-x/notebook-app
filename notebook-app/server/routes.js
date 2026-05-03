const express = require('express');
const { db, genId, rowToNote, rowToNotebook, getSettings, stmts } = require('./db');
const { verifyPassword, generateToken, authMiddleware, adminMiddleware } = require('./auth');
const router = express.Router();

// === 认证 ===
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: '请输入用户名和密码' });
  const user = stmts.getUserByUsername.get(username);
  if (!user) return res.status(401).json({ error: '用户名或密码错误' });
  if (!verifyPassword(password, user.password)) return res.status(401).json({ error: '用户名或密码错误' });
  const token = generateToken({ id: user.id, username: user.username, role: user.role });
  res.json({ token, user: { id: user.id, username: user.username, role: user.role } });
});

router.get('/me', authMiddleware, (req, res) => {
  res.json({ user: { id: req.user.id, username: req.user.username, role: req.user.role } });
});

// === 全量数据 ===
router.get('/data', (req, res) => {
  const notebooks = stmts.getAllNotebooks.all().map(rowToNotebook);
  const notes = stmts.getAllNotes.all().map(rowToNote);
  const settings = getSettings();
  res.json({ notebooks, notes, settings });
});

router.put('/data', (req, res) => {
  const { notebooks, notes, settings } = req.body;
  if (!notebooks || !notes) return res.status(400).json({ error: 'Invalid data format' });
  try {
    db.transaction(() => {
      db.prepare('DELETE FROM notes').run();
      db.prepare('DELETE FROM notebooks').run();
      db.prepare('DELETE FROM settings').run();
      for (const nb of notebooks) stmts.insertNotebook.run(nb.id, nb.name, nb.icon || '📓');
      for (const n of notes) stmts.insertNote.run(n.id, n.notebookId, n.title || '', n.content || '', JSON.stringify(n.tags || []), n.createdAt || Date.now(), n.updatedAt || Date.now());
      if (settings) for (const [k, v] of Object.entries(settings)) stmts.upsertSetting.run(k, JSON.stringify(v));
    })();
    res.json({ success: true });
  } catch (e) { console.error('Import failed:', e.message); res.status(500).json({ error: 'Import failed' }); }
});

// === 设置 ===
router.put('/settings', (req, res) => {
  try {
    for (const [k, v] of Object.entries(req.body)) stmts.upsertSetting.run(k, JSON.stringify(v));
    res.json({ success: true, settings: getSettings() });
  } catch (e) { res.status(500).json({ error: 'Update settings failed' }); }
});

// === 笔记本 ===
router.get('/notebooks', (req, res) => { res.json(stmts.getAllNotebooks.all().map(rowToNotebook)); });

router.post('/notebooks', (req, res) => {
  const { name, icon } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: 'Name is required' });
  const id = genId();
  stmts.insertNotebook.run(id, name.trim(), icon || '📓');
  res.json({ id, name: name.trim(), icon: icon || '📓' });
});

router.put('/notebooks/:id', (req, res) => {
  const nb = stmts.getNotebook.get(req.params.id);
  if (!nb) return res.status(404).json({ error: 'Not found' });
  const name = req.body.name ?? nb.name;
  const icon = req.body.icon ?? nb.icon;
  stmts.updateNotebook.run(name, icon, req.params.id);
  res.json({ id: req.params.id, name, icon });
});

router.delete('/notebooks/:id', (req, res) => {
  const nb = stmts.getNotebook.get(req.params.id);
  if (!nb) return res.status(404).json({ error: 'Not found' });
  db.transaction(() => { stmts.deleteNotesByNotebook.run(req.params.id); stmts.deleteNotebook.run(req.params.id); })();
  res.json({ success: true });
});

// === 笔记 ===
router.get('/notes', (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize) || 15));
  const offset = (page - 1) * pageSize;
  let where = '';
  const params = [];
  if (req.query.notebookId) { where += ' WHERE notebook_id = ?'; params.push(req.query.notebookId); }
  if (req.query.search) {
    where += where ? ' AND' : ' WHERE';
    where += ' (title LIKE ? OR content LIKE ? OR tags LIKE ?)';
    const q = `%${req.query.search}%`;
    params.push(q, q, q);
  }
  const total = db.prepare(`SELECT COUNT(*) as t FROM notes${where}`).get(...params).t;
  const rows = db.prepare(`SELECT * FROM notes${where} ORDER BY updated_at DESC LIMIT ? OFFSET ?`).all(...params, pageSize, offset);
  res.json({ notes: rows.map(rowToNote), total, page, pageSize });
});

router.post('/notes', (req, res) => {
  const { notebookId, title, content, tags } = req.body;
  const id = genId();
  const now = Date.now();
  const nbId = notebookId || 'default';
  stmts.insertNote.run(id, nbId, title || '', content || '', JSON.stringify(tags || []), now, now);
  res.json({ id, notebookId: nbId, title: title || '', content: content || '', tags: tags || [], createdAt: now, updatedAt: now });
});

router.put('/notes/:id', (req, res) => {
  const note = stmts.getNote.get(req.params.id);
  if (!note) return res.status(404).json({ error: 'Not found' });
  const title = req.body.title ?? note.title;
  const content = req.body.content ?? note.content;
  const tags = req.body.tags !== undefined ? JSON.stringify(req.body.tags) : note.tags;
  const notebookId = req.body.notebookId ?? note.notebook_id;
  const now = Date.now();
  stmts.updateNote.run(title, content, tags, notebookId, now, req.params.id);
  res.json({ id: req.params.id, notebookId, title, content, tags: JSON.parse(tags), createdAt: note.created_at, updatedAt: now });
});

router.delete('/notes/:id', (req, res) => {
  const note = stmts.getNote.get(req.params.id);
  if (!note) return res.status(404).json({ error: 'Not found' });
  stmts.deleteNote.run(req.params.id);
  res.json({ success: true });
});

// === 用户管理 (admin only) ===
router.get('/users', authMiddleware, adminMiddleware, (req, res) => {
  res.json(stmts.getAllUsers.all());
});

router.post('/users', authMiddleware, adminMiddleware, (req, res) => {
  const { username, password, role } = req.body;
  if (!username?.trim()) return res.status(400).json({ error: '请输入用户名' });
  if (!password || password.length < 6) return res.status(400).json({ error: '密码至少6位' });
  if (stmts.getUserByUsername.get(username.trim())) return res.status(409).json({ error: '用户名已存在' });
  const { hashPassword } = require('./auth');
  const id = genId();
  stmts.insertUser.run(id, username.trim(), hashPassword(password), role || 'user');
  res.json({ id, username: username.trim(), role: role || 'user' });
});

router.put('/users/:id', authMiddleware, adminMiddleware, (req, res) => {
  const user = stmts.getUser.get(req.params.id);
  if (!user) return res.status(404).json({ error: '用户不存在' });
  const { username, role, password } = req.body;
  if (username && username !== user.username && stmts.getUserByUsername.get(username)) return res.status(409).json({ error: '用户名已存在' });
  if (password) {
    const { hashPassword } = require('./auth');
    stmts.updateUserPassword.run(hashPassword(password), req.params.id);
  }
  stmts.updateUser.run(username || user.username, role || user.role, req.params.id);
  res.json({ id: req.params.id, username: username || user.username, role: role || user.role });
});

router.delete('/users/:id', authMiddleware, adminMiddleware, (req, res) => {
  if (req.params.id === req.user.id) return res.status(400).json({ error: '不能删除自己的账号' });
  const user = stmts.getUser.get(req.params.id);
  if (!user) return res.status(404).json({ error: '用户不存在' });
  stmts.deleteUser.run(req.params.id);
  res.json({ success: true });
});

// === AI 设置 ===
router.get('/ai-settings', authMiddleware, (req, res) => {
  const { getAiSettings } = require('./db');
  const s = getAiSettings();
  // 对非 admin 隐藏完整 key
  if (req.user.role !== 'admin' && s.apiKey) {
    s.apiKey = '***' + s.apiKey.slice(-4);
  }
  res.json(s);
});

router.put('/ai-settings', authMiddleware, adminMiddleware, (req, res) => {
  const allowed = ['apiKey', 'baseUrl', 'model'];
  for (const k of allowed) {
    if (req.body[k] !== undefined) stmts.upsertAiSetting.run(k, req.body[k]);
  }
  res.json({ success: true });
});

module.exports = router;
