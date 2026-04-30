<!--
  NoteFlow 笔记应用视图

  原 App.vue 的内容迁移至此，作为 /app/noteflow 路由的视图组件。
  保留原有的三栏布局、移动端响应式、抽屉交互等全部功能。
-->

<template>
  <!-- 应用根容器，三栏 Grid 布局 -->
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
 * NoteFlow 应用视图
 *
 * 在 onMounted 中完成初始化：
 * 1. 加载笔记本列表
 * 2. 加载笔记列表（分页）
 * 3. 检测 AI API 配置状态
 * 4. 应用保存的主题
 */
import { computed, onMounted } from 'vue'
import Sidebar from '../components/Sidebar.vue'
import NoteList from '../components/NoteList.vue'
import Editor from '../components/Editor.vue'
import { loadNotebooks } from '../composables/useNotebooks.js'
import { fetchNotes, currentNoteId, notes } from '../composables/useNotes.js'
import { checkAiStatus } from '../composables/useAi.js'
import { theme, applyTheme } from '../composables/useSettings.js'
import { apiRequest } from '../utils/api.js'
import {
  isMobile,
  sidebarOpen,
  noteListOpen,
  toggleSidebar,
  toggleNoteList,
  closeAllDrawers,
  useResizeListener
} from '../composables/useMobile.js'

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
  padding-top: calc(8px + env(safe-area-inset-top));
  background: var(--bg-sidebar);
  color: var(--text-sidebar);
  min-height: 44px;
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

/* 抽屉激活时 Grid 背景变暗 */
.drawer-active::before {
  content: '';
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.4);
  z-index: 100;
  pointer-events: none;
}
</style>
