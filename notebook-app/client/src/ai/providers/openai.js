/**
 * OpenAI 兼容 Provider（前端代理）
 *
 * 前端不直接调用 LLM API，而是通过后端代理。
 * 此模块定义 provider 接口规范，供注册表使用。
 */

export default {
  name: 'openai',
  displayName: 'OpenAI 兼容',
  description: '支持 OpenAI、DeepSeek、Qwen、Moonshot 等 OpenAI 兼容接口',

  /**
   * 检查此 provider 是否已配置
   * 前端通过后端 /ai-status 端点查询
   */
  async checkConfigured() {
    // 由 aiService.checkApiStatus() 实现
    return true;
  }
};
