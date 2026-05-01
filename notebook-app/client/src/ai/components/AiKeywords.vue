<!--
  AI 关键词编辑组件

  从 AiPanel 拆分而来，负责：
  - 展示当前关键词标签列表
  - 输入框添加新关键词
  - 删除已有关键词
-->

<template>
  <div class="ai-keywords-section">
    <label>
      自定义关键词
      <span class="hint">（影响转化效果，可自由增删）</span>
    </label>

    <div class="ai-keywords-tags">
      <span
        v-for="keyword in keywords"
        :key="keyword"
        class="ai-keyword-tag"
      >
        {{ keyword }}
        <span class="remove-keyword" @click="$emit('remove', keyword)">&times;</span>
      </span>
    </div>

    <div class="ai-keyword-input-row">
      <input
        type="text"
        class="ai-keyword-input"
        placeholder="输入关键词后按回车或点击添加"
        maxlength="20"
        v-model="inputValue"
        @keydown.enter.prevent="onAdd"
      >
      <button class="ai-keyword-add-btn" @click="onAdd">添加</button>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const props = defineProps({
  /** 当前关键词列表 */
  keywords: { type: Array, required: true }
})

const emit = defineEmits(['add', 'remove'])

const inputValue = ref('')

function onAdd() {
  if (emit('add', inputValue.value)) {
    inputValue.value = ''
  }
}
</script>
