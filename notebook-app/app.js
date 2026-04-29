// ===== Data Layer =====
const DB_KEY = 'noteflow_data';

function loadData() {
  try {
    const raw = localStorage.getItem(DB_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) { console.error('Failed to load data:', e); }
  return {
    notebooks: [{ id: 'default', name: '默认笔记本', icon: '📓' }],
    notes: [],
    settings: { theme: 'light' }
  };
}

function saveData(data) {
  localStorage.setItem(DB_KEY, JSON.stringify(data));
}

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function stripHtml(html) {
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || '';
}

function formatDate(ts) {
  const d = new Date(ts);
  const now = new Date();
  const diff = now - d;
  if (diff < 60000) return '刚刚';
  if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小时前`;
  if (diff < 604800000) return `${Math.floor(diff / 86400000)} 天前`;
  return d.toLocaleDateString('zh-CN');
}

// ===== App State =====
let data = loadData();
let currentNotebookId = 'all';
let currentNoteId = null;
let searchQuery = '';
let saveTimer = null;

// ===== DOM Elements =====
const $ = (sel) => document.querySelector(sel);
const notebookList = $('#notebook-list');
const noteList = $('#note-list');
const noteTitle = $('#note-title');
const noteContent = $('#note-content');
const noteTags = $('#note-tags');
const searchInput = $('#search-input');
const editorEmpty = $('#editor-empty');
const editorContainer = $('#editor-container');
const currentNotebookName = $('#current-notebook-name');
const wordCount = $('#word-count');
const lastSaved = $('#last-saved');

// ===== Theme =====
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  $('#btn-toggle-theme').textContent = theme === 'dark' ? '☀️' : '🌙';
  data.settings.theme = theme;
  saveData(data);
}

$('#btn-toggle-theme').addEventListener('click', () => {
  applyTheme(data.settings.theme === 'dark' ? 'light' : 'dark');
});

// ===== Render Notebooks =====
function renderNotebooks() {
  const allCount = data.notes.length;
  let html = `
    <div class="notebook-item ${currentNotebookId === 'all' ? 'active' : ''}" data-id="all">
      <span class="icon">📋</span>
      <span class="name">全部笔记</span>
      <span class="count">${allCount}</span>
    </div>
  `;

  data.notebooks.forEach(nb => {
    const count = data.notes.filter(n => n.notebookId === nb.id).length;
    html += `
      <div class="notebook-item ${currentNotebookId === nb.id ? 'active' : ''}" data-id="${nb.id}">
        <span class="icon">${nb.icon || '📓'}</span>
        <span class="name">${escHtml(nb.name)}</span>
        <span class="count">${count}</span>
        <span class="actions">
          <button class="btn-edit-nb" data-id="${nb.id}" title="重命名">✏️</button>
          <button class="btn-del-nb" data-id="${nb.id}" title="删除">✕</button>
        </span>
      </div>
    `;
  });

  notebookList.innerHTML = html;
}

function escHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ===== Render Note List =====
function getFilteredNotes() {
  let notes = [...data.notes];

  if (currentNotebookId !== 'all') {
    notes = notes.filter(n => n.notebookId === currentNotebookId);
  }

  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    notes = notes.filter(n =>
      n.title.toLowerCase().includes(q) ||
      stripHtml(n.content).toLowerCase().includes(q) ||
      (n.tags || []).some(t => t.toLowerCase().includes(q))
    );
  }

  notes.sort((a, b) => b.updatedAt - a.updatedAt);
  return notes;
}

function renderNoteList() {
  const notes = getFilteredNotes();

  if (notes.length === 0) {
    noteList.innerHTML = '<div class="empty-state" style="padding:40px;font-size:13px;">暂无笔记</div>';
    return;
  }

  noteList.innerHTML = notes.map(n => {
    const preview = stripHtml(n.content).slice(0, 80);
    const tagsHtml = (n.tags || []).map(t => `<span class="tag">${escHtml(t)}</span>`).join('');
    return `
      <div class="note-item ${n.id === currentNoteId ? 'active' : ''}" data-id="${n.id}">
        <div class="note-title">${escHtml(n.title || '无标题')}</div>
        <div class="note-preview">${escHtml(preview) || '空白笔记'}</div>
        <div class="note-meta">
          <span>${formatDate(n.updatedAt)}</span>
          ${tagsHtml ? `<div class="note-tags">${tagsHtml}</div>` : ''}
        </div>
      </div>
    `;
  }).join('');
}

// ===== Render Tags =====
function renderTags() {
  const note = data.notes.find(n => n.id === currentNoteId);
  if (!note) return;

  noteTags.innerHTML = (note.tags || []).map(t =>
    `<span class="tag">${escHtml(t)} <span class="remove-tag" data-tag="${escHtml(t)}">&times;</span></span>`
  ).join('');
}

// ===== Select Notebook =====
function selectNotebook(id) {
  currentNotebookId = id;
  const nb = data.notebooks.find(n => n.id === id);
  currentNotebookName.textContent = id === 'all' ? '全部笔记' : (nb ? nb.name : '笔记');
  renderNotebooks();
  renderNoteList();
}

// ===== Select Note =====
function selectNote(id) {
  const note = data.notes.find(n => n.id === id);
  if (!note) return;

  currentNoteId = id;
  editorEmpty.style.display = 'none';
  editorContainer.style.display = 'flex';

  noteTitle.value = note.title;
  noteContent.innerHTML = note.content;
  renderTags();
  updateWordCount();
  lastSaved.textContent = `上次保存: ${formatDate(note.updatedAt)}`;
  renderNoteList();
}

// ===== Create Note =====
function createNote() {
  const notebookId = currentNotebookId === 'all'
    ? (data.notebooks[0]?.id || 'default')
    : currentNotebookId;

  const note = {
    id: genId(),
    notebookId,
    title: '',
    content: '',
    tags: [],
    createdAt: Date.now(),
    updatedAt: Date.now()
  };

  data.notes.unshift(note);
  saveData(data);
  renderNotebooks();
  renderNoteList();
  selectNote(note.id);
  noteTitle.focus();
}

// ===== Auto Save =====
function scheduleSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    const note = data.notes.find(n => n.id === currentNoteId);
    if (!note) return;

    note.title = noteTitle.value;
    note.content = noteContent.innerHTML;
    note.updatedAt = Date.now();
    saveData(data);

    lastSaved.textContent = `已保存 ${formatDate(note.updatedAt)}`;
    renderNoteList();
    renderNotebooks();
  }, 500);
}

function updateWordCount() {
  const text = stripHtml(noteContent.innerHTML);
  wordCount.textContent = `${text.length} 字`;
}

// ===== Modal =====
function showModal(title, bodyHtml, buttons) {
  $('#modal-title').textContent = title;
  $('#modal-body').innerHTML = bodyHtml;
  $('#modal-footer').innerHTML = buttons;
  $('#modal-overlay').style.display = 'flex';
  setTimeout(() => {
    const input = $('#modal-body input');
    if (input) input.focus();
  }, 50);
}

window.closeModal = function() {
  $('#modal-overlay').style.display = 'none';
};

$('#modal-overlay').addEventListener('click', (e) => {
  if (e.target === e.currentTarget) closeModal();
});

// ===== Event: Notebook Click =====
notebookList.addEventListener('click', (e) => {
  const item = e.target.closest('.notebook-item');
  if (!item) return;

  if (e.target.closest('.btn-edit-nb')) {
    const id = e.target.closest('.btn-edit-nb').dataset.id;
    const nb = data.notebooks.find(n => n.id === id);
    if (!nb) return;
    showModal('重命名笔记本', `<input type="text" id="input-nb-name" value="${escHtml(nb.name)}">`, `
      <button onclick="closeModal()">取消</button>
      <button class="btn-primary" onclick="renameNotebook('${id}')">确定</button>
    `);
    return;
  }

  if (e.target.closest('.btn-del-nb')) {
    const id = e.target.closest('.btn-del-nb').dataset.id;
    const nb = data.notebooks.find(n => n.id === id);
    if (!nb) return;
    const count = data.notes.filter(n => n.notebookId === id).length;
    showModal('删除笔记本', `<p>确定删除「${escHtml(nb.name)}」吗？${count > 0 ? `<br>其中 ${count} 条笔记将一并删除。` : ''}</p>`, `
      <button onclick="closeModal()">取消</button>
      <button class="btn-danger" onclick="deleteNotebook('${id}')">删除</button>
    `);
    return;
  }

  selectNotebook(item.dataset.id);
});

// ===== Event: Note Click =====
noteList.addEventListener('click', (e) => {
  const item = e.target.closest('.note-item');
  if (!item) return;
  selectNote(item.dataset.id);
});

// ===== Event: New Notebook =====
$('#btn-new-notebook').addEventListener('click', () => {
  showModal('新建笔记本', `<input type="text" id="input-nb-name" placeholder="笔记本名称">`, `
    <button onclick="closeModal()">取消</button>
    <button class="btn-primary" onclick="createNotebook()">创建</button>
  `);
});

// ===== Event: New Note =====
$('#btn-new-note').addEventListener('click', createNote);

// ===== Event: Editor =====
noteTitle.addEventListener('input', scheduleSave);
noteContent.addEventListener('input', () => {
  scheduleSave();
  updateWordCount();
});

// Toolbar commands
document.querySelectorAll('.toolbar-btn[data-cmd]').forEach(btn => {
  btn.addEventListener('click', () => {
    const cmd = btn.dataset.cmd;
    const value = btn.dataset.value || null;
    document.execCommand(cmd, false, value);
    noteContent.focus();
  });
});

// ===== Event: Tags =====
$('#btn-add-tag').addEventListener('click', () => {
  showModal('添加标签', `<input type="text" id="input-tag" placeholder="输入标签名称">`, `
    <button onclick="closeModal()">取消</button>
    <button class="btn-primary" onclick="addTag()">添加</button>
  `);
});

noteTags.addEventListener('click', (e) => {
  const removeBtn = e.target.closest('.remove-tag');
  if (!removeBtn) return;
  const tag = removeBtn.dataset.tag;
  const note = data.notes.find(n => n.id === currentNoteId);
  if (!note) return;
  note.tags = (note.tags || []).filter(t => t !== tag);
  saveData(data);
  renderTags();
  renderNoteList();
});

// ===== Event: Delete Note =====
$('#btn-delete-note').addEventListener('click', () => {
  const note = data.notes.find(n => n.id === currentNoteId);
  if (!note) return;
  showModal('删除笔记', `<p>确定删除「${escHtml(note.title || '无标题')}」吗？</p>`, `
    <button onclick="closeModal()">取消</button>
    <button class="btn-danger" onclick="deleteNote()">删除</button>
  `);
});

// ===== Event: Search =====
searchInput.addEventListener('input', (e) => {
  searchQuery = e.target.value.trim();
  renderNoteList();
});

// ===== Event: Export/Import =====
$('#btn-export').addEventListener('click', () => {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `noteflow_backup_${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
});

$('#btn-import').addEventListener('click', () => {
  $('#import-file').click();
});

$('#import-file').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    try {
      const imported = JSON.parse(ev.target.result);
      if (!imported.notebooks || !imported.notes) throw new Error('Invalid format');

      showModal('导入数据', `<p>将导入 ${imported.notes.length} 条笔记和 ${imported.notebooks.length} 个笔记本。<br>现有数据将被覆盖，确定继续？</p>`, `
        <button onclick="closeModal()">取消</button>
        <button class="btn-primary" onclick="confirmImport()">确定导入</button>
      `);

      window._pendingImport = imported;
    } catch (err) {
      showModal('导入失败', `<p>文件格式无效：${err.message}</p>`, `<button onclick="closeModal()">关闭</button>`);
    }
  };
  reader.readAsText(file);
  e.target.value = '';
});

