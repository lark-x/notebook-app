const AI_PROMPTS = {
  style: (kw) => `你是一位文学风格转换专家。请将用户提供的文本改写为以下风格：${kw.join('、')}。\n要求：保持原文核心含义不变，自然融入指定风格特征，输出纯文本。`,
  expand: (kw) => `你是一位内容创作专家。请根据以下方向对用户提供的文本进行扩展丰富：${kw.join('、')}。\n要求：基于原文合理扩展，补充细节和论证，保持一致语气，输出纯文本。`,
  summary: (kw) => `你是一位文本分析专家。请对用户提供的文本进行摘要提炼，重点关注：${kw.join('、')}。\n要求：提取核心要点，用简洁语言重新组织，保留关键信息，输出纯文本。`,
};

function getPromptTypes() { return Object.keys(AI_PROMPTS); }
function buildPrompt(type, keywords) {
  const factory = AI_PROMPTS[type];
  if (!factory) return null;
  return factory(keywords.length > 0 ? keywords : ['通用']);
}

module.exports = { getPromptTypes, buildPrompt };
