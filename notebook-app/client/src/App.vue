<!--
  NoteFlow 根组件

  采用 CSS Grid 三栏布局：侧边栏 | 笔记列表 | 编辑器。
  负责初始化应用状态、加载数据，并协调三个子组件之间的交互。
  移动端下提供顶部导航栏和抽屉式面板。
-->

<template>
  <!-- 应用根容器，三栏 Grid 布局（id="app" 在 index.html 的挂载点上） -->
  <div
    id="app-grid"
    :class="{ 'mobile': isMobile, 'drawer-active': isMobile && (sidebarOpen || noteListOpen) }"
    @click.self="onGridClick"
  >
    <!-- 移动端顶部导航栏 -->
    <header v-if="isMobile" class="mobile-nav">
      <button class="mobile-nav-btn" @click="toggleSidebar" title="笔记本">
        ☰
      </button>
      <span class="mobile-nav-title">{{ currentTitle }}</span>
      <button class="mobile-nav-btn" @click="toggleNoteList" title="笔记列表">
        📋
      </button>
    </header>

    <!-- 左侧边栏：笔记本列表、搜索、操作按钮 -->
    <Sidebar :class="{ open: sidebarOpen }" />

    <!-- 中间面板：笔记列表 + 分页 -->
    <NoteList :class="{ open: noteListOpen }" />

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
import { computed, onMounted } from 'vue'
import Sidebar from './components/Sidebar.vue'
import NoteList from './components/NoteList.vue'
import Editor from './components/Editor.vue'
import { loadNotebooks } from './composables/useNotebooks.js'
import { fetchNotes, currentNoteId, notes } from './composables/useNotes.js'
import { checkAiStatus } from './composables/useAi.js'
import { theme, applyTheme } from './composables/useSettings.js'
import { apiRequest } from './utils/api.js'
import {
  isMobile,
  sidebarOpen,
  noteListOpen,
  toggleSidebar,
  toggleNoteList,
  closeAllDrawers,
  useResizeListener
} from './composables/useMobile.js'

// 注册窗口尺寸变化监听
useResizeListener()

/** 移动端导航栏标题：当前选中笔记的标题或应用名 */
const currentTitle = computed(() => {
  if (currentNoteId.value) {
    const note = notes.value.find(n => n.id === currentNoteId.value)
    if (note) return note.title || '无标题'
  }
  return 'NoteFlow'
})

/**
 * 点击 Grid 背景区域时关闭抽屉
 * 仅在 @click.self 触发（即直接点击 #app-grid，非子元素冒泡）
 */
function onGridClick() {
  if (isMobile.value && (sidebarOpen.value || noteListOpen.value)) {
    closeAllDrawers()
  }
}

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
/* 移动端顶部导航栏 */
.mobile-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: var(--bg-sidebar);
  color: var(--text-sidebar);
  height: 44px;
  flex-shrink: 0;
}

.mobile-nav-title {
  font-size: 15px;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
  text-align: center;
  padding: 0 8px;
}

.mobile-nav-btn {
  background: none;
  border: none;
  color: var(--text-sidebar);
  font-size: 20px;
  padding: 4px 10px;
  cursor: pointer;
  border-radius: 6px;
  flex-shrink: 0;
}

.mobile-nav-btn:hover {
  background: rgba(255,255,255,0.1);
}

/* 抽屉激活时 Grid 背景变暗（用伪元素实现遮罩效果） */
.drawer-active::before {
  content: '';
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.4);
  z-index: 100;
  pointer-events: none;
}
</style>
