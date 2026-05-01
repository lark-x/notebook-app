<!--
  AI 结果对比组件

  从 AiPanel 拆分而来，负责：
  - 原文与转化结果的左右对比展示
  - 采纳/放弃操作按钮
-->

<template>
  <div class="ai-result-area">
    <div class="ai-compare">
      <div class="ai-compare-box">
        <div class="ai-compare-label">📄 原文</div>
        <div class="ai-compare-content">{{ originalText }}</div>
      </div>
      <div class="ai-compare-box">
        <div class="ai-compare-label">✨ {{ typeName }}结果</div>
        <div class="ai-compare-content">{{ result }}</div>
      </div>
    </div>
    <div class="ai-result-actions">
      <button @click="$emit('discard')">放弃</button>
      <button class="btn-accept" @click="$emit('accept')">采纳结果</button>
    </div>
  </div>
</template>

<script setup>
defineProps({
  /** 原始笔记纯文本 */
  originalText: { type: String, required: true },
  /** 转化结果文本 */
  result: { type: String, required: true },
  /** 当前转化类型的中文名称 */
  typeName: { type: String, default: '转化' }
})

defineEmits(['accept', 'discard'])
</script>
