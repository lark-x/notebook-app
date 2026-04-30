/**
 * API 请求工具模块
 *
 * 封装 fetch 调用，提供统一的请求/响应处理。
 * 所有 API 请求都通过此模块发出，便于集中管理错误处理和请求配置。
 */

// API 基础路径（与 Vite 代理配合，开发模式下请求会被转发到后端）
const API_BASE = '/api';

/**
 * 发送 API 请求的通用方法
 *
 * @param {string} method - HTTP 方法（GET/POST/PUT/DELETE）
 * @param {string} path - API 路径（不含 /api 前缀）
 * @param {Object} [body] - 请求体（可选，用于 POST/PUT）
 * @returns {Promise<Object>} 响应 JSON 数据
 * @throws {Error} 请求失败时抛出错误
 */
export async function apiRequest(method, path, body) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' }
  };
  if (body !== undefined) opts.body = JSON.stringify(body);

  const res = await fetch(`${API_BASE}${path}`, opts);

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }

  return res.json();
}
