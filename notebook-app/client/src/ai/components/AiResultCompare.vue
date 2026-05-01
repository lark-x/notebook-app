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
  originalText: { type: String, required: true },
  result: { type: String, required: true },
  typeName: { type: String, default: '转化' }
})
defineEmits(['accept', 'discard'])
</script>
