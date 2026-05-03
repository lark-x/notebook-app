<template>
  <div class="login-page">
    <div class="login-card">
      <div class="login-header">
        <div class="login-logo">🔐</div>
        <h1>应用平台</h1>
        <p class="login-subtitle">请登录以继续</p>
      </div>
      <form class="login-form" @submit.prevent="onLogin">
        <div class="form-group">
          <label>用户名</label>
          <input type="text" v-model="username" placeholder="请输入用户名" autocomplete="username" autofocus>
        </div>
        <div class="form-group">
          <label>密码</label>
          <input type="password" v-model="password" placeholder="请输入密码" autocomplete="current-password" @keydown.enter="onLogin">
        </div>
        <p v-if="errorMsg" class="login-error">{{ errorMsg }}</p>
        <button type="submit" class="login-btn" :disabled="loading">{{ loading ? '登录中...' : '登 录' }}</button>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
const router = useRouter(), route = useRoute()
const username = ref(''), password = ref(''), errorMsg = ref(''), loading = ref(false)
function onLogin() {
  errorMsg.value = ''; loading.value = true
  setTimeout(() => {
    if (username.value === 'admin' && password.value === 'lark1234') {
      localStorage.setItem('noteflow_auth', 'true'); localStorage.setItem('noteflow_user', username.value)
      router.push(route.query.redirect || '/portal')
    } else { errorMsg.value = '用户名或密码错误'; loading.value = false }
  }, 500)
}
</script>

<style scoped>
.login-page { display:flex; align-items:center; justify-content:center; min-height:100vh; min-height:100dvh; background:var(--bg); padding:20px; padding-top:calc(20px + env(safe-area-inset-top)); }
.login-card { background:var(--bg-panel); border-radius:16px; box-shadow:var(--shadow); width:380px; max-width:100%; overflow:hidden; }
.login-header { text-align:center; padding:40px 32px 24px; background:var(--bg-sidebar); color:var(--text-sidebar); }
.login-logo { font-size:48px; margin-bottom:12px; }
.login-header h1 { font-size:24px; font-weight:700; margin-bottom:4px; color:#fff; }
.login-subtitle { font-size:14px; color:var(--text-sidebar-dim); }
.login-form { padding:32px; }
.form-group { margin-bottom:20px; }
.form-group label { display:block; font-size:13px; font-weight:600; color:var(--text); margin-bottom:6px; }
.form-group input { width:100%; padding:10px 14px; border:1px solid var(--border); border-radius:8px; font-size:14px; outline:none; background:var(--bg); color:var(--text); transition:border var(--transition); box-sizing:border-box; }
.form-group input:focus { border-color:var(--accent); }
.login-error { color:var(--danger); font-size:13px; margin-bottom:16px; text-align:center; }
.login-btn { width:100%; padding:12px; background:var(--accent); color:#fff; border:none; border-radius:8px; font-size:15px; font-weight:600; cursor:pointer; transition:background var(--transition); }
.login-btn:hover:not(:disabled) { background:var(--accent-hover); }
.login-btn:disabled { opacity:.6; cursor:not-allowed; }
</style>
