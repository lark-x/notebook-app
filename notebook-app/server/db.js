const Database = require('better-sqlite3');
const path = require('path');

const DB_FILE = path.join(__dirname, '..', 'noteflow.db');
const db = new Database(DB_FILE);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT DEFAULT 'user',
    created_at INTEGER DEFAULT (strftime('%s','now') * 1000)
  );
  CREATE TABLE IF NOT EXISTS notebooks (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL DEFAULT 'admin',
    name TEXT NOT NULL,
    icon TEXT DEFAULT '📓',
    created_at INTEGER DEFAULT (strftime('%s','now') * 1000)
  );
  CREATE TABLE IF NOT EXISTS notes (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL DEFAULT 'admin',
    notebook_id TEXT NOT NULL,
    title TEXT DEFAULT '',
    content TEXT DEFAULT '',
    tags TEXT DEFAULT '[]',
    created_at INTEGER DEFAULT (strftime('%s','now') * 1000),
    updated_at INTEGER DEFAULT (strftime('%s','now') * 1000),
    FOREIGN KEY (notebook_id) REFERENCES notebooks(id) ON DELETE CASCADE
  );
  CREATE TABLE IF NOT EXISTS note_versions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    note_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    content TEXT DEFAULT '',
    type TEXT DEFAULT 'original',
    ai_type TEXT DEFAULT '',
    label TEXT DEFAULT '',
    created_at INTEGER DEFAULT (strftime('%s','now') * 1000)
  );
  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );
  CREATE TABLE IF NOT EXISTS ai_settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_versions_note ON note_versions(note_id);
`);

// === 数据库迁移 ===
try { db.prepare("ALTER TABLE notebooks ADD COLUMN user_id TEXT NOT NULL DEFAULT 'admin'").run() } catch {}
try { db.prepare("ALTER TABLE notes ADD COLUMN user_id TEXT NOT NULL DEFAULT 'admin'").run() } catch {}
try { db.prepare("CREATE INDEX IF NOT EXISTS idx_notes_user ON notes(user_id)").run() } catch {}
try { db.prepare("CREATE INDEX IF NOT EXISTS idx_notebooks_user ON notebooks(user_id)").run() } catch {}

// Seed admin user if no users exist
const userCount = db.prepare('SELECT COUNT(*) as c FROM users').get();
if (userCount.c === 0) {
  const { hashPassword } = require('./auth');
  db.prepare('INSERT INTO users (id, username, password, role) VALUES (?, ?, ?, ?)').run('admin', 'admin', hashPassword('lark1234'), 'admin');
}

// Ensure admin has a default notebook
const adminNb = db.prepare("SELECT COUNT(*) as c FROM notebooks WHERE user_id = 'admin'").get();
if (adminNb.c === 0) {
  db.prepare('INSERT INTO notebooks (id, user_id, name, icon) VALUES (?, ?, ?, ?)').run('default', 'admin', '默认笔记本', '📓');
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

function rowToVersion(r) {
  return { id: r.id, noteId: r.note_id, content: r.content, type: r.type, aiType: r.ai_type, label: r.label, timestamp: r.created_at };
}

function getSettings() {
  const rows = db.prepare('SELECT key, value FROM settings').all();
  const s = { theme: 'light' };
  for (const r of rows) { try { s[r.key] = JSON.parse(r.value); } catch { s[r.key] = r.value; } }
  return s;
}

function getAiSettings() {
  const rows = db.prepare('SELECT key, value FROM ai_settings').all();
  const s = {};
  for (const r of rows) { s[r.key] = r.value || ''; }
  return s;
}

// 为用户创建默认笔记本（首次登录时调用）
function ensureUserNotebook(userId) {
  const nb = db.prepare('SELECT id FROM notebooks WHERE user_id = ? LIMIT 1').get(userId);
  if (!nb) {
    db.prepare('INSERT INTO notebooks (id, user_id, name, icon) VALUES (?, ?, ?, ?)').run(genId(), userId, '默认笔记本', '📓');
  }
}

const stmts = {
  // Notebooks (user-scoped)
  getAllNotebooks: db.prepare('SELECT * FROM notebooks WHERE user_id = ? ORDER BY created_at'),
  getNotebook: db.prepare('SELECT * FROM notebooks WHERE id = ? AND user_id = ?'),
  insertNotebook: db.prepare('INSERT INTO notebooks (id, user_id, name, icon) VALUES (?, ?, ?, ?)'),
  updateNotebook: db.prepare('UPDATE notebooks SET name = ?, icon = ? WHERE id = ? AND user_id = ?'),
  deleteNotebook: db.prepare('DELETE FROM notebooks WHERE id = ? AND user_id = ?'),
  deleteAllUserNotebooks: db.prepare('DELETE FROM notebooks WHERE user_id = ?'),
  // Notes (user-scoped)
  getAllNotes: db.prepare('SELECT * FROM notes WHERE user_id = ? ORDER BY updated_at DESC'),
  getNote: db.prepare('SELECT * FROM notes WHERE id = ? AND user_id = ?'),
  insertNote: db.prepare('INSERT INTO notes (id, user_id, notebook_id, title, content, tags, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'),
  updateNote: db.prepare('UPDATE notes SET title = ?, content = ?, tags = ?, notebook_id = ?, updated_at = ? WHERE id = ? AND user_id = ?'),
  deleteNote: db.prepare('DELETE FROM notes WHERE id = ? AND user_id = ?'),
  deleteNotesByNotebook: db.prepare('DELETE FROM notes WHERE notebook_id = ? AND user_id = ?'),
  deleteAllUserNotes: db.prepare('DELETE FROM notes WHERE user_id = ?'),
  // Versions
  getNoteVersions: db.prepare('SELECT * FROM note_versions WHERE note_id = ? AND user_id = ? ORDER BY created_at ASC'),
  insertVersion: db.prepare('INSERT INTO note_versions (note_id, user_id, content, type, ai_type, label) VALUES (?, ?, ?, ?, ?, ?)'),
  deleteNoteVersions: db.prepare('DELETE FROM note_versions WHERE note_id = ?'),
  deleteUserVersions: db.prepare('DELETE FROM note_versions WHERE user_id = ?'),
  // Settings
  upsertSetting: db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)'),
  // Users
  getAllUsers: db.prepare('SELECT id, username, role, created_at FROM users ORDER BY created_at'),
  getUser: db.prepare('SELECT * FROM users WHERE id = ?'),
  getUserByUsername: db.prepare('SELECT * FROM users WHERE username = ?'),
  insertUser: db.prepare('INSERT INTO users (id, username, password, role) VALUES (?, ?, ?, ?)'),
  updateUser: db.prepare('UPDATE users SET username = ?, role = ? WHERE id = ?'),
  updateUserPassword: db.prepare('UPDATE users SET password = ? WHERE id = ?'),
  deleteUser: db.prepare('DELETE FROM users WHERE id = ?'),
  // AI Settings
  upsertAiSetting: db.prepare('INSERT OR REPLACE INTO ai_settings (key, value) VALUES (?, ?)'),
};

module.exports = { db, genId, rowToNote, rowToNotebook, rowToVersion, getSettings, getAiSettings, ensureUserNotebook, stmts };
