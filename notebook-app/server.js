/**
 * NoteFlow 后端服务
 *
 * 基于 Express + better-sqlite3 实现的 REST API 服务端。
 * 提供笔记本、笔记、设置的 CRUD 接口，数据持久化到 SQLite 数据库。
 */

const express = require('express');
const Database = require('better-sqlite3');
const path = require('path');

const app = express();
// 服务端口，优先读取环境变量 PORT，默认 3000
const PORT = process.env.PORT || 3000;
// SQLite 数据库文件路径，存放在项目根目录
const DB_FILE = path.join(__dirname, 'noteflow.db');

// ===== 中间件配置 =====

// 解析 JSON 请求体，限制最大 10MB（笔记内容可能较大）
app.use(express.json({ limit: '10mb' }));
// 托管静态文件（index.html、app.js、style.css 等）
app.use(express.static(__dirname));

// ===== 数据库初始化 =====

// 创建数据库连接
const db = new Database(DB_FILE);
// 启用 WAL 模式，提升并发读写性能
db.pragma('journal_mode = WAL');
// 启用外键约束，保证数据完整性
db.pragma('foreign_keys = ON');

// 创建数据库表结构
db.exec(`
  -- 笔记本表：存储笔记本的基本信息
  CREATE TABLE IF NOT EXISTS notebooks (
    id TEXT PRIMARY KEY,                          -- 笔记本唯一标识
    name TEXT NOT NULL,                           -- 笔记本名称
    icon TEXT DEFAULT '📓',                       -- 笔记本图标（emoji）
    created_at INTEGER DEFAULT (strftime('%s','now') * 1000)  -- 创建时间戳（毫秒）
  );

  -- 笔记表：存储笔记内容，通过 notebook_id 关联笔记本
  CREATE TABLE IF NOT EXISTS notes (
    id TEXT PRIMARY KEY,                          -- 笔记唯一标识
    notebook_id TEXT NOT NULL,                    -- 所属笔记本 ID
    title TEXT DEFAULT '',                        -- 笔记标题
    content TEXT DEFAULT '',                      -- 笔记内容（HTML 格式）
    tags TEXT DEFAULT '[]',                       -- 标签列表（JSON 数组字符串）
    created_at INTEGER DEFAULT (strftime('%s','now') * 1000),  -- 创建时间戳
    updated_at INTEGER DEFAULT (strftime('%s','now') * 1000),  -- 更新时间戳
    FOREIGN KEY (notebook_id) REFERENCES notebooks(id) ON DELETE CASCADE
    -- 外键约束：删除笔记本时级联删除其下所有笔记
  );

  -- 设置表：键值对存储应用配置
  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,                         -- 配置键名
    value TEXT                                    -- 配置值（JSON 字符串）
  );
`);

// 如果数据库中没有笔记本，插入默认笔记本
const nbCount = db.prepare('SELECT COUNT(*) as c FROM notebooks').get();
if (nbCount.c === 0) {
  db.prepare('INSERT INTO notebooks (id, name, icon) VALUES (?, ?, ?)').run('default', '默认笔记本', '📓');
}

// ===== 工具函数 =====

/**
 * 生成唯一 ID
 * 结合时间戳和随机数，保证在分布式场景下也基本唯一
 * @returns {string} 基于 36 进制的唯一标识符
 */
function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

/**
 * 将数据库笔记行转换为前端使用的对象格式
 * 主要处理字段名映射（snake_case → camelCase）和 tags 的 JSON 解析
 * @param {Object} row - 数据库查询返回的原始行数据
 * @returns {Object} 前端格式的笔记对象
 */
