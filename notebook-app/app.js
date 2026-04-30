/**
 * NoteFlow 前端应用
 *
 * 纯 JavaScript 实现的笔记本前端，支持双模式运行：
 * 1. 有后端服务时：通过 REST API 进行数据持久化
 * 2. 无后端服务时：降级为 localStorage 本地存储
 */

// ===== 数据层配置 =====

// localStorage 存储键名，用于离线模式和数据备份
const DB_KEY = 'noteflow_data';
// 后端 API 基础路径
const API_BASE = '/api';
// 是否使用后端 API（启动时自动检测）
let useApi = true;

/**
 * 检测后端 API 是否可用
 * 向 /api/data 发送一个带 2 秒超时的 GET 请求，
 * 成功则启用 API 模式，失败则降级为 localStorage 模式
 */
async function checkApiAvailability() {
  try {
    const res = await fetch(`${API_BASE}/data`, { method: 'GET', signal: AbortSignal.timeout(2000) });
    if (res.ok) {
      useApi = true;
      return true;
    }
  } catch (e) {
    // API 不可用，降级为 localStorage
  }
  useApi = false;
  return false;
}

/**
 * 从 localStorage 加载数据
 * 如果没有数据或解析失败，返回包含默认笔记本的初始数据
 * @returns {Object} 应用数据对象
 */
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

/**
 * 将数据保存到 localStorage
 * @param {Object} data - 应用数据对象
 */
function saveData(data) {
  localStorage.setItem(DB_KEY, JSON.stringify(data));
}

/**
 * 发送 API 请求的通用方法
 * @param {string} method - HTTP 方法（GET/POST/PUT/DELETE）
 * @param {string} path - API 路径（不含 /api 前缀）
 * @param {Object} [body] - 请求体（可选）
 * @returns {Promise<Object>} 响应 JSON 数据
 */
async function apiRequest(method, path, body) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' }
  };
  if (body !== undefined) opts.body = JSON.stringify(body);
  const res = await fetch(`${API_BASE}${path}`, opts);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(err.error || 'Request failed');
  }
  return res.json();
}

/**
 * 将本地数据全量同步到服务器
 * 仅在 localStorage 模式下作为降级方案使用
 */
async function syncToServer(data) {
  if (!useApi) return;
  try {
    await apiRequest('PUT', '/data', data);
  } catch (e) {
    console.warn('Failed to sync to server:', e.message);
  }
}

/**
 * 从服务器加载全量数据
 * @returns {Promise<Object|null>} 服务器数据，失败返回 null
 */
async function loadFromServer() {
  try {
    return await apiRequest('GET', '/data');
  } catch (e) {
    console.warn('Failed to load from server:', e.message);
    return null;
  }
}

/**
 * 生成唯一 ID
 * @returns {string} 基于时间戳和随机数的唯一标识
 */
function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

/**
 * 去除 HTML 标签，提取纯文本内容
 * 用于笔记预览和搜索匹配
 * @param {string} html - HTML 字符串
 * @returns {string} 纯文本内容
 */
function stripHtml(html) {
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || '';
}

/**
 * 将时间戳格式化为相对时间描述
 * 1 分钟内显示"刚刚"，1 小时内显示"N 分钟前"，以此类推
 * @param {number} ts - 毫秒级时间戳
 * @returns {string} 格式化后的时间字符串
 */
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

// ===== 应用状态 =====

// 当前应用数据（笔记本列表、笔记列表、设置）
let data = loadData();
// 当前选中的笔记本 ID，'all' 表示查看全部
let currentNotebookId = 'all';
// 当前选中的笔记 ID，null 表示未选中
let currentNoteId = null;
// 搜索关键词
let searchQuery = '';
// 自动保存的定时器句柄
let saveTimer = null;

// ===== DOM 元素引用 =====

// 选择器简写
const $ = (sel) => document.querySelector(sel);

// 侧边栏 - 笔记本列表容器
const notebookList = $('#notebook-list');
// 中间面板 - 笔记列表容器
const noteList = $('#note-list');
// 编辑器 - 标题输入框
const noteTitle = $('#note-title');
// 编辑器 - 内容编辑区（contenteditable）
const noteContent = $('#note-content');
// 编辑器 - 标签展示区
const noteTags = $('#note-tags');
// 侧边栏 - 搜索输入框
const searchInput = $('#search-input');
// 编辑器 - 未选中笔记时的空状态提示
const editorEmpty = $('#editor-empty');
// 编辑器 - 编辑器容器（选中笔记后显示）
const editorContainer = $('#editor-container');
// 中间面板 - 当前笔记本名称标题
const currentNotebookName = $('#current-notebook-name');
// 编辑器 - 字数统计
const wordCount = $('#word-count');
// 编辑器 - 最后保存时间
const lastSaved = $('#last-saved');

