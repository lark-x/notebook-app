<template>
  <div class="settings-page">
    <header class="settings-header">
      <button class="back-btn" @click="router.push('/portal')">← 返回</button>
      <h1>👥 用户管理</h1>
    </header>
    <main class="settings-main">
      <div class="settings-card">
        <div class="user-actions">
          <button class="btn-add" @click="showForm = true; resetForm()">+ 新增用户</button>
        </div>
        <div class="user-list">
          <div v-for="u in users" :key="u.id" class="user-row">
            <div class="user-info">
              <span class="user-name">{{ u.username }}</span>
              <span class="user-role" :class="u.role">{{ u.role === 'admin' ? '管理员' : '普通用户' }}</span>
            </div>
            <div class="user-btns">
              <button @click="onEdit(u)">编辑</button>
              <button class="btn-danger" :disabled="u.id === currentUserId" @click="onDelete(u)">删除</button>
            </div>
          </div>
          <p v-if="!users.length" class="empty">暂无用户</p>
        </div>
      </div>

      <div v-if="showForm" class="modal-overlay" @click.self="showForm = false">
        <div class="modal-card">
          <h3>{{ editingUser ? '编辑用户' : '新增用户' }}</h3>
          <div class="form-section">
            <label>用户名</label>
            <input v-model="form.username" placeholder="请输入用户名" maxlength="20">
          </div>
          <div class="form-section">
            <label>密码 {{ editingUser ? '(留空不修改)' : '' }}</label>
            <input type="password" v-model="form.password" :placeholder="editingUser ? '留空不修改' : '请输入密码'" autocomplete="new-password">
          </div>
          <div class="form-section">
            <label>角色</label>
            <select v-model="form.role">
              <option value="user">普通用户</option>
              <option value="admin">管理员</option>
            </select>
          </div>
          <p v-if="formError" class="form-error">{{ formError }}</p>
          <div class="form-actions">
            <button class="btn-cancel" @click="showForm = false">取消</button>
            <button class="btn-save" :disabled="saving" @click="onSubmit">{{ saving ? '保存中...' : '保存' }}</button>
          </div>
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
const users = ref([])
const currentUserId = ref('')
const showForm = ref(false), editingUser = ref(null), saving = ref(false), formError = ref('')
const form = reactive({ username: '', password: '', role: 'user' })

function resetForm() { form.username = ''; form.password = ''; form.role = 'user'; formError.value = ''; editingUser.value = null }

async function loadUsers() {
  try { users.value = await apiRequest('GET', '/users') } catch {}
}

onMounted(async () => {
  await auth.checkAuth()
  currentUserId.value = auth.user?.id || ''
  await loadUsers()
})

function onEdit(u) {
  editingUser.value = u
  form.username = u.username; form.password = ''; form.role = u.role
  formError.value = ''; showForm.value = true
}

async function onDelete(u) {
  if (!confirm(`确定删除用户「${u.username}」吗？`)) return
  try { await apiRequest('DELETE', `/users/${u.id}`); await loadUsers() } catch (e) { alert(e.message) }
}

async function onSubmit() {
  formError.value = ''
  if (!form.username.trim()) { formError.value = '请输入用户名'; return }
  if (!editingUser.value && !form.password) { formError.value = '请输入密码'; return }
  if (form.password && form.password.length < 6) { formError.value = '密码至少6位'; return }
  saving.value = true
  try {
    if (editingUser.value) {
      const body = { username: form.username, role: form.role }
      if (form.password) body.password = form.password
      await apiRequest('PUT', `/users/${editingUser.value.id}`, body)
    } else {
      await apiRequest('POST', '/users', { username: form.username, password: form.password, role: form.role })
    }
    showForm.value = false; await loadUsers()
  } catch (e) { formError.value = e.message }
  saving.value = false
}
</script>

