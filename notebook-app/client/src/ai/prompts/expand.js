/**
 * 内容扩展 prompt 模板
 * 与后端 server/ai/prompts.js 保持同步
 */
export default function expandPrompt(keywords) {
  return `你是一位内容创作专家。请根据以下方向对用户提供的文本进行扩展丰富：${keywords.join('、')}。
要求：
1. 基于原文内容进行合理扩展，不要编造与原文无关的内容
2. 补充具体的细节、场景描写或论证
3. 保持与原文一致的语气和风格
4. 输出纯文本，不要添加额外的标题或说明`;
}
