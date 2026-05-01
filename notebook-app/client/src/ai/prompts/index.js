/**
 * 前端 Prompt 注册表
 *
 * 当前 prompt 由后端生成，前端仅维护类型元数据。
 * 此模块保留扩展点：未来可支持前端预览 prompt 或本地 prompt 模板。
 */

import stylePrompt from './style.js';
import expandPrompt from './expand.js';
import summaryPrompt from './summary.js';

const promptRegistry = {
  style: stylePrompt,
  expand: expandPrompt,
  summary: summaryPrompt
};

/**
 * 获取指定类型的 prompt 预览（用于 UI 展示）
 * @param {string} type - 转化类型
 * @param {string[]} keywords - 关键词列表
 * @returns {string|null}
 */
export function getPromptPreview(type, keywords) {
  const factory = promptRegistry[type];
  return factory ? factory(keywords) : null;
}
