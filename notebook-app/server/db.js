const Database = require('better-sqlite3');
const path = require('path');

const DB_FILE = path.join(__dirname, '..', 'noteflow.db');
const db = new Database(DB_FILE);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

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

const nbCount = db.prepare('SELECT COUNT(*) as c FROM notebooks').get();
if (nbCount.c === 0) {
  db.prepare('INSERT INTO notebooks (id, name, icon) VALUES (?, ?, ?)').run('default', '默认笔记本', '📓');
}

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function rowToNote(r) {
  return { id: r.id, notebookId: r.notebook_id, title: r.title, content: r.content, tags: JSON.parse(r.tags || '[]'), createdAt: r.created_at, updatedAt: r.updated_at };
}

function rowToNotebook(r) {
  return { id: r.id, name: r.name, icon: r.icon };
}

function getSettings() {
  const rows = db.prepare('SELECT key, value FROM settings').all();
  const s = { theme: 'light' };
  for (const r of rows) { try { s[r.key] = JSON.parse(r.value); } catch { s[r.key] = r.value; } }
  return s;
}

const stmts = {
  getAllNotebooks: db.prepare('SELECT * FROM notebooks ORDER BY created_at'),
  getNotebook: db.prepare('SELECT * FROM notebooks WHERE id = ?'),
  insertNotebook: db.prepare('INSERT INTO notebooks (id, name, icon) VALUES (?, ?, ?)'),
  updateNotebook: db.prepare('UPDATE notebooks SET name = ?, icon = ? WHERE id = ?'),
  deleteNotebook: db.prepare('DELETE FROM notebooks WHERE id = ?'),
  getAllNotes: db.prepare('SELECT * FROM notes ORDER BY updated_at DESC'),
  getNote: db.prepare('SELECT * FROM notes WHERE id = ?'),
  insertNote: db.prepare('INSERT INTO notes (id, notebook_id, title, content, tags, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)'),
  updateNote: db.prepare('UPDATE notes SET title = ?, content = ?, tags = ?, notebook_id = ?, updated_at = ? WHERE id = ?'),
  deleteNote: db.prepare('DELETE FROM notes WHERE id = ?'),
  deleteNotesByNotebook: db.prepare('DELETE FROM notes WHERE notebook_id = ?'),
  upsertSetting: db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)'),
};

module.exports = { db, genId, rowToNote, rowToNotebook, getSettings, stmts };
