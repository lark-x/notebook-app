const express = require('express');
const Database = require('better-sqlite3');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_FILE = path.join(__dirname, 'noteflow.db');

// ===== Middleware =====
app.use(express.json({ limit: '10mb' }));
app.use(express.static(__dirname));

// ===== Database Setup =====
const db = new Database(DB_FILE);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Create tables
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

// Insert default notebook if none exists
const nbCount = db.prepare('SELECT COUNT(*) as c FROM notebooks').get();
if (nbCount.c === 0) {
  db.prepare('INSERT INTO notebooks (id, name, icon) VALUES (?, ?, ?)').run('default', '默认笔记本', '📓');
}

// ===== Helpers =====
function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

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

function rowToNotebook(row) {
  return {
    id: row.id,
    name: row.name,
    icon: row.icon
  };
}

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

// ===== Prepared Statements =====
const stmts = {
  // Notebooks
  getAllNotebooks: db.prepare('SELECT * FROM notebooks ORDER BY created_at'),
  getNotebook: db.prepare('SELECT * FROM notebooks WHERE id = ?'),
  insertNotebook: db.prepare('INSERT INTO notebooks (id, name, icon) VALUES (?, ?, ?)'),
  updateNotebook: db.prepare('UPDATE notebooks SET name = ?, icon = ? WHERE id = ?'),
  deleteNotebook: db.prepare('DELETE FROM notebooks WHERE id = ?'),

  // Notes
  getAllNotes: db.prepare('SELECT * FROM notes ORDER BY updated_at DESC'),
  getNotesByNotebook: db.prepare('SELECT * FROM notes WHERE notebook_id = ? ORDER BY updated_at DESC'),
  getNote: db.prepare('SELECT * FROM notes WHERE id = ?'),
  insertNote: db.prepare('INSERT INTO notes (id, notebook_id, title, content, tags, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)'),
  updateNote: db.prepare('UPDATE notes SET title = ?, content = ?, tags = ?, notebook_id = ?, updated_at = ? WHERE id = ?'),
  updateNotePartial: db.prepare('UPDATE notes SET updated_at = ? WHERE id = ?'),
  deleteNote: db.prepare('DELETE FROM notes WHERE id = ?'),
  deleteNotesByNotebook: db.prepare('DELETE FROM notes WHERE notebook_id = ?'),

  // Settings
  upsertSetting: db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)'),
};

// ===== API Routes =====

// Get all data
app.get('/api/data', (req, res) => {
  const notebooks = stmts.getAllNotebooks.all().map(rowToNotebook);
  const notes = stmts.getAllNotes.all().map(rowToNote);
  const settings = getSettings();
  res.json({ notebooks, notes, settings });
});

// Replace all data (import)
app.put('/api/data', (req, res) => {
  const { notebooks, notes, settings } = req.body;
  if (!notebooks || !notes) {
    return res.status(400).json({ error: 'Invalid data format' });
  }

  const transaction = db.transaction(() => {
    // Clear existing data
    db.prepare('DELETE FROM notes').run();
    db.prepare('DELETE FROM notebooks').run();
    db.prepare('DELETE FROM settings').run();

    // Insert notebooks
    for (const nb of notebooks) {
      stmts.insertNotebook.run(nb.id, nb.name, nb.icon || '📓');
    }

    // Insert notes
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

    // Insert settings
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

// Update settings
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

// ===== Notebook Routes =====

// List notebooks
app.get('/api/notebooks', (req, res) => {
  res.json(stmts.getAllNotebooks.all().map(rowToNotebook));
});

// Create notebook
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

// Update notebook
app.put('/api/notebooks/:id', (req, res) => {
  const nb = stmts.getNotebook.get(req.params.id);
  if (!nb) {
    return res.status(404).json({ error: 'Notebook not found' });
  }
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

// Delete notebook
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

// ===== Note Routes =====

// List notes
app.get('/api/notes', (req, res) => {
  let rows;
  if (req.query.notebookId) {
    rows = stmts.getNotesByNotebook.all(req.query.notebookId);
  } else {
    rows = stmts.getAllNotes.all();
  }
  res.json(rows.map(rowToNote));
});

// Create note
app.post('/api/notes', (req, res) => {
  const { notebookId, title, content, tags } = req.body;
  const id = genId();
  const now = Date.now();
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

// Update note
app.put('/api/notes/:id', (req, res) => {
  const note = stmts.getNote.get(req.params.id);
  if (!note) {
    return res.status(404).json({ error: 'Note not found' });
  }

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

// Delete note
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

// ===== Start Server =====
app.listen(PORT, () => {
  console.log(`NoteFlow server running at http://localhost:${PORT}`);
  console.log(`Database: ${DB_FILE}`);
});
