/**
 * 移动端布局管理组合式函数
 *
 * 提供侧边栏和笔记列表的抽屉式面板开关状态，
 * 以及窗口尺寸变化的自动检测。
 */

import { ref, onMounted, onUnmounted } from 'vue';

/** 侧边栏抽屉是否展开 */
export const sidebarOpen = ref(false);

/** 笔记列表抽屉是否展开 */
export const noteListOpen = ref(false);

/** AI 面板是否展开 */
export const aiPanelOpen = ref(false);

/** 当前是否为移动端视图（宽度 ≤ 900px） */
export const isMobile = ref(window.innerWidth <= 900);

/**
 * 切换侧边栏抽屉
 * 移动端下打开侧边栏时自动关闭笔记列表
 */
export function toggleSidebar() {
  sidebarOpen.value = !sidebarOpen.value;
  if (sidebarOpen.value) {
    noteListOpen.value = false;
  }
}

/**
 * 切换笔记列表抽屉
 * 移动端下打开笔记列表时自动关闭侧边栏
 */
export function toggleNoteList() {
  noteListOpen.value = !noteListOpen.value;
  if (noteListOpen.value) {
    sidebarOpen.value = false;
  }
}

/** 关闭所有抽屉 */
export function closeAllDrawers() {
  sidebarOpen.value = false;
  noteListOpen.value = false;
  aiPanelOpen.value = false;
}

/**
 * 窗口尺寸变化监听
 * 切换到桌面端时自动关闭所有抽屉
 */
function onResize() {
  isMobile.value = window.innerWidth <= 900;
  if (!isMobile.value) {
    closeAllDrawers();
  }
}

/**
 * 注册/注销 resize 事件监听
 * 在 Vue 组件 setup 中调用
 */
export function useResizeListener() {
  onMounted(() => window.addEventListener('resize', onResize));
  onUnmounted(() => window.removeEventListener('resize', onResize));
}