// ===== 主题切换 =====

/**
 * 应用主题
 * 通过 data-theme 属性切换 CSS 变量，实现明暗主题
 * 同时将主题偏好保存到本地和服务器
 * @param {string} theme - 主题名称，'light' 或 'dark'
 */
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  $('#btn-toggle-theme').textContent = theme === 'dark' ? '☀️' : '🌙';
  data.settings.theme = theme;
  saveData(data);
  if (useApi) {
    apiRequest('PUT', '/settings', { theme }).catch(() => {});
  }
}

// 主题切换按钮点击事件
$('#btn-toggle-theme').addEventListener('click', () => {
  applyTheme(data.settings.theme === 'dark' ? 'light' : 'dark');
});

// ===== 渲染笔记本列表 =====

/**
 * 渲染侧边栏的笔记本列表
 * 包含"全部笔记"入口和所有用户创建的笔记本，
 * 每个笔记本显示图标、名称、笔记数量，以及编辑/删除操作按钮
 */
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

/**
 * HTML 转义：防止 XSS 注入
 * @param {string} str - 原始字符串
 * @returns {string} 转义后的安全字符串
 */
function escHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ===== 渲染笔记列表 =====

/**
 * 根据当前笔记本和搜索条件过滤笔记
 * 过滤逻辑：先按笔记本筛选，再按搜索关键词匹配标题/内容/标签
 * @returns {Array} 过滤并排序后的笔记数组
 */
function getFilteredNotes() {
  let notes = [...data.notes];

  // 按笔记本过滤
  if (currentNotebookId !== 'all') {
    notes = notes.filter(n => n.notebookId === currentNotebookId);
  }

  // 按搜索关键词过滤（匹配标题、内容、标签）
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    notes = notes.filter(n =>
      n.title.toLowerCase().includes(q) ||
      stripHtml(n.content).toLowerCase().includes(q) ||
      (n.tags || []).some(t => t.toLowerCase().includes(q))
    );
  }

  // 按更新时间倒序排列
  notes.sort((a, b) => b.updatedAt - a.updatedAt);
  return notes;
}

/**
 * 渲染中间面板的笔记列表
 * 接收当前页的笔记数组，渲染列表和分页控件
 * @param {Array} notes - 当前页的笔记数组
 */
