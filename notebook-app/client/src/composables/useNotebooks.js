/**
 * 笔记本管理组合式函数
 *
 * 提供笔记本的 CRUD 操作，包括：
 * - 加载笔记本列表
 * - 创建、重命名、删除笔记本
 * - 当前选中笔记本的状态管理
 */

import { ref } from 'vue';
import { apiRequest } from '../utils/api.js';
import { genId } from '../utils/helpers.js';

// ===== 模块级共享状态 =====

/** 笔记本列表 */
export const notebooks = ref([]);

/** 当前选中的笔记本 ID，'all' 表示查看全部 */
export const currentNotebookId = ref('all');

/**
 * 加载所有笔记本
 * 从后端 API 获取笔记本列表并更新响应式状态
 */
export async function loadNotebooks() {
  try {
    notebooks.value = await apiRequest('GET', '/notebooks');
  } catch (e) {
    console.warn('加载笔记本列表失败:', e.message);
  }
}

/**
 * 创建笔记本
 * @param {string} name - 笔记本名称
 * @param {string} [icon] - 笔记本图标（emoji），默认随机分配
 * @returns {Promise<Object|null>} 创建的笔记本对象，失败返回 null
 */
export async function createNotebook(name, icon) {
  // 随机分配一个笔记本图标
  const icons = ['📓', '📔', '📕', '📗', '📘', '📙', '📒', '🗂️'];
  const selectedIcon = icon || icons[Math.floor(Math.random() * icons.length)];

  try {
    const created = await apiRequest('POST', '/notebooks', { name, icon: selectedIcon });
    notebooks.value.push(created);
    return created;
  } catch (e) {
    console.warn('创建笔记本失败:', e.message);
    // API 失败时降级为本地创建
    const local = { id: genId(), name, icon: selectedIcon };
    notebooks.value.push(local);
    return local;
  }
}

/**
 * 重命名笔记本
 * @param {string} id - 笔记本 ID
 * @param {string} newName - 新名称
 * @returns {Promise<boolean>} 是否成功
 */
export async function renameNotebook(id, newName) {
  const nb = notebooks.value.find(n => n.id === id);
  if (!nb) return false;

  try {
    await apiRequest('PUT', `/notebooks/${id}`, { name: newName });
    nb.name = newName;
    return true;
  } catch (e) {
    console.warn('重命名笔记本失败:', e.message);
    // 降级为本地修改
    nb.name = newName;
    return false;
  }
}

/**
 * 删除笔记本
 * 同时删除该笔记本下的所有笔记（后端级联删除）
 * @param {string} id - 笔记本 ID
 * @returns {Promise<boolean>} 是否成功
 */
export async function deleteNotebook(id) {
  try {
    await apiRequest('DELETE', `/notebooks/${id}`);
  } catch (e) {
    console.warn('删除笔记本失败:', e.message);
  }

  // 无论 API 是否成功，都从本地列表移除
  notebooks.value = notebooks.value.filter(n => n.id !== id);

  // 如果删除的是当前选中的笔记本，重置为"全部笔记"
  if (currentNotebookId.value === id) {
    currentNotebookId.value = 'all';
  }

  return true;
}

/**
 * 选中指定笔记本
 * @param {string} id - 笔记本 ID，'all' 表示查看全部
 */
export function selectNotebook(id) {
  currentNotebookId.value = id;
}

/**
 * 获取当前选中笔记本的名称
 * @returns {string} 笔记本名称
 */
export function getCurrentNotebookName() {
  if (currentNotebookId.value === 'all') return '全部笔记';
  const nb = notebooks.value.find(n => n.id === currentNotebookId.value);
  return nb ? nb.name : '笔记';
}
