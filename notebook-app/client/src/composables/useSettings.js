/**
 * 应用设置组合式函数
 *
 * 管理主题切换、数据导入导出等全局设置操作。
 */

import { ref } from 'vue';
import { apiRequest } from '../utils/api.js';

// ===== 主题状态 =====

/** 当前主题：'light' 或 'dark' */
export const theme = ref('light');

/**
 * 应用主题
 * 通过 data-theme 属性切换 CSS 变量，实现明暗主题
 * @param {string} newTheme - 主题名称，'light' 或 'dark'
 */
export async function applyTheme(newTheme) {
  theme.value = newTheme;
  document.documentElement.setAttribute('data-theme', newTheme);

  // 保存到后端
  try {
    await apiRequest('PUT', '/settings', { theme: newTheme });
  } catch (e) {
    console.warn('保存主题设置失败:', e.message);
  }
}

/**
 * 切换明暗主题
 */
export async function toggleTheme() {
  await applyTheme(theme.value === 'dark' ? 'light' : 'dark');
}

// ===== 数据导入导出 =====

/**
 * 导出全部数据为 JSON 文件
 * 创建一个 Blob 对象并通过临时 <a> 标签触发下载
 */
export async function exportData() {
  try {
    const data = await apiRequest('GET', '/data');
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `noteflow_backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  } catch (e) {
    console.error('导出数据失败:', e.message);
    throw e;
  }
}

/**
 * 导入数据
 * @param {Object} imported - 导入的数据对象（包含 notebooks、notes、settings）
 * @returns {Promise<boolean>} 是否成功
 */
export async function importData(imported) {
  try {
    await apiRequest('PUT', '/data', imported);
    return true;
  } catch (e) {
    console.error('导入数据失败:', e.message);
    throw e;
  }
}