function renderNoteList(notes) {
  if (!notes || notes.length === 0) {
    noteList.innerHTML = '<div class="empty-state" style="padding:40px;font-size:13px;">暂无笔记</div>';
    return;
  }

  let html = notes.map(n => {
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

  // 添加分页控件
  if (totalPages > 1) {
    html += `
      <div class="pagination">
        <div class="pagination-info">第 ${currentPage}/${totalPages} 页，共 ${totalNotes} 条</div>
        <div class="pagination-controls">
          <button class="pagination-btn" onclick="goToPage(1)" ${currentPage === 1 ? 'disabled' : ''} title="首页">«</button>
          <button class="pagination-btn" onclick="goToPage(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''} title="上一页">‹</button>
          <button class="pagination-btn" onclick="goToPage(${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''} title="下一页">›</button>
          <button class="pagination-btn" onclick="goToPage(${totalPages})" ${currentPage === totalPages ? 'disabled' : ''} title="末页">»</button>
        </div>
      </div>
    `;
  }

  noteList.innerHTML = html;
}

/**
 * 跳转到指定页码
 * @param {number} page - 目标页码
 */
window.goToPage = async function(page) {
  if (page < 1 || page > totalPages || page === currentPage) return;
  currentPage = page;
  const result = await fetchNotesWithPagination();
  renderNoteList(result.notes);
};

// ===== 渲染标签 =====

/**
 * 渲染当前选中笔记的标签列表
 * 每个标签带删除按钮（×），点击可移除该标签
 */
function renderTags() {
  const note = data.notes.find(n => n.id === currentNoteId);
  if (!note) return;

  noteTags.innerHTML = (note.tags || []).map(t =>
    `<span class="tag">${escHtml(t)} <span class="remove-tag" data-tag="${escHtml(t)}">&times;</span></span>`
  ).join('');
}

// ===== 选择笔记本 =====

/**
 * 选中指定笔记本并刷新界面
 * @param {string} id - 笔记本 ID，'all' 表示查看全部笔记
 */
function selectNotebook(id) {
  currentNotebookId = id;
  const nb = data.notebooks.find(n => n.id === id);
  currentNotebookName.textContent = id === 'all' ? '全部笔记' : (nb ? nb.name : '笔记');
  resetPagination();
  renderNotebooks();
  fetchNotesWithPagination().then(result => renderNoteList(result.notes));
}

// ===== 选择笔记 =====

/**
 * 选中指定笔记并在编辑器中展示
 * @param {string} id - 笔记 ID
 */
function selectNote(id) {
  const note = data.notes.find(n => n.id === id);
  if (!note) return;

  currentNoteId = id;
  // 隐藏空状态提示，显示编辑器
  editorEmpty.style.display = 'none';
  editorContainer.style.display = 'flex';

  // 填充编辑器内容
  noteTitle.value = note.title;
  noteContent.innerHTML = note.content;
  renderTags();
  updateWordCount();
  lastSaved.textContent = `上次保存: ${formatDate(note.updatedAt)}`;
  renderNoteList();
}

// ===== 创建笔记 =====

/**
 * 创建新笔记
 * 优先通过 API 创建（获取服务端生成的 ID），
 * 如果 API 不可用则本地生成 ID 并同步到服务器
 */
async function createNote() {
  // 确定归属笔记本：当前选中的笔记本，或默认笔记本
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

  if (useApi) {
    try {
      const created = await apiRequest('POST', '/notes', { notebookId, title: '', content: '', tags: [] });
      Object.assign(note, created);
    } catch (e) {
      console.warn('API create note failed, using local:', e.message);
    }
  }

  // 将新笔记插入到列表头部
  data.notes.unshift(note);
  saveData(data);
  if (!useApi) syncToServer(data);
  renderNotebooks();
  fetchNotesWithPagination().then(result => renderNoteList(result.notes));
  // 自动选中新笔记并聚焦标题输入框
  selectNote(note.id);
  noteTitle.focus();
}

// ===== 自动保存 =====

/**
 * 触发延迟自动保存
 * 使用 500ms 防抖：用户停止输入 500ms 后才执行保存，
 * 避免每次按键都触发 API 请求
 */
function scheduleSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    const note = data.notes.find(n => n.id === currentNoteId);
    if (!note) return;

    // 同步编辑器内容到数据对象
    note.title = noteTitle.value;
    note.content = noteContent.innerHTML;
    note.updatedAt = Date.now();

    // 优先通过 API 保存
    if (useApi) {
      try {
        await apiRequest('PUT', `/notes/${note.id}`, {
          title: note.title,
          content: note.content,
          tags: note.tags
        });
      } catch (e) {
        console.warn('API save note failed:', e.message);
      }
    }

    // 同时保存到 localStorage（作为备份）
    saveData(data);
    lastSaved.textContent = `已保存 ${formatDate(note.updatedAt)}`;
    renderNoteList();
    renderNotebooks();
  }, 500);
}

/**
 * 更新编辑器状态栏的字数统计
 */
function updateWordCount() {
  const text = stripHtml(noteContent.innerHTML);
  wordCount.textContent = `${text.length} 字`;
}

// ===== 分页状态与辅助函数 =====

// 当前页码（从 1 开始）
let currentPage = 1;
// 每页显示的笔记数量
let pageSize = 15;
// 当前筛选条件下的笔记总数
let totalNotes = 0;
// 总页数
let totalPages = 0;

/**
 * 重置分页到第一页
 * 在切换笔记本或搜索关键词变化时调用
 */
function resetPagination() {
  currentPage = 1;
}

/**
 * 计算总页数
 * @returns {number} 总页数
 */
function calcTotalPages() {
  return Math.max(1, Math.ceil(totalNotes / pageSize));
}

/**
 * 获取当前页的笔记数据
 * API 模式下请求后端分页接口，localStorage 模式下在客户端分页
 * @returns {Promise<Object>} 包含 notes、total、page、pageSize 的结果对象
 */
async function fetchNotesWithPagination() {
  if (useApi) {
    try {
      const params = new URLSearchParams({ page: currentPage, pageSize });
      if (currentNotebookId !== 'all') params.set('notebookId', currentNotebookId);
      if (searchQuery) params.set('search', searchQuery);
      const result = await apiRequest('GET', `/notes?${params.toString()}`);
      totalNotes = result.total;
      currentPage = result.page;
      totalPages = calcTotalPages();
      return result;
    } catch (e) {
      console.warn('API fetch notes failed:', e.message);
    }
  }
  // localStorage 模式：在客户端过滤并分页
  const allFiltered = getFilteredNotes();
  totalNotes = allFiltered.length;
  totalPages = calcTotalPages();
  if (currentPage > totalPages) currentPage = totalPages;
  const start = (currentPage - 1) * pageSize;
  return {
    notes: allFiltered.slice(start, start + pageSize),
    total: totalNotes,
    page: currentPage,
    pageSize
  };
}

