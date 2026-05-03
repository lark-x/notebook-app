<template>
  <div class="settings-page">
    <header class="settings-header">
      <button class="back-btn" @click="router.push('/portal')">← 返回</button>
      <h1>🤖 AI 配置</h1>
    </header>
    <main class="settings-main">
      <div class="settings-card">
        <div class="settings-section">
          <label>API Key</label>
          <input type="password" v-model="form.apiKey" placeholder="sk-..." autocomplete="off">
          <p class="hint">OpenAI 或兼容 API 的密钥</p>
        </div>
        <div class="settings-section">
          <label>API 地址</label>
          <input type="text" v-model="form.baseUrl" placeholder="https://api.openai.com/v1">
          <p class="hint">兼容 OpenAI 格式的接口地址，无需加 /chat/completions</p>
        </div>
        <div class="settings-section">
          <label>模型</label>
          <input type="text" v-model="form.model" placeholder="gpt-4o-mini">
          <p class="hint">使用的模型名称，如 gpt-4o-mini、deepseek-chat 等</p>
        </div>
        <div v-if="auth.isAdmin" class="settings-actions">
          <button class="btn-save" :disabled="saving" @click="onSave">{{ saving ? '保存中...' : '保存配置' }}</button>
          <span v-if="saveMsg" class="save-msg" :class="{ ok: saveOk }">{{ saveMsg }}</span>
        </div>
        <div v-else class="settings-readonly">
          <p>仅管理员可修改 AI 配置</p>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/useAuthStore.js'
import { apiRequest } from '../utils/api.js'

const router = useRouter()
const auth = useAuthStore()
const form = reactive({ apiKey: '', baseUrl: '', model: '' })
const saving = ref(false), saveMsg = ref(''), saveOk = ref(false)

onMounted(async () => {
  try {
    const s = await apiRequest('GET', '/ai-settings')
    form.apiKey = s.apiKey || ''
    form.baseUrl = s.baseUrl || ''
    form.model = s.model || ''
  } catch {}
})

async function onSave() {
  saving.value = true; saveMsg.value = ''
  try {
    await apiRequest('PUT', '/ai-settings', { apiKey: form.apiKey, baseUrl: form.baseUrl, model: form.model })
    saveMsg.value = '保存成功'; saveOk.value = true
  } catch (e) { saveMsg.value = e.message; saveOk.value = false }
  saving.value = false
}
</script>

<style scoped>
.settings-page { min-height:100vh; background:var(--bg); }
.settings-header { display:flex; align-items:center; gap:16px; padding:16px 32px; padding-top:calc(16px + env(safe-area-inset-top)); background:var(--bg-sidebar); color:var(--text-sidebar); }
.back-btn { padding:6px 14px; background:transparent; border:1px solid rgba(255,255,255,.15); color:var(--text-sidebar-dim); border-radius:6px; font-size:13px; cursor:pointer; transition:all var(--transition); }
.back-btn:hover { background:rgba(255,255,255,.08); color:var(--text-sidebar); }
.settings-header h1 { font-size:18px; font-weight:700; color:#fff; }
.settings-main { max-width:600px; margin:0 auto; padding:40px 24px; }
.settings-card { background:var(--bg-panel); border:1px solid var(--border); border-radius:12px; padding:32px; }
.settings-section { margin-bottom:24px; }
.settings-section label { display:block; font-size:14px; font-weight:600; color:var(--text); margin-bottom:8px; }
.settings-section input { width:100%; padding:10px 14px; border:1px solid var(--border); border-radius:8px; font-size:14px; outline:none; background:var(--bg); color:var(--text); transition:border var(--transition); box-sizing:border-box; }
.settings-section input:focus { border-color:var(--accent); }
.hint { font-size:12px; color:var(--text-secondary); margin-top:6px; }
.settings-actions { display:flex; align-items:center; gap:12px; padding-top:8px; }
.btn-save { padding:10px 28px; background:var(--accent); color:#fff; border:none; border-radius:8px; font-size:14px; font-weight:600; cursor:pointer; transition:background var(--transition); }
.btn-save:hover:not(:disabled) { background:var(--accent-hover); }
.btn-save:disabled { opacity:.6; cursor:not-allowed; }
.save-msg { font-size:13px; }
.save-msg.ok { color:var(--accent); }
.save-msg:not(.ok) { color:var(--danger); }
.settings-readonly { padding:16px; background:var(--bg-hover); border-radius:8px; color:var(--text-secondary); font-size:13px; text-align:center; }
@media (max-width:600px) { .settings-header { padding:12px 16px; } .settings-main { padding:24px 16px; } .settings-card { padding:20px; } }
</style>
