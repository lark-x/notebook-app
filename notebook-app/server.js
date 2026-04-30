const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data.json');

// ===== Middleware =====
app.use(express.json({ limit: '10mb' }));
app.use(express.static(__dirname));

// ===== Data Helpers =====
function readData() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf8');
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('Failed to read data file:', e.message);
  }
  return {
    notebooks: [{ id: 'default', name: '默认笔记本', icon: '📓' }],
    notes: [],
    settings: { theme: 'light' }
  };
}

function writeData(data) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (e) {
    console.error('Failed to write data file:', e.message);
    return false;
  }
}

// Initialize data file if it doesn't exist
if (!fs.existsSync(DATA_FILE)) {
  writeData(readData());
}

// ===== API Routes =====

// Get all data
app.get('/api/data', (req, res) => {
  res.json(readData());
});

// Replace all data (import)
app.put('/api/data', (req, res) => {
  const data = req.body;
  if (!data || !data.notebooks || !data.notes) {
    return res.status(400).json({ error: 'Invalid data format' });
  }
  if (writeData(data)) {
    res.json({ success: true });
  } else {
    res.status(500).json({ error: 'Failed to save data' });
  }
});

// Update settings
app.put('/api/settings', (req, res) => {
  const data = readData();
  data.settings = { ...data.settings, ...req.body };
  if (writeData(data)) {
    res.json({ success: true, settings: data.settings });
  } else {
    res.status(500).json({ error: 'Failed to save settings' });
  }
});

// ===== Notebook Routes =====

// List notebooks
app.get('/api/notebooks', (req, res) => {
  const data = readData();
  res.json(data.notebooks);
});

// Create notebook
app.post('/api/notebooks', (req, res) => {
  const data = readData();
  const { name, icon } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Name is required' });
  }
  const notebook = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
    name: name.trim(),
    icon: icon || '📓'
  };
  data.notebooks.push(notebook);
  if (writeData(data)) {
    res.json(notebook);
  } else {
    res.status(500).json({ error: 'Failed to create notebook' });
  }
});

// Update notebook
app.put('/api/notebooks/:id', (req, res) => {
  const data = readData();
  const nb = data.notebooks.find(n => n.id === req.params.id);
  if (!nb) {
    return res.status(404).json({ error: 'Notebook not found' });
  }
  if (req.body.name !== undefined) nb.name = req.body.name;
  if (req.body.icon !== undefined) nb.icon = req.body.icon;
  if (writeData(data)) {
    res.json(nb);
  } else {
    res.status(500).json({ error: 'Failed to update notebook' });
  }
});

// Delete notebook
app.delete('/api/notebooks/:id', (req, res) => {
  const data = readData();
  const idx = data.notebooks.findIndex(n => n.id === req.params.id);
  if (idx === -1) {
    return res.status(404).json({ error: 'Notebook not found' });
  }
  data.notebooks.splice(idx, 1);
  // Also delete notes in this notebook
  data.notes = data.notes.filter(n => n.notebookId !== req.params.id);
  if (writeData(data)) {
    res.json({ success: true });
  } else {
    res.status(500).json({ error: 'Failed to delete notebook' });
  }
});

// ===== Note Routes =====

// List notes (optional ?notebookId=xxx)
app.get('/api/notes', (req, res) => {
  const data = readData();
  let notes = data.notes;
  if (req.query.notebookId) {
    notes = notes.filter(n => n.notebookId === req.query.notebookId);
  }
  notes.sort((a, b) => b.updatedAt - a.updatedAt);
  res.json(notes);
});

// Create note
app.post('/api/notes', (req, res) => {
  const data = readData();
  const { notebookId, title, content, tags } = req.body;
  const note = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
    notebookId: notebookId || data.notebooks[0]?.id || 'default',
    title: title || '',
    content: content || '',
    tags: tags || [],
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
  data.notes.unshift(note);
  if (writeData(data)) {
    res.json(note);
  } else {
    res.status(500).json({ error: 'Failed to create note' });
  }
});

// Update note
app.put('/api/notes/:id', (req, res) => {
  const data = readData();
  const note = data.notes.find(n => n.id === req.params.id);
  if (!note) {
    return res.status(404).json({ error: 'Note not found' });
  }
  if (req.body.title !== undefined) note.title = req.body.title;
  if (req.body.content !== undefined) note.content = req.body.content;
  if (req.body.tags !== undefined) note.tags = req.body.tags;
  if (req.body.notebookId !== undefined) note.notebookId = req.body.notebookId;
  note.updatedAt = Date.now();
  if (writeData(data)) {
    res.json(note);
  } else {
    res.status(500).json({ error: 'Failed to update note' });
  }
});

// Delete note
app.delete('/api/notes/:id', (req, res) => {
  const data = readData();
  const idx = data.notes.findIndex(n => n.id === req.params.id);
  if (idx === -1) {
    return res.status(404).json({ error: 'Note not found' });
  }
  data.notes.splice(idx, 1);
  if (writeData(data)) {
    res.json({ success: true });
  } else {
    res.status(500).json({ error: 'Failed to delete note' });
  }
});

// ===== Start Server =====
app.listen(PORT, () => {
  console.log(`NoteFlow server running at http://localhost:${PORT}`);
  console.log(`Data file: ${DATA_FILE}`);
});