<style scoped>
.settings-page { min-height:100vh; background:var(--bg); }
.settings-header { display:flex; align-items:center; gap:16px; padding:16px 32px; padding-top:calc(16px + env(safe-area-inset-top)); background:var(--bg-sidebar); color:var(--text-sidebar); }
.back-btn { padding:6px 14px; background:transparent; border:1px solid rgba(255,255,255,.15); color:var(--text-sidebar-dim); border-radius:6px; font-size:13px; cursor:pointer; transition:all var(--transition); }
.back-btn:hover { background:rgba(255,255,255,.08); color:var(--text-sidebar); }
.settings-header h1 { font-size:18px; font-weight:700; color:#fff; }
.settings-main { max-width:700px; margin:0 auto; padding:40px 24px; }
.settings-card { background:var(--bg-panel); border:1px solid var(--border); border-radius:12px; padding:24px; }
.user-actions { margin-bottom:20px; }
.btn-add { padding:8px 20px; background:var(--accent); color:#fff; border:none; border-radius:8px; font-size:13px; font-weight:600; cursor:pointer; transition:background var(--transition); }
.btn-add:hover { background:var(--accent-hover); }
.user-list { display:flex; flex-direction:column; gap:8px; }
.user-row { display:flex; align-items:center; justify-content:space-between; padding:14px 16px; border:1px solid var(--border); border-radius:8px; }
.user-info { display:flex; align-items:center; gap:12px; }
.user-name { font-size:14px; font-weight:600; color:var(--text); }
.user-role { font-size:11px; padding:2px 8px; border-radius:10px; }
.user-role.admin { background:#e7f5ff; color:#1971c2; }
.user-role.user { background:#f3f0ff; color:#7048e8; }
.user-btns { display:flex; gap:8px; }
.user-btns button { padding:5px 14px; border:1px solid var(--border); border-radius:6px; font-size:12px; cursor:pointer; background:var(--bg); color:var(--text); transition:all var(--transition); }
.user-btns button:hover { border-color:var(--accent); color:var(--accent); }
.user-btns button:disabled { opacity:.4; cursor:not-allowed; }
.user-btns .btn-danger { color:var(--danger); border-color:var(--danger); }
.user-btns .btn-danger:hover:not(:disabled) { background:var(--danger); color:#fff; }
.empty { text-align:center; color:var(--text-secondary); padding:24px; font-size:14px; }
.modal-overlay { position:fixed; inset:0; background:rgba(0,0,0,.4); display:flex; align-items:center; justify-content:center; z-index:200; }
.modal-card { background:var(--bg-panel); border-radius:12px; padding:28px; width:400px; max-width:90%; box-shadow:0 8px 32px rgba(0,0,0,.2); }
.modal-card h3 { font-size:16px; font-weight:700; margin-bottom:20px; color:var(--text); }
.form-section { margin-bottom:16px; }
.form-section label { display:block; font-size:13px; font-weight:600; color:var(--text); margin-bottom:6px; }
.form-section input, .form-section select { width:100%; padding:9px 12px; border:1px solid var(--border); border-radius:8px; font-size:14px; outline:none; background:var(--bg); color:var(--text); transition:border var(--transition); box-sizing:border-box; }
.form-section input:focus, .form-section select:focus { border-color:var(--accent); }
.form-error { color:var(--danger); font-size:13px; margin-bottom:12px; }
.form-actions { display:flex; gap:10px; justify-content:flex-end; padding-top:8px; }
.btn-cancel { padding:8px 20px; background:var(--bg); border:1px solid var(--border); border-radius:8px; font-size:13px; cursor:pointer; color:var(--text); transition:all var(--transition); }
.btn-cancel:hover { background:var(--bg-hover); }
.btn-save { padding:8px 20px; background:var(--accent); color:#fff; border:none; border-radius:8px; font-size:13px; font-weight:600; cursor:pointer; transition:background var(--transition); }
.btn-save:hover:not(:disabled) { background:var(--accent-hover); }
.btn-save:disabled { opacity:.6; cursor:not-allowed; }
@media (max-width:600px) { .settings-header { padding:12px 16px; } .settings-main { padding:24px 16px; } }
</style>
