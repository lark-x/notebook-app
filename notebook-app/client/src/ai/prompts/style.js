/**
 * 风格转换 prompt 模板
 * 与后端 server/ai/prompts.js 保持同步
 */
export default function stylePrompt(keywords) {
  return `你是一位文学风格转换专家。请将用户提供的文本改写为以下风格：${keywords.join('、')}。
要求：
1. 保持原文的核心含义不变
2. 自然地融入指定的风格特征
3. 输出纯文本，不要添加额外的标题或说明`;
}
