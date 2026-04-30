/**
 * NoteFlow 数据库模块
 *
 * 负责 SQLite 数据库的初始化、表结构创建、
 * 预编译 SQL 语句的注册，以及工具函数的导出。
 *
 * 使用 better-sqlite3 同步驱动，启用 WAL 模式提升并发性能。
 */

const Database = require('better-sqlite3');
const path = require('path');

// SQLite 数据库文件路径，存放在项目根目录
const DB_FILE = path.join(__dirname, '..', 'noteflow.db');

// ===== 数据库连接 =====

/** 创建数据库连接实例 */
const db = new Database(DB_FILE);

// 启用 WAL 模式，提升并发读写性能
db.pragma('journal_mode = WAL');
// 启用外键约束，保证数据完整性
db.pragma('foreign_keys = ON');

// ===== 创建数据库表结构 =====

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

// ===== 初始化默认数据 =====

// 如果数据库中没有笔记本，插入默认笔记本
const nbCount = db.prepare('SELECT COUNT(*) as c FROM notebooks').get();
if (nbCount.c === 0) {
  db.prepare('INSERT INTO notebooks (id, name, icon) VALUES (?, ?, ?)')
    .run('default', '默认笔记本', '📓');
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

// ===== 模块导出 =====

module.exports = {
  db,
  genId,
  rowToNote,
  rowToNotebook,
  getSettings,
  stmts,
};
