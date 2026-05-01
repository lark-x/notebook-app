/**
 * NoteFlow 数据库模块
 *
 * SQLite 数据库初始化、表结构创建、预编译语句注册。
 * 使用 better-sqlite3 同步驱动，启用 WAL 模式。
 */

const Database = require('better-sqlite3');
const path = require('path');

const DB_FILE = path.join(__dirname, '..', 'noteflow.db');
const db = new Database(DB_FILE);

// 启用 WAL 模式和外键约束
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// 创建表结构
db.exec(`
  CREATE TABLE IF NOT EXISTS notebooks (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    icon TEXT DEFAULT '📓',
    created_at INTEGER DEFAULT (strftime('%s','now') * 1000)
  );

  CREATE TABLE IF NOT EXISTS notes (
    id TEXT PRIMARY KEY,
    notebook_id TEXT NOT NULL,
    title TEXT DEFAULT '',
    content TEXT DEFAULT '',
    tags TEXT DEFAULT '[]',
    created_at INTEGER DEFAULT (strftime('%s','now') * 1000),
    updated_at INTEGER DEFAULT (strftime('%s','now') * 1000),
    FOREIGN KEY (notebook_id) REFERENCES notebooks(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );
`);

// 初始化默认笔记本
const nbCount = db.prepare('SELECT COUNT(*) as c FROM notebooks').get();
if (nbCount.c === 0) {
  db.prepare('INSERT INTO notebooks (id, name, icon) VALUES (?, ?, ?)')
    .run('default', '默认笔记本', '📓');
}

/** 生成唯一 ID */
function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

/** 数据库行 → 笔记对象 */
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

/** 数据库行 → 笔记本对象 */
function rowToNotebook(row) {
  return { id: row.id, name: row.name, icon: row.icon };
}

/** 获取所有设置 */
function getSettings() {
  const rows = db.prepare('SELECT key, value FROM settings').all();
  const settings = { theme: 'light' };
  for (const row of rows) {
    try { settings[row.key] = JSON.parse(row.value); }
    catch { settings[row.key] = row.value; }
  }
  return settings;
}

// 预编译 SQL 语句
const stmts = {
  getAllNotebooks: db.prepare('SELECT * FROM notebooks ORDER BY created_at'),
  getNotebook: db.prepare('SELECT * FROM notebooks WHERE id = ?'),
  insertNotebook: db.prepare('INSERT INTO notebooks (id, name, icon) VALUES (?, ?, ?)'),
  updateNotebook: db.prepare('UPDATE notebooks SET name = ?, icon = ? WHERE id = ?'),
  deleteNotebook: db.prepare('DELETE FROM notebooks WHERE id = ?'),
  getAllNotes: db.prepare('SELECT * FROM notes ORDER BY updated_at DESC'),
  getNotesByNotebook: db.prepare('SELECT * FROM notes WHERE notebook_id = ? ORDER BY updated_at DESC'),
  getNote: db.prepare('SELECT * FROM notes WHERE id = ?'),
  insertNote: db.prepare('INSERT INTO notes (id, notebook_id, title, content, tags, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)'),
  updateNote: db.prepare('UPDATE notes SET title = ?, content = ?, tags = ?, notebook_id = ?, updated_at = ? WHERE id = ?'),
  deleteNote: db.prepare('DELETE FROM notes WHERE id = ?'),
  deleteNotesByNotebook: db.prepare('DELETE FROM notes WHERE notebook_id = ?'),
  upsertSetting: db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)')
};

module.exports = { db, genId, rowToNote, rowToNotebook, getSettings, stmts };
