<!--
  应用门户页面

  登录后的默认着陆页，展示可用应用列表。
  应用数据从 apps.config.js 配置文件读取，支持卡片式扩展。
-->

<template>
  <div class="portal-page">
    <!-- 顶部导航栏 -->
    <header class="portal-header">
      <div class="portal-header-left">
        <span class="portal-logo">🚀</span>
        <h1>应用平台</h1>
      </div>
      <div class="portal-header-right">
        <span class="portal-user">{{ currentUser }}</span>
        <button class="portal-logout-btn" @click="onLogout">退出</button>
      </div>
    </header>

    <!-- 应用列表区域 -->
    <main class="portal-main">
      <h2 class="portal-section-title">我的应用</h2>

      <div class="app-grid">
        <div
          v-for="app in apps"
          :key="app.id"
          class="app-card"
          @click="onOpenApp(app)"
        >
          <div class="app-card-icon">{{ app.icon }}</div>
          <div class="app-card-info">
            <h3 class="app-card-name">{{ app.name }}</h3>
            <p class="app-card-desc">{{ app.description }}</p>
          </div>
          <div class="app-card-arrow">→</div>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup>
/**
 * 门户页面逻辑
 *
 * 从配置文件读取应用列表，点击应用卡片跳转到对应路由。
 * 退出登录时清除 localStorage 并跳转到登录页。
 */
import { useRouter } from 'vue-router'
import { apps } from '../apps.config.js'

const router = useRouter()

/** 当前登录用户名 */
const currentUser = localStorage.getItem('noteflow_user') || '用户'

/**
 * 打开应用
 * @param {Object} app - 应用配置对象
 */
function onOpenApp(app) {
  router.push(app.route)
}

/**
 * 退出登录
 * 清除认证状态并跳转到登录页
 */
function onLogout() {
  localStorage.removeItem('noteflow_auth')
  localStorage.removeItem('noteflow_user')
  router.push('/login')
}
</script>

<style scoped>
/* 门户页面布局 */
.portal-page {
  min-height: 100vh;
  background: var(--bg);
}

/* 顶部导航栏 */
.portal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 32px;
  background: var(--bg-sidebar);
  color: var(--text-sidebar);
}

.portal-header-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.portal-logo {
  font-size: 24px;
}

.portal-header h1 {
  font-size: 18px;
  font-weight: 700;
  color: #fff;
}

.portal-header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.portal-user {
  font-size: 14px;
  color: var(--text-sidebar-dim);
}

.portal-logout-btn {
  padding: 6px 14px;
  background: transparent;
  border: 1px solid rgba(255,255,255,0.15);
  color: var(--text-sidebar-dim);
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
  transition: all var(--transition);
}

.portal-logout-btn:hover {
  background: rgba(255,255,255,0.08);
  color: var(--text-sidebar);
}

/* 主内容区域 */
.portal-main {
  max-width: 900px;
  margin: 0 auto;
  padding: 40px 24px;
}

.portal-section-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-secondary);
  margin-bottom: 20px;
}

/* 应用卡片网格 */
.app-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}

/* 应用卡片 */
.app-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  background: var(--bg-panel);
  border: 1px solid var(--border);
  border-radius: 12px;
  cursor: pointer;
  transition: all var(--transition);
}

.app-card:hover {
  border-color: var(--accent);
  box-shadow: 0 4px 12px rgba(0,0,0,0.08);
  transform: translateY(-2px);
}

.app-card-icon {
  font-size: 36px;
  flex-shrink: 0;
}

.app-card-info {
  flex: 1;
  min-width: 0;
}

.app-card-name {
  font-size: 15px;
  font-weight: 600;
  color: var(--text);
  margin-bottom: 4px;
}

.app-card-desc {
  font-size: 13px;
  color: var(--text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.app-card-arrow {
  font-size: 18px;
  color: var(--text-secondary);
  flex-shrink: 0;
  transition: transform var(--transition);
}

.app-card:hover .app-card-arrow {
  transform: translateX(4px);
  color: var(--accent);
}

/* 响应式：移动端卡片单列 */
@media (max-width: 600px) {
  .portal-header {
    padding: 12px 16px;
  }
  .portal-main {
    padding: 24px 16px;
  }
  .app-grid {
    grid-template-columns: 1fr;
  }
}
</style>