// ===== Global Functions =====
window.createNotebook = function() {
  const input = $('#input-nb-name');
  const name = input.value.trim();
  if (!name) return;

  const icons = ['📓', '📔', '📕', '📗', '📘', '📙', '📒', '🗂️'];
  data.notebooks.push({
    id: genId(),
    name,
    icon: icons[Math.floor(Math.random() * icons.length)]
  });
  saveData(data);
  renderNotebooks();
  closeModal();
};

window.renameNotebook = function(id) {
  const input = $('#input-nb-name');
  const name = input.value.trim();
  if (!name) return;

  const nb = data.notebooks.find(n => n.id === id);
  if (nb) {
    nb.name = name;
    saveData(data);
    renderNotebooks();
    if (currentNotebookId === id) currentNotebookName.textContent = name;
  }
  closeModal();
};

window.deleteNotebook = function(id) {
  data.notes = data.notes.filter(n => n.notebookId !== id);
  data.notebooks = data.notebooks.filter(n => n.id !== id);
  saveData(data);

  if (currentNotebookId === id) {
    currentNotebookId = 'all';
    currentNotebookName.textContent = '全部笔记';
  }
  if (currentNoteId && !data.notes.find(n => n.id === currentNoteId)) {
    currentNoteId = null;
    editorEmpty.style.display = 'flex';
    editorContainer.style.display = 'none';
  }

  renderNotebooks();
  renderNoteList();
  closeModal();
};