// ===== 模态框 =====

/**
 * 显示模态框
 * @param {string} title - 模态框标题
 * @param {string} bodyHtml - 模态框内容 HTML
 * @param {string} buttons - 模态框底部按钮 HTML
 */
function showModal(title, bodyHtml, buttons) {
  $('#modal-title').textContent = title;
  $('#modal-body').innerHTML = bodyHtml;
  $('#modal-footer').innerHTML = buttons;
  $('#modal-overlay').style.display = 'flex';
  // 自动聚焦到输入框（如果有）
  setTimeout(() => {
    const input = $('#modal-body input');
    if (input) input.focus();
  }, 50);
}

/**
 * 关闭模态框
 */
window.closeModal = function() {
  $('#modal-overlay').style.display = 'none';
};

// 点击模态框背景关闭
$('#modal-overlay').addEventListener('click', (e) => {
  if (e.target === e.currentTarget) closeModal();
});

// ===== 事件：笔记本列表点击 =====

notebookList.addEventListener('click', (e) => {
  const item = e.target.closest('.notebook-item');
  if (!item) return;

  // 点击重命名按钮
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

  // 点击删除按钮
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

  // 点击笔记本项，切换选中
  selectNotebook(item.dataset.id);
});

// ===== 事件：笔记列表点击 =====

noteList.addEventListener('click', (e) => {
  const item = e.target.closest('.note-item');
  if (!item) return;
  selectNote(item.dataset.id);
});

// ===== 事件：新建笔记本 =====

$('#btn-new-notebook').addEventListener('click', () => {
  showModal('新建笔记本', `<input type="text" id="input-nb-name" placeholder="笔记本名称">`, `
    <button onclick="closeModal()">取消</button>
    <button class="btn-primary" onclick="createNotebook()">创建</button>
  `);
});

// ===== 事件：新建笔记 =====

$('#btn-new-note').addEventListener('click', createNote);

// ===== 事件：编辑器输入 =====

// 标题输入触发自动保存
noteTitle.addEventListener('input', scheduleSave);
// 内容输入触发自动保存和字数更新
noteContent.addEventListener('input', () => {
  scheduleSave();
  updateWordCount();
});

// 工具栏按钮：执行富文本编辑命令
document.querySelectorAll('.toolbar-btn[data-cmd]').forEach(btn => {
  btn.addEventListener('click', () => {
    const cmd = btn.dataset.cmd;
    const value = btn.dataset.value || null;
    // 使用浏览器原生的 execCommand 执行格式化
    document.execCommand(cmd, false, value);
    noteContent.focus();
  });
});

// ===== 事件：标签操作 =====

// 添加标签按钮
$('#btn-add-tag').addEventListener('click', () => {
  showModal('添加标签', `<input type="text" id="input-tag" placeholder="输入标签名称">`, `
    <button onclick="closeModal()">取消</button>
    <button class="btn-primary" onclick="addTag()">添加</button>
  `);
});

// 点击标签上的 × 按钮删除标签
noteTags.addEventListener('click', async (e) => {
  const removeBtn = e.target.closest('.remove-tag');
  if (!removeBtn) return;
  const tag = removeBtn.dataset.tag;
  const note = data.notes.find(n => n.id === currentNoteId);
  if (!note) return;
  // 从标签数组中移除指定标签
  note.tags = (note.tags || []).filter(t => t !== tag);

  if (useApi) {
    try {
      await apiRequest('PUT', `/notes/${note.id}`, { tags: note.tags });
    } catch (e) {
      console.warn('API update tags failed:', e.message);
    }
  }

  saveData(data);
  renderTags();
  renderNoteList();
});

// ===== 事件：删除笔记 =====

$('#btn-delete-note').addEventListener('click', () => {
  const note = data.notes.find(n => n.id === currentNoteId);
  if (!note) return;
  showModal('删除笔记', `<p>确定删除「${escHtml(note.title || '无标题')}」吗？</p>`, `
    <button onclick="closeModal()">取消</button>
    <button class="btn-danger" onclick="deleteNote()">删除</button>
  `);
});

// ===== 事件：搜索 =====

searchInput.addEventListener('input', async (e) => {
  searchQuery = e.target.value.trim();
  resetPagination();
  const result = await fetchNotesWithPagination();
  renderNoteList(result.notes);
});

// ===== 事件：导出/导入 =====

/**
 * 导出数据为 JSON 文件
 * 创建一个 Blob 对象并通过临时 <a> 标签触发下载
 */
