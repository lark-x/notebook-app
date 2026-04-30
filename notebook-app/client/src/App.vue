<!--
  NoteFlow 根组件

  采用 CSS Grid 三栏布局：侧边栏 | 笔记列表 | 编辑器。
  负责初始化应用状态、加载数据，并协调三个子组件之间的交互。
-->

<template>
  <!-- 应用根容器，三栏 Grid 布局（id="app" 在 index.html 的挂载点上） -->
  <div id="app-grid">
    <!-- 左侧边栏：笔记本列表、搜索、操作按钮 -->
    <Sidebar />

    <!-- 中间面板：笔记列表 + 分页 -->
    <NoteList />

    <!-- 右侧主区域：富文本编辑器 -->
    <Editor />
  </div>
</template>

<script setup>
/**
 * 应用根组件
 *
 * 在 onMounted 中完成初始化：
 * 1. 加载笔记本列表
 * 2. 加载笔记列表（分页）
 * 3. 检测 AI API 配置状态
 * 4. 应用保存的主题
 */
import { onMounted } from 'vue'
import Sidebar from './components/Sidebar.vue'
import NoteList from './components/NoteList.vue'
import Editor from './components/Editor.vue'
import { loadNotebooks } from './composables/useNotebooks.js'
import { fetchNotes } from './composables/useNotes.js'
import { checkAiStatus } from './composables/useAi.js'
import { theme, applyTheme } from './composables/useSettings.js'
import { apiRequest } from './utils/api.js'

onMounted(async () => {
  // 加载笔记本列表
  await loadNotebooks()

  // 加载笔记列表（第一页）
  await fetchNotes()

  // 检测 AI API 配置状态
  await checkAiStatus()

  // 从服务器加载主题设置
  try {
    const data = await apiRequest('GET', '/data')
    if (data.settings?.theme) {
      await applyTheme(data.settings.theme)
    }
  } catch (e) {
    console.warn('加载设置失败:', e.message)
  }
})
</script>

<style scoped>
/* 根组件不需要额外样式，全局样式在 style.css 中 */
</style>
