/**
 * Provider 注册表
 *
 * 管理 AI 后端 provider 的注册与获取。
 * 当前默认使用 OpenAI 兼容 provider（通过后端代理）。
 */

import openaiProvider from './openai.js';

const providers = {
  openai: openaiProvider
};

/** 当前使用的 provider（默认 openai） */
let activeProvider = 'openai';

/**
 * 获取当前活跃的 provider
 * @returns {Object} provider 实例
 */
export function getActiveProvider() {
  return providers[activeProvider] || providers.openai;
}

/**
 * 切换活跃 provider
 * @param {string} name - provider 名称
 */
export function setActiveProvider(name) {
  if (providers[name]) {
    activeProvider = name;
  }
}

/**
 * 注册新的 provider
 * @param {string} name - provider 名称
 * @param {Object} provider - provider 实例
 */
export function registerProvider(name, provider) {
  providers[name] = provider;
}