function rowToNote(row) {
  return {
    id: row.id,
    notebookId: row.notebook_id,
    title: row.title,
    content: row.content,
    tags: JSON.parse(row.tags || '[]'),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

/**
 * 将数据库笔记本行转换为前端使用的对象格式
 * @param {Object} row - 数据库查询返回的原始行数据
 * @returns {Object} 前端格式的笔记本对象
 */
function rowToNotebook(row) {
  return {
    id: row.id,
    name: row.name,
    icon: row.icon
  };
}

/**
 * 从数据库读取所有设置项，组装为对象返回
 * @returns {Object} 设置对象，默认包含 theme: 'light'
 */
function getSettings() {
  const rows = db.prepare('SELECT key, value FROM settings').all();
  const settings = { theme: 'light' };
  for (const row of rows) {
    try {
      settings[row.key] = JSON.parse(row.value);
    } catch {
      settings[row.key] = row.value;
    }
  }
  return settings;
}

// ===== 预编译 SQL 语句 =====
// 预编译可复用的 SQL 语句，避免重复解析，提升性能并防止 SQL 注入

const stmts = {
  // -- 笔记本相关 --
  getAllNotebooks: db.prepare('SELECT * FROM notebooks ORDER BY created_at'),
  getNotebook: db.prepare('SELECT * FROM notebooks WHERE id = ?'),
  insertNotebook: db.prepare('INSERT INTO notebooks (id, name, icon) VALUES (?, ?, ?)'),
  updateNotebook: db.prepare('UPDATE notebooks SET name = ?, icon = ? WHERE id = ?'),
  deleteNotebook: db.prepare('DELETE FROM notebooks WHERE id = ?'),

  // -- 笔记相关 --
  getAllNotes: db.prepare('SELECT * FROM notes ORDER BY updated_at DESC'),
  getNotesByNotebook: db.prepare('SELECT * FROM notes WHERE notebook_id = ? ORDER BY updated_at DESC'),
  getNote: db.prepare('SELECT * FROM notes WHERE id = ?'),
  insertNote: db.prepare('INSERT INTO notes (id, notebook_id, title, content, tags, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)'),
  updateNote: db.prepare('UPDATE notes SET title = ?, content = ?, tags = ?, notebook_id = ?, updated_at = ? WHERE id = ?'),
  updateNotePartial: db.prepare('UPDATE notes SET updated_at = ? WHERE id = ?'),
  deleteNote: db.prepare('DELETE FROM notes WHERE id = ?'),
  deleteNotesByNotebook: db.prepare('DELETE FROM notes WHERE notebook_id = ?'),

  // -- 设置相关 --
  // INSERT OR REPLACE：如果 key 已存在则更新，不存在则插入
  upsertSetting: db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)'),
};

// ===== API 路由 =====

/**
 * GET /api/data - 获取全部数据
 * 前端启动时调用，一次性获取所有笔记本、笔记和设置
 */
app.get('/api/data', (req, res) => {
  const notebooks = stmts.getAllNotebooks.all().map(rowToNotebook);
  const notes = stmts.getAllNotes.all().map(rowToNote);
  const settings = getSettings();
  res.json({ notebooks, notes, settings });
});

/**
 * PUT /api/data - 替换全部数据（导入功能）
 * 使用事务保证原子性：要么全部写入成功，要么全部回滚
 */
app.put('/api/data', (req, res) => {
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

/**
 * PUT /api/settings - 更新设置
 * 接收键值对，逐项写入数据库（upsert 语义）
 */
app.put('/api/settings', (req, res) => {
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
app.get('/api/notebooks', (req, res) => {
  res.json(stmts.getAllNotebooks.all().map(rowToNotebook));
});

/**
 * POST /api/notebooks - 创建笔记本
 * 请求体：{ name: string, icon?: string }
 */
app.post('/api/notebooks', (req, res) => {
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
app.put('/api/notebooks/:id', (req, res) => {
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
app.delete('/api/notebooks/:id', (req, res) => {
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
 * GET /api/notes - 获取笔记列表
 * 可选查询参数：notebookId（按笔记本过滤）
 * 返回结果按更新时间倒序排列（最新修改的排在最前）
 */
app.get('/api/notes', (req, res) => {
  let rows;
  if (req.query.notebookId) {
    rows = stmts.getNotesByNotebook.all(req.query.notebookId);
  } else {
    rows = stmts.getAllNotes.all();
  }
  res.json(rows.map(rowToNote));
});

/**
 * POST /api/notes - 创建笔记
 * 请求体：{ notebookId?, title?, content?, tags? }
 */
app.post('/api/notes', (req, res) => {
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
app.put('/api/notes/:id', (req, res) => {
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
app.delete('/api/notes/:id', (req, res) => {
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

// ===== 启动服务 =====
app.listen(PORT, () => {
  console.log(`NoteFlow server running at http://localhost:${PORT}`);
  console.log(`Database: ${DB_FILE}`);
});
