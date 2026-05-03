<template>
  <div class="portal-page">
    <header class="portal-header">
      <div class="portal-header-left"><span class="portal-logo">🚀</span><h1>应用平台</h1></div>
      <div class="portal-header-right"><span class="portal-user">{{ auth.user?.username || currentUser }}</span><button class="portal-logout-btn" @click="onLogout">退出</button></div>
    </header>
    <main class="portal-main">
      <h2 class="portal-title">我的应用</h2>
      <div class="app-grid">
        <div v-for="app in apps" :key="app.id" class="app-card" @click="router.push(app.route)">
          <div class="app-card-icon">{{ app.icon }}</div>
          <div class="app-card-info"><h3>{{ app.name }}</h3><p>{{ app.description }}</p></div>
          <div class="app-card-arrow">→</div>
        </div>
      </div>
      <h2 class="portal-title" style="margin-top:32px">系统设置</h2>
      <div class="app-grid">
        <div class="app-card" @click="router.push('/settings/ai')">
          <div class="app-card-icon">🤖</div>
          <div class="app-card-info"><h3>AI 配置</h3><p>设置 AI API 密钥、模型和接口地址</p></div>
          <div class="app-card-arrow">→</div>
        </div>
        <div v-if="auth.isAdmin" class="app-card" @click="router.push('/admin/users')">
          <div class="app-card-icon">👥</div>
          <div class="app-card-info"><h3>用户管理</h3><p>新增、修改、删除用户账号</p></div>
          <div class="app-card-arrow">→</div>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'
import { apps } from '../apps.config.js'
import { useAuthStore } from '../stores/useAuthStore.js'
const router = useRouter()
const auth = useAuthStore()
const currentUser = localStorage.getItem('noteflow_user') || '用户'
function onLogout() { auth.logout(); router.push('/login') }
</script>

<style scoped>
.portal-page { min-height:100vh; background:var(--bg); overflow-y:auto; }
.portal-header { display:flex; align-items:center; justify-content:space-between; padding:16px 32px; padding-top:calc(16px + env(safe-area-inset-top)); background:var(--bg-sidebar); color:var(--text-sidebar); }
.portal-header-left { display:flex; align-items:center; gap:10px; }
.portal-logo { font-size:24px; }
.portal-header h1 { font-size:18px; font-weight:700; color:#fff; }
.portal-header-right { display:flex; align-items:center; gap:12px; }
.portal-user { font-size:14px; color:var(--text-sidebar-dim); }
.portal-logout-btn { padding:6px 14px; background:transparent; border:1px solid rgba(255,255,255,.15); color:var(--text-sidebar-dim); border-radius:6px; font-size:13px; cursor:pointer; transition:all var(--transition); }
.portal-logout-btn:hover { background:rgba(255,255,255,.08); color:var(--text-sidebar); }
.portal-main { max-width:900px; margin:0 auto; padding:40px 24px; }
.portal-title { font-size:16px; font-weight:600; color:var(--text-secondary); margin-bottom:20px; }
.app-grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(280px, 1fr)); gap:16px; }
.app-card { display:flex; align-items:center; gap:16px; padding:20px; background:var(--bg-panel); border:1px solid var(--border); border-radius:12px; cursor:pointer; transition:all var(--transition); }
.app-card:hover { border-color:var(--accent); box-shadow:0 4px 12px rgba(0,0,0,.08); transform:translateY(-2px); }
.app-card-icon { font-size:36px; flex-shrink:0; }
.app-card-info { flex:1; min-width:0; }
.app-card-info h3 { font-size:15px; font-weight:600; color:var(--text); margin-bottom:4px; }
.app-card-info p { font-size:13px; color:var(--text-secondary); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.app-card-arrow { font-size:18px; color:var(--text-secondary); flex-shrink:0; transition:transform var(--transition); }
.app-card:hover .app-card-arrow { transform:translateX(4px); color:var(--accent); }
@media (max-width:600px) { .portal-header { padding:12px 16px; } .portal-main { padding:24px 16px; } .app-grid { grid-template-columns:1fr; } }
</style>
