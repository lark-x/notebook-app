<!--
  登录页面组件

  提供用户名/密码登录表单。
  硬编码账号：admin / lark1234
  登录成功后跳转到门户页（或 redirect 参数指定的路径）。
-->

<template>
  <div class="login-page">
    <div class="login-card">
      <!-- Logo 区域 -->
      <div class="login-header">
        <div class="login-logo">🔐</div>
        <h1>应用平台</h1>
        <p class="login-subtitle">请登录以继续</p>
      </div>

      <!-- 登录表单 -->
      <form class="login-form" @submit.prevent="onLogin">
        <div class="form-group">
          <label for="username">用户名</label>
          <input
            id="username"
            type="text"
            v-model="username"
            placeholder="请输入用户名"
            autocomplete="username"
            autofocus
          >
        </div>

        <div class="form-group">
          <label for="password">密码</label>
          <input
            id="password"
            type="password"
            v-model="password"
            placeholder="请输入密码"
            autocomplete="current-password"
            @keydown.enter="onLogin"
          >
        </div>

        <!-- 错误提示 -->
        <p v-if="errorMsg" class="login-error">{{ errorMsg }}</p>

        <button type="submit" class="login-btn" :disabled="loading">
          {{ loading ? '登录中...' : '登 录' }}
        </button>
      </form>
    </div>
  </div>
</template>

<script setup>
/**
 * 登录页面逻辑
 *
 * 硬编码账号验证：
 * - 用户名：admin
 * - 密码：lark1234
 *
 * 登录状态存储在 localStorage 中（键名 noteflow_auth）。
 */
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'

const router = useRouter()
const route = useRoute()

/** 用户名输入 */
const username = ref('')
/** 密码输入 */
const password = ref('')
/** 错误信息 */
const errorMsg = ref('')
/** 加载状态 */
const loading = ref(false)

/**
 * 处理登录提交
 * 验证用户名密码，成功后跳转到 redirect 参数或门户页
 */
function onLogin() {
  errorMsg.value = ''
  loading.value = true

  // 模拟网络延迟
  setTimeout(() => {
    if (username.value === 'admin' && password.value === 'lark1234') {
      // 登录成功：写入 localStorage
      localStorage.setItem('noteflow_auth', 'true')
      localStorage.setItem('noteflow_user', username.value)

      // 跳转到 redirect 参数指定的路径，或默认到门户
      const redirect = route.query.redirect || '/portal'
      router.push(redirect)
    } else {
      errorMsg.value = '用户名或密码错误'
      loading.value = false
    }
  }, 500)
}
</script>

<style scoped>
/* 登录页全屏居中布局 */
.login-page {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  min-height: 100dvh;
  background: var(--bg);
  padding: 20px;
  padding-top: calc(20px + env(safe-area-inset-top));
}

/* 登录卡片 */
.login-card {
  background: var(--bg-panel);
  border-radius: 16px;
  box-shadow: var(--shadow);
  width: 380px;
  max-width: 100%;
  overflow: hidden;
}

/* 卡片头部 */
.login-header {
  text-align: center;
  padding: 40px 32px 24px;
  background: var(--bg-sidebar);
  color: var(--text-sidebar);
}

.login-logo {
  font-size: 48px;
  margin-bottom: 12px;
}

.login-header h1 {
  font-size: 24px;
  font-weight: 700;
  margin-bottom: 4px;
  color: #fff;
}

.login-subtitle {
  font-size: 14px;
  color: var(--text-sidebar-dim);
}

/* 表单区域 */
.login-form {
  padding: 32px;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: var(--text);
  margin-bottom: 6px;
}

.form-group input {
  width: 100%;
  padding: 10px 14px;
  border: 1px solid var(--border);
  border-radius: 8px;
  font-size: 14px;
  outline: none;
  background: var(--bg);
  color: var(--text);
  transition: border var(--transition);
  box-sizing: border-box;
}

.form-group input:focus {
  border-color: var(--accent);
}

/* 错误提示 */
.login-error {
  color: var(--danger);
  font-size: 13px;
  margin-bottom: 16px;
  text-align: center;
}

/* 登录按钮 */
.login-btn {
  width: 100%;
  padding: 12px;
  background: var(--accent);
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: background var(--transition);
}

.login-btn:hover:not(:disabled) {
  background: var(--accent-hover);
}

.login-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
