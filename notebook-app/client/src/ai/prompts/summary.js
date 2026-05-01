/**
 * 摘要提炼 prompt 模板
 * 与后端 server/ai/prompts.js 保持同步
 */
export default function summaryPrompt(keywords) {
  return `你是一位文本分析专家。请对用户提供的文本进行摘要提炼，重点关注：${keywords.join('、')}。
要求：
1. 提取文本的核心要点
2. 用简洁清晰的语言重新组织
3. 保留关键信息，去除冗余表达
4. 输出纯文本，不要添加额外的标题或说明`;
}