window.addTag = function() {
  const input = $('#input-tag');
  const tag = input.value.trim();
  if (!tag) return;

  const note = data.notes.find(n => n.id === currentNoteId);
  if (!note) return;
  if (!note.tags) note.tags = [];
  if (!note.tags.includes(tag)) note.tags.push(tag);
  saveData(data);
  renderTags();
  renderNoteList();
  closeModal();
};

window.deleteNote = function() {
  data.notes = data.notes.filter(n => n.id !== currentNoteId);
  saveData(data);
  currentNoteId = null;
  editorEmpty.style.display = 'flex';
  editorContainer.style.display = 'none';
  renderNotebooks();
  renderNoteList();
  closeModal();
};

window.confirmImport = function() {
  if (window._pendingImport) {
    data = window._pendingImport;
    saveData(data);
    currentNotebookId = 'all';
    currentNoteId = null;
    editorEmpty.style.display = 'flex';
    editorContainer.style.display = 'none';
    renderNotebooks();
    renderNoteList();
    applyTheme(data.settings?.theme || 'light');
    delete window._pendingImport;
  }
  closeModal();
};

// ===== Keyboard Shortcuts =====
document.addEventListener('keydown', (e) => {
  // Ctrl+N: New note
  if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
    e.preventDefault();
    createNote();
  }
  // Ctrl+F: Focus search
  if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
    e.preventDefault();
    searchInput.focus();
  }
  // Escape: Close modal
  if (e.key === 'Escape') {
    closeModal();
  }
});

// ===== Init =====
applyTheme(data.settings?.theme || 'light');
renderNotebooks();
renderNoteList();
