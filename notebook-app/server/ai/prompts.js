/**
 * AI 提示词注册表
 *
 * 每个转化类型对应一个 prompt 工厂函数，
 * 接收 keywords 数组，返回 system prompt 字符串。
 *
 * 新增类型只需：
 * 1. 在此文件添加条目
 * 2. 前端 transformTypes.js 添加对应配置
 */

const AI_PROMPTS = {
  style: (keywords) => `你是一位文学风格转换专家。请将用户提供的文本改写为以下风格：${keywords.join('、')}。
要求：
1. 保持原文的核心含义不变
2. 自然地融入指定的风格特征
3. 输出纯文本，不要添加额外的标题或说明`,

  expand: (keywords) => `你是一位内容创作专家。请根据以下方向对用户提供的文本进行扩展丰富：${keywords.join('、')}。
要求：
1. 基于原文内容进行合理扩展，不要编造与原文无关的内容
2. 补充具体的细节、场景描写或论证
3. 保持与原文一致的语气和风格
4. 输出纯文本，不要添加额外的标题或说明`,

  summary: (keywords) => `你是一位文本分析专家。请对用户提供的文本进行摘要提炼，重点关注：${keywords.join('、')}。
要求：
1. 提取文本的核心要点
2. 用简洁清晰的语言重新组织
3. 保留关键信息，去除冗余表达
4. 输出纯文本，不要添加额外的标题或说明`
};

/** 获取所有已注册的 prompt 类型 */
function getPromptTypes() {
  return Object.keys(AI_PROMPTS);
}

/** 构建指定类型的 system prompt */
function buildPrompt(type, keywords) {
  const factory = AI_PROMPTS[type];
  if (!factory) return null;
  return factory(keywords.length > 0 ? keywords : ['通用']);
}

module.exports = { AI_PROMPTS, getPromptTypes, buildPrompt };
