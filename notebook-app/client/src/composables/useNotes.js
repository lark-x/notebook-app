/**
 * 笔记管理组合式函数
 *
 * 提供笔记的 CRUD 操作和分页逻辑，包括：
 * - 分页获取笔记列表（支持笔记本过滤和关键词搜索）
 * - 创建、更新、删除笔记
 * - 当前选中笔记的状态管理
 * - 自动保存（防抖）
 */

import { ref, watch } from 'vue';
import { apiRequest } from '../utils/api.js';
import { genId } from '../utils/helpers.js';
import { currentNotebookId } from './useNotebooks.js';
import { closeAllDrawers } from './useMobile.js';

// ===== 分页状态 =====

/** 当前页码（从 1 开始） */
export const currentPage = ref(1);
/** 每页显示的笔记数量 */
export const pageSize = ref(15);
/** 当前筛选条件下的笔记总数 */
export const totalNotes = ref(0);
/** 总页数 */
export const totalPages = ref(0);

// ===== 笔记数据状态 =====

/** 当前页的笔记列表 */
export const notes = ref([]);
/** 当前选中的笔记 ID，null 表示未选中 */
export const currentNoteId = ref(null);
/** 搜索关键词 */
export const searchQuery = ref('');

// ===== 自动保存状态 =====

/** 自动保存的定时器句柄 */
let saveTimer = null;
/** 最后保存时间描述 */
export const lastSavedText = ref('');
/** 当前字数 */
export const wordCount = ref(0);

/**
 * 计算总页数
 * @returns {number} 总页数
 */
function calcTotalPages() {
  return Math.max(1, Math.ceil(totalNotes.value / pageSize.value));
}

/**
 * 获取当前页的笔记数据
 * 从后端分页接口加载，支持笔记本过滤和关键词搜索
 * @returns {Promise<void>}
 */
export async function fetchNotes() {
  try {
    // 构建查询参数
    const params = new URLSearchParams({
      page: currentPage.value,
      pageSize: pageSize.value
    });
    if (currentNotebookId.value !== 'all') {
      params.set('notebookId', currentNotebookId.value);
    }
    if (searchQuery.value) {
      params.set('search', searchQuery.value);
    }

    const result = await apiRequest('GET', `/notes?${params.toString()}`);
    notes.value = result.notes;
    totalNotes.value = result.total;
    currentPage.value = result.page;
    totalPages.value = calcTotalPages();
  } catch (e) {
    console.warn('获取笔记列表失败:', e.message);
    notes.value = [];
    totalNotes.value = 0;
  }
}

/**
 * 重置分页到第一页并重新获取数据
 * 在切换笔记本或搜索关键词变化时调用
 */
export async function resetAndFetch() {
  currentPage.value = 1;
  await fetchNotes();
}

/**
 * 跳转到指定页码
 * @param {number} page - 目标页码
 */
export async function goToPage(page) {
  if (page < 1 || page > totalPages.value || page === currentPage.value) return;
  currentPage.value = page;
  await fetchNotes();
}

/**
 * 选中指定笔记
 * @param {string} id - 笔记 ID
 * @returns {Object|null} 笔记对象，未找到返回 null
 */
export function selectNote(id) {
  const note = notes.value.find(n => n.id === id);
  if (!note) return null;
  currentNoteId.value = id;
  // 移动端下选中笔记后自动关闭抽屉
  closeAllDrawers();
  return note;
}

/**
 * 获取当前选中的笔记对象
 * 从当前页笔记列表中查找
 * @returns {Object|null} 笔记对象
 */
export function getCurrentNote() {
  return notes.value.find(n => n.id === currentNoteId.value) || null;
}

/**
 * 创建新笔记
 * 创建后自动跳转到第一页并选中新笔记
 * @returns {Promise<Object|null>} 创建的笔记对象
 */
export async function createNote() {
  const notebookId = currentNotebookId.value === 'all'
    ? 'default'
    : currentNotebookId.value;

  try {
    const created = await apiRequest('POST', '/notes', {
      notebookId,
      title: '',
      content: '',
      tags: []
    });

    // 跳转到第一页并刷新列表
    currentPage.value = 1;
    await fetchNotes();

    // 选中新创建的笔记
    currentNoteId.value = created.id;
    return created;
  } catch (e) {
    console.warn('创建笔记失败:', e.message);
    return null;
  }
}

/**
 * 更新笔记
 * @param {string} id - 笔记 ID
 * @param {Object} updates - 要更新的字段（title, content, tags, notebookId）
 * @returns {Promise<boolean>} 是否成功
 */
export async function updateNote(id, updates) {
  try {
    await apiRequest('PUT', `/notes/${id}`, updates);
    // 更新本地缓存
    const note = notes.value.find(n => n.id === id);
    if (note) {
      Object.assign(note, updates);
      note.updatedAt = Date.now();
    }
    return true;
  } catch (e) {
    console.warn('更新笔记失败:', e.message);
    return false;
  }
}

/**
 * 删除当前选中的笔记
 * 删除后清空选中状态并刷新列表
 * @returns {Promise<boolean>} 是否成功
 */
export async function deleteCurrentNote() {
  if (!currentNoteId.value) return false;

  try {
    await apiRequest('DELETE', `/notes/${currentNoteId.value}`);
  } catch (e) {
    console.warn('删除笔记失败:', e.message);
  }

  // 清空选中状态
  currentNoteId.value = null;

  // 刷新列表（可能需要回到前一页）
  await fetchNotes();

  return true;
}

/**
 * 触发延迟自动保存（500ms 防抖）
 * 用户停止输入 500ms 后才执行保存，避免每次按键都触发 API 请求
 *
 * @param {Object} noteData - 要保存的笔记数据 { title, content }
 */
export function scheduleSave(noteData) {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    if (!currentNoteId.value) return;

    await updateNote(currentNoteId.value, {
      title: noteData.title,
      content: noteData.content
    });

    lastSavedText.value = `已保存 ${new Date().toLocaleTimeString('zh-CN')}`;

    // 刷新列表（更新时间和预览会变化）
    await fetchNotes();
  }, 500);
}

/**
 * 更新字数统计
 * @param {string} text - 纯文本内容
 */
export function updateWordCount(text) {
  wordCount.value = text.length;
}

// ===== 监听笔记本切换，自动重置分页 =====

watch(currentNotebookId, () => {
  resetAndFetch();
});
