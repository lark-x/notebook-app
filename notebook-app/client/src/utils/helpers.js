/**
 * 通用工具函数模块
 *
 * 提供项目中多处复用的纯函数，如 ID 生成、HTML 转义、
 * 文本处理、时间格式化等。
 */

/**
 * 生成唯一 ID
 * 结合时间戳和随机数，保证在客户端场景下基本唯一
 * @returns {string} 基于 36 进制的唯一标识
 */
export function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

/**
 * HTML 转义：防止 XSS 注入
 * @param {string} str - 原始字符串
 * @returns {string} 转义后的安全字符串
 */
export function escHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/**
 * 去除 HTML 标签，提取纯文本内容
 * 用于笔记预览和搜索匹配
 * @param {string} html - HTML 字符串
 * @returns {string} 纯文本内容
 */
export function stripHtml(html) {
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
export function formatDate(ts) {
  const d = new Date(ts);
  const now = new Date();
  const diff = now - d;
  if (diff < 60000) return '刚刚';
  if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小时前`;
  if (diff < 604800000) return `${Math.floor(diff / 86400000)} 天前`;
  return d.toLocaleDateString('zh-CN');
}