$('#btn-export').addEventListener('click', () => {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `noteflow_backup_${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
});

// 点击导入按钮触发隐藏的文件选择框
$('#btn-import').addEventListener('click', () => {
  $('#import-file').click();
});

// 文件选择后解析 JSON 并弹出确认对话框
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

      // 暂存待导入数据，等待用户确认
      window._pendingImport = imported;
    } catch (err) {
      showModal('导入失败', `<p>文件格式无效：${err.message}</p>`, `<button onclick="closeModal()">关闭</button>`);
    }
  };
  reader.readAsText(file);
  // 清空 input 值，允许重复选择同一文件
  e.target.value = '';
});

// ===== 全局操作函数 =====
// 这些函数由模态框中的按钮通过 onclick 调用，需要挂载到 window 上

/**
 * 创建笔记本（由模态框"创建"按钮调用）
 */
window.createNotebook = async function() {
  const input = $('#input-nb-name');
  const name = input.value.trim();
  if (!name) return;

  // 随机分配一个笔记本图标
  const icons = ['📓', '📔', '📕', '📗', '📘', '📙', '📒', '🗂️'];
  const icon = icons[Math.floor(Math.random() * icons.length)];

  if (useApi) {
    try {
      const created = await apiRequest('POST', '/notebooks', { name, icon });
      data.notebooks.push(created);
      saveData(data);
      renderNotebooks();
      closeModal();
      return;
    } catch (e) {
      console.warn('API create notebook failed, using local:', e.message);
    }
  }

  data.notebooks.push({ id: genId(), name, icon });
  saveData(data);
  syncToServer(data);
  renderNotebooks();
  closeModal();
};

/**
 * 重命名笔记本（由模态框"确定"按钮调用）
 * @param {string} id - 笔记本 ID
 */
window.renameNotebook = async function(id) {
  const input = $('#input-nb-name');
  const name = input.value.trim();
  if (!name) return;

  const nb = data.notebooks.find(n => n.id === id);
  if (nb) {
    nb.name = name;

    if (useApi) {
      try {
        await apiRequest('PUT', `/notebooks/${id}`, { name });
      } catch (e) {
        console.warn('API rename notebook failed:', e.message);
      }
    }

    saveData(data);
    renderNotebooks();
    // 如果重命名的是当前选中的笔记本，同步更新面板标题
    if (currentNotebookId === id) currentNotebookName.textContent = name;
  }
  closeModal();
};

/**
 * 删除笔记本（由模态框"删除"按钮调用）
 * 同时删除该笔记本下的所有笔记
 * @param {string} id - 笔记本 ID
 */
window.deleteNotebook = async function(id) {
  if (useApi) {
    try {
      await apiRequest('DELETE', `/notebooks/${id}`);
    } catch (e) {
      console.warn('API delete notebook failed:', e.message);
    }
  }

  // 从本地数据中移除
  data.notes = data.notes.filter(n => n.notebookId !== id);
  data.notebooks = data.notebooks.filter(n => n.id !== id);
  saveData(data);

  // 如果删除的是当前选中的笔记本，重置为"全部笔记"
  if (currentNotebookId === id) {
    currentNotebookId = 'all';
    currentNotebookName.textContent = '全部笔记';
  }
  // 如果当前选中的笔记被删除了，清空编辑器
  if (currentNoteId && !data.notes.find(n => n.id === currentNoteId)) {
    currentNoteId = null;
    editorEmpty.style.display = 'flex';
    editorContainer.style.display = 'none';
  }

  renderNotebooks();
  renderNoteList();
  closeModal();
};

/**
 * 为当前笔记添加标签（由模态框"添加"按钮调用）
 */
window.addTag = async function() {
  const input = $('#input-tag');
  const tag = input.value.trim();
  if (!tag) return;

  const note = data.notes.find(n => n.id === currentNoteId);
  if (!note) return;
  if (!note.tags) note.tags = [];
  // 避免重复添加同一标签
  if (!note.tags.includes(tag)) note.tags.push(tag);

  if (useApi) {
    try {
      await apiRequest('PUT', `/notes/${note.id}`, { tags: note.tags });
    } catch (e) {
      console.warn('API add tag failed:', e.message);
    }
  }

  saveData(data);
  renderTags();
  renderNoteList();
  closeModal();
};

/**
 * 删除当前选中的笔记（由模态框"删除"按钮调用）
 */
window.deleteNote = async function() {
  if (useApi) {
    try {
      await apiRequest('DELETE', `/notes/${currentNoteId}`);
    } catch (e) {
      console.warn('API delete note failed:', e.message);
    }
  }

  data.notes = data.notes.filter(n => n.id !== currentNoteId);
  saveData(data);
  currentNoteId = null;
  editorEmpty.style.display = 'flex';
  editorContainer.style.display = 'none';
  renderNotebooks();
  renderNoteList();
  closeModal();
};

/**
 * 确认导入数据（由模态框"确定导入"按钮调用）
 * 用暂存的导入数据替换当前所有数据
 */
window.confirmImport = async function() {
  if (window._pendingImport) {
    data = window._pendingImport;
    saveData(data);

    if (useApi) {
      try {
        await apiRequest('PUT', '/data', data);
      } catch (e) {
        console.warn('API import failed:', e.message);
      }
    }

    // 重置界面状态
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

// ===== AI 创意转化模块 =====

/**
 * AI 创意转化功能
 *
 * 提供基于关键词的文本风格转换、内容扩展和摘要提炼能力。
 * 通过后端 /api/ai-transform 接口调用真实的 OpenAI 兼容 API。
 *
 * 主要特性：
 * - 支持多种转化类型（风格转换、内容扩展、摘要提炼）
 * - 用户可自定义、增删关键词
 * - 原文与转化结果对比预览
 * - 用户可选择采纳或放弃转化结果
 * - AI API 未配置时显示友好提示
 */

// AI 转化面板的当前状态
const aiState = {
  // 当前选中的转化类型
  currentType: 'style',
  // 用户自定义关键词列表
  keywords: ['诗意化', '优美'],
  // 当前转化结果（null 表示尚未转化）
  result: null,
  // 是否正在转化中
  loading: false,
  // AI API 是否已配置（启动时检测）
  apiConfigured: true
};

/**
 * 预设的转化类型配置
 * 每种类型包含：id、名称、图标、默认关键词
 */
const AI_TRANSFORM_TYPES = {
  style: {
    name: '风格转换',
    icon: '🎨',
    defaultKeywords: ['诗意化', '优美']
  },
  expand: {
    name: '内容扩展',
    icon: '📝',
    defaultKeywords: ['细节', '场景']
  },
  summary: {
    name: '摘要提炼',
    icon: '📋',
    defaultKeywords: ['核心', '精简']
  }
};

/**
 * 检测后端 AI API 配置状态
 * 向 /api/ai-status 发起请求，判断 AI 功能是否可用
 */
async function checkAiStatus() {
  if (!useApi) {
    aiState.apiConfigured = false;
    return;
  }
  try {
    const status = await apiRequest('GET', '/ai-status');
    aiState.apiConfigured = status.configured;
  } catch (e) {
    aiState.apiConfigured = false;
  }
}

/**
 * 渲染 AI 创意转化面板
 * 创建完整的面板 DOM 元素并挂载到页面
 */
function renderAiPanel() {
  // 如果面板已存在则不重复创建
  if ($('#ai-panel')) return;

  const panel = document.createElement('div');
  panel.id = 'ai-panel';
  panel.innerHTML = `
    <div class="ai-panel">
      <div class="ai-panel-header">
        <h3>✨ AI 创意转化</h3>
        <button class="ai-panel-close" onclick="closeAiPanel()">&times;</button>
      </div>
      <div class="ai-panel-body">
        <!-- 转化类型选择 -->
        <div class="ai-transform-types">
          ${Object.entries(AI_TRANSFORM_TYPES).map(([key, type]) => `
            <button class="ai-type-btn ${aiState.currentType === key ? 'active' : ''}"
                    data-type="${key}" onclick="selectAiType('${key}')">
              ${type.icon} ${type.name}
            </button>
          `).join('')}
        </div>

        <!-- 关键词标签区 -->
        <div class="ai-keywords-section">
          <label>自定义关键词 <span class="hint">（影响转化效果，可自由增删）</span></label>
          <div class="ai-keywords-tags" id="ai-keywords-tags">
            ${aiState.keywords.map(k => `
              <span class="ai-keyword-tag">
                ${escHtml(k)}
                <span class="remove-keyword" onclick="removeAiKeyword('${escHtml(k)}')">&times;</span>
              </span>
            `).join('')}
          </div>
          <div class="ai-keyword-input-row">
            <input type="text" class="ai-keyword-input" id="ai-keyword-input"
                   placeholder="输入关键词后按回车或点击添加" maxlength="20">
            <button class="ai-keyword-add-btn" onclick="addAiKeyword()">添加</button>
          </div>
        </div>

        <!-- AI 未配置提示（初始隐藏） -->
        <div class="ai-not-configured" id="ai-not-configured" style="display:${aiState.apiConfigured ? 'none' : 'block'};">
          <p>⚠️ AI API 未配置</p>
          <p>请在项目根目录的 <code>.env</code> 文件中设置 <code>AI_API_KEY</code></p>
          <p>支持 OpenAI、DeepSeek、Qwen 等 OpenAI 兼容接口</p>
        </div>

        <!-- 转化按钮 -->
        <button class="ai-transform-btn" id="ai-transform-btn" onclick="executeAiTransform()">
          ✨ 开始转化
        </button>

        <!-- 结果展示区（初始隐藏） -->
        <div class="ai-result-area" id="ai-result-area" style="display:none;"></div>
      </div>
    </div>
  `;

  document.body.appendChild(panel);

  // 关键词输入框回车事件
  const input = $('#ai-keyword-input');
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addAiKeyword();
    }
  });

  // 点击面板外部关闭
  panel.addEventListener('click', (e) => {
    if (e.target === panel) closeAiPanel();
  });
}

/**
 * 关闭 AI 转化面板
 */
window.closeAiPanel = function() {
  const panel = $('#ai-panel');
  if (panel) panel.remove();
  aiState.result = null;
  aiState.loading = false;
};

/**
 * 选择转化类型
 * 切换类型时更新按钮高亮，并加载该类型的默认关键词
 * @param {string} type - 转化类型 ID
 */
window.selectAiType = function(type) {
  aiState.currentType = type;
  aiState.result = null;

  // 更新按钮高亮
  document.querySelectorAll('.ai-type-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.type === type);
  });

  // 加载该类型的默认关键词
  const typeConfig = AI_TRANSFORM_TYPES[type];
  if (typeConfig) {
    aiState.keywords = [...typeConfig.defaultKeywords];
    renderAiKeywords();
  }

  // 清空结果区
  const resultArea = $('#ai-result-area');
  if (resultArea) {
    resultArea.style.display = 'none';
    resultArea.innerHTML = '';
  }
};

/**
 * 渲染关键词标签列表
 */
function renderAiKeywords() {
  const container = $('#ai-keywords-tags');
  if (!container) return;

  container.innerHTML = aiState.keywords.map(k => `
    <span class="ai-keyword-tag">
      ${escHtml(k)}
      <span class="remove-keyword" onclick="removeAiKeyword('${escHtml(k)}')">&times;</span>
    </span>
  `).join('');
}

/**
 * 添加关键词
 * 从输入框读取关键词，去重后添加到列表
 */
window.addAiKeyword = function() {
  const input = $('#ai-keyword-input');
  if (!input) return;

  const keyword = input.value.trim();
  if (!keyword) return;

  // 避免重复添加
  if (aiState.keywords.includes(keyword)) {
    input.value = '';
    return;
  }

  // 最多 8 个关键词
  if (aiState.keywords.length >= 8) return;

  aiState.keywords.push(keyword);
  input.value = '';
  renderAiKeywords();
};

/**
 * 移除指定关键词
 * @param {string} keyword - 要移除的关键词
 */
window.removeAiKeyword = function(keyword) {
  aiState.keywords = aiState.keywords.filter(k => k !== keyword);
  renderAiKeywords();
};

/**
 * 执行 AI 转化
 * 获取当前笔记内容，调用后端 /api/ai-transform 接口进行真实 AI 转化，
 * 然后展示原文与转化结果的对比
 */
window.executeAiTransform = async function() {
  // 检查 AI API 是否已配置
  if (!aiState.apiConfigured) {
    alert('AI API 未配置。请在项目根目录的 .env 文件中设置 AI_API_KEY。\n\n支持 OpenAI、DeepSeek、Qwen 等 OpenAI 兼容接口。');
    return;
  }

  // 检查是否有选中的笔记
  const note = data.notes.find(n => n.id === currentNoteId);
  if (!note) return;

  // 获取纯文本内容
  const originalText = stripHtml(note.content).trim();
  if (!originalText) {
    alert('笔记内容为空，请先输入一些内容再进行转化。');
    return;
  }

  // 防止重复触发
  if (aiState.loading) return;
  aiState.loading = true;

  // 更新按钮状态
  const btn = $('#ai-transform-btn');
  btn.disabled = true;
  btn.textContent = '正在转化中...';

  // 显示加载动画
  const resultArea = $('#ai-result-area');
  resultArea.style.display = 'block';
  resultArea.innerHTML = `
    <div class="ai-loading">
      <span>AI 正在思考中</span>
      <span class="ai-loading-dots"><span></span><span></span><span></span></span>
    </div>
  `;

  try {
    // 调用后端 AI 转化接口
    const response = await apiRequest('POST', '/ai-transform', {
      content: originalText,
      type: aiState.currentType,
      keywords: aiState.keywords
    });

    aiState.result = response.result;

    // 获取当前类型的中文名称
    const typeName = AI_TRANSFORM_TYPES[aiState.currentType]?.name || '转化';

    // 渲染对比结果
    resultArea.innerHTML = `
      <div class="ai-compare">
        <div class="ai-compare-box">
          <div class="ai-compare-label">📄 原文</div>
          <div class="ai-compare-content">${escHtml(originalText)}</div>
        </div>
        <div class="ai-compare-box">
          <div class="ai-compare-label">✨ ${typeName}结果</div>
          <div class="ai-compare-content">${escHtml(response.result)}</div>
        </div>
      </div>
      <div class="ai-result-actions">
        <button onclick="closeAiPanel()">放弃</button>
        <button class="btn-accept" onclick="acceptAiResult()">采纳结果</button>
      </div>
    `;

  } catch (e) {
    // 显示错误信息
    const errorMsg = e.message || '转化失败，请重试';
    resultArea.innerHTML = `
      <div style="padding:16px;text-align:center;color:var(--danger);">
        <p style="margin-bottom:8px;">转化失败</p>
        <p style="font-size:13px;color:var(--text-secondary);">${escHtml(errorMsg)}</p>
      </div>
    `;

    // 如果是 API 未配置错误，更新状态
    if (errorMsg.includes('未配置') || errorMsg.includes('notConfigured')) {
      aiState.apiConfigured = false;
    }
  }

  // 恢复按钮状态
  btn.disabled = false;
  btn.textContent = '✨ 开始转化';
  aiState.loading = false;
};

/**
 * 采纳 AI 转化结果
 * 将转化后的文本替换当前笔记的内容
 */
window.acceptAiResult = function() {
  if (!aiState.result) return;

  const note = data.notes.find(n => n.id === currentNoteId);
  if (!note) return;

  // 将转化结果转为 HTML（保留换行）
  const resultHtml = aiState.result
    .split('\n')
    .map(line => escHtml(line) || '<br>')
    .join('<br>');

  // 替换笔记内容
  note.content = resultHtml;
  noteContent.innerHTML = resultHtml;
  note.updatedAt = Date.now();

  // 保存并更新界面
  saveData(data);
  if (useApi) {
    apiRequest('PUT', `/notes/${note.id}`, { content: resultHtml }).catch(() => {});
  }

  scheduleSave();
  updateWordCount();
  closeAiPanel();
};

// AI 创意转化按钮点击事件
$('#btn-ai-transform').addEventListener('click', () => {
  if (!currentNoteId) {
    alert('请先选择或创建一条笔记。');
    return;
  }
  renderAiPanel();
});

// ===== 键盘快捷键 =====

document.addEventListener('keydown', (e) => {
  // Ctrl+N：新建笔记
  if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
    e.preventDefault();
    createNote();
  }
  // Ctrl+F：聚焦搜索框
  if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
    e.preventDefault();
    searchInput.focus();
  }
  // Escape：关闭模态框
  if (e.key === 'Escape') {
    closeModal();
  }
});

// ===== 应用初始化 =====

/**
 * 应用启动入口
 * 1. 检测后端 API 可用性
 * 2. 加载数据（API 优先，localStorage 备份）
 * 3. 应用主题并渲染界面
 * 4. 显示存储模式提示（3 秒后消失）
 */
async function init() {
  const apiAvailable = await checkApiAvailability();

  if (apiAvailable) {
    // 有后端：从服务器加载数据
    const serverData = await loadFromServer();
    if (serverData) {
      data = serverData;
      saveData(data); // 同步保存到 localStorage 作为备份
    }
    console.log('NoteFlow: Connected to server, using persistent storage');
  } else {
    console.log('NoteFlow: No server detected, using localStorage only');
  }

  applyTheme(data.settings?.theme || 'light');
  renderNotebooks();
  const initResult = await fetchNotesWithPagination();
  renderNoteList(initResult.notes);

  // 检测 AI API 配置状态
  await checkAiStatus();

  // 在页面右下角显示当前存储模式（3 秒后自动消失）
  const indicator = document.createElement('div');
  indicator.style.cssText = 'position:fixed;bottom:8px;right:8px;font-size:11px;padding:4px 10px;border-radius:12px;z-index:999;';
  if (apiAvailable) {
    indicator.textContent = '已连接服务器';
    indicator.style.background = '#d3f9d8';
    indicator.style.color = '#2b8a3e';
  } else {
    indicator.textContent = '本地存储模式';
    indicator.style.background = '#fff3bf';
    indicator.style.color = '#e67700';
  }
  document.body.appendChild(indicator);
  setTimeout(() => indicator.remove(), 3000);
}

// 启动应用
init();
