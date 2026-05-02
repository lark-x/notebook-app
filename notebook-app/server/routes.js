/**
 * NoteFlow 主 API 路由
 *
 * 笔记本 CRUD、笔记 CRUD（分页+搜索）、设置、数据导入导出
 */

const express = require('express');
const { db, genId, rowToNote, rowToNotebook, getSettings, stmts } = require('./db');

const router = express.Router();

// ===== 全量数据 =====

router.get('/data', (req, res) => {
  const notebooks = stmts.getAllNotebooks.all().map(rowToNotebook);
  const notes = stmts.getAllNotes.all().map(rowToNote);
  const settings = getSettings();
  res.json({ notebooks, notes, settings });
});

router.put('/data', (req, res) => {
  const { notebooks, notes, settings } = req.body;
  if (!notebooks || !notes) {
    return res.status(400).json({ error: 'Invalid data format' });
  }
  try {
    db.transaction(() => {
      db.prepare('DELETE FROM notes').run();
      db.prepare('DELETE FROM notebooks').run();
      db.prepare('DELETE FROM settings').run();
      for (const nb of notebooks) stmts.insertNotebook.run(nb.id, nb.name, nb.icon || '📓');
      for (const note of notes) {
        stmts.insertNote.run(note.id, note.notebookId, note.title || '', note.content || '',
          JSON.stringify(note.tags || []), note.createdAt || Date.now(), note.updatedAt || Date.now());
      }
      if (settings) {
        for (const [key, value] of Object.entries(settings)) {
          stmts.upsertSetting.run(key, JSON.stringify(value));
        }
      }
    })();
    res.json({ success: true });
  } catch (e) {
    console.error('Import failed:', e.message);
    res.status(500).json({ error: 'Failed to import data' });
  }
});

// ===== 设置 =====

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

// ===== 笔记本 =====

router.get('/notebooks', (req, res) => {
  res.json(stmts.getAllNotebooks.all().map(rowToNotebook));
});

router.post('/notebooks', (req, res) => {
  const { name, icon } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: 'Name is required' });
  const id = genId();
  try {
    stmts.insertNotebook.run(id, name.trim(), icon || '📓');
    res.json({ id, name: name.trim(), icon: icon || '📓' });
  } catch (e) {
    console.error('Create notebook failed:', e.message);
    res.status(500).json({ error: 'Failed to create notebook' });
  }
});

router.put('/notebooks/:id', (req, res) => {
  const nb = stmts.getNotebook.get(req.params.id);
  if (!nb) return res.status(404).json({ error: 'Notebook not found' });
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

router.delete('/notebooks/:id', (req, res) => {
  const nb = stmts.getNotebook.get(req.params.id);
  if (!nb) return res.status(404).json({ error: 'Notebook not found' });
  try {
    db.transaction(() => {
      stmts.deleteNotesByNotebook.run(req.params.id);
      stmts.deleteNotebook.run(req.params.id);
    })();
    res.json({ success: true });
  } catch (e) {
    console.error('Delete notebook failed:', e.message);
    res.status(500).json({ error: 'Failed to delete notebook' });
  }
});

// ===== 笔记 =====

router.get('/notes', (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize) || 15));
  const offset = (page - 1) * pageSize;

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

  const total = db.prepare(`SELECT COUNT(*) as total FROM notes${where}`).get(...params).total;
  const rows = db.prepare(`SELECT * FROM notes${where} ORDER BY updated_at DESC LIMIT ? OFFSET ?`)
    .all(...params, pageSize, offset);

  res.json({ notes: rows.map(rowToNote), total, page, pageSize });
});

router.post('/notes', (req, res) => {
  const { notebookId, title, content, tags } = req.body;
  const id = genId();
  const now = Date.now();
  const nbId = notebookId || 'default';
  try {
    stmts.insertNote.run(id, nbId, title || '', content || '', JSON.stringify(tags || []), now, now);
    res.json({ id, notebookId: nbId, title: title || '', content: content || '', tags: tags || [], createdAt: now, updatedAt: now });
  } catch (e) {
    console.error('Create note failed:', e.message);
    res.status(500).json({ error: 'Failed to create note' });
  }
});

router.put('/notes/:id', (req, res) => {
  const note = stmts.getNote.get(req.params.id);
  if (!note) return res.status(404).json({ error: 'Note not found' });
  const title = req.body.title !== undefined ? req.body.title : note.title;
  const content = req.body.content !== undefined ? req.body.content : note.content;
  const tags = req.body.tags !== undefined ? JSON.stringify(req.body.tags) : note.tags;
  const notebookId = req.body.notebookId !== undefined ? req.body.notebookId : note.notebook_id;
  const now = Date.now();
  try {
    stmts.updateNote.run(title, content, tags, notebookId, now, req.params.id);
    res.json({ id: req.params.id, notebookId, title, content, tags: JSON.parse(tags), createdAt: note.created_at, updatedAt: now });
  } catch (e) {
    console.error('Update note failed:', e.message);
    res.status(500).json({ error: 'Failed to update note' });
  }
});

router.delete('/notes/:id', (req, res) => {
  const note = stmts.getNote.get(req.params.id);
  if (!note) return res.status(404).json({ error: 'Note not found' });
  try {
    stmts.deleteNote.run(req.params.id);
    res.json({ success: true });
  } catch (e) {
    console.error('Delete note failed:', e.message);
    res.status(500).json({ error: 'Failed to delete note' });
  }
});

module.exports = router;
