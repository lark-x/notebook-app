/**
 * 转化类型统一定义
 *
 * 前后端共享的类型配置（后端通过 prompts/ 目录对应）。
 * 新增类型时：前端在此添加 + 后端在 server/ai/prompts.js 添加。
 */

export const AI_TRANSFORM_TYPES = {
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

/** 获取所有转化类型 key */
export function getTypeKeys() {
  return Object.keys(AI_TRANSFORM_TYPES);
}

/** 获取指定类型的配置 */
export function getTypeConfig(type) {
  return AI_TRANSFORM_TYPES[type] || null;
}
