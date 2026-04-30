# NoteFlow v3 架构迁移报告

## 概述

本次重构将 NoteFlow 从原生 JS/HTML/CSS 单体应用升级为 **Vue 3 + 后端模块化** 的现代架构。

---

## 一、前端重构

### 1.1 技术栈变更

| 项目 | 重构前 | 重构后 |
|------|--------|--------|
| 框架 | 原生 JavaScript | Vue 3 (Composition API) |
| 构建工具 | 无（直接加载 JS） | Vite 5 |
| 模块化 | 单文件 app.js（~1300 行） | 组件 + Composables 模块化 |
| HTTP 请求 | 原生 fetch | 原生 fetch（封装为 api.js） |
| 状态管理 | 全局变量 | Vue ref/reactive 响应式 |

### 1.2 文件拆分

**重构前**：所有前端逻辑集中在 `app.js`（~1300 行）

**重构后**：

| 文件 | 职责 | 行数（约） |
|------|------|-----------|
| `main.js` | 应用入口 | 10 |
| `App.vue` | 根组件 + 初始化 | 40 |
| `Sidebar.vue` | 侧边栏（笔记本列表、搜索、操作） | 120 |
| `NoteList.vue` | 笔记列表 + 分页 | 80 |
| `Editor.vue` | 富文本编辑器 + 工具栏 | 130 |
| `AiPanel.vue` | AI 创意转化面板 | 130 |
| `useNotebooks.js` | 笔记本 CRUD 状态管理 | 100 |
| `useNotes.js` | 笔记 CRUD + 分页 + 自动保存 | 170 |
| `useAi.js` | AI 转化状态管理 | 120 |
| `useSettings.js` | 主题、导入导出 | 70 |
| `api.js` | API 请求封装 | 30 |
| `helpers.js` | 通用工具函数 | 60 |

### 1.3 核心变更点

#### 响应式数据绑定

**重构前**：手动操作 DOM 更新界面
```javascript
// 旧方式：手动设置 innerHTML
noteList.innerHTML = notes.map(n => `<div>...</div>`).join('');
```

**重构后**：Vue 响应式自动更新
```vue
<!-- 新方式：声明式渲染 -->
<div v-for="note in notes" :key="note.id" class="note-item">
  {{ note.title }}
</div>
```

#### 状态管理

**重构前**：全局变量 + 手动同步
```javascript
let currentNotebookId = 'all';
let currentNoteId = null;
// 每次修改后需要手动调用 renderXxx()
```

**重构后**：Composables + 响应式 ref
```javascript
// useNotebooks.js
export const currentNotebookId = ref('all');
// 修改后自动触发相关组件重新渲染
```

#### 事件处理

**重构前**：addEventListener 手动绑定
```javascript
notebookList.addEventListener('click', (e) => { ... });
```

**重构后**：Vue 模板事件绑定
```vue
<div @click="onSelectNotebook(nb.id)">...</div>
```

#### contenteditable 编辑器

**重构前**：直接操作 DOM 元素
```javascript
noteContent.innerHTML = note.content;
noteContent.addEventListener('input', () => { ... });
```

**重构后**：模板引用 + 事件绑定
```vue
<div ref="contentRef" contenteditable="true" @input="onContentInput"></div>
```

---

## 二、后端模块化

### 2.1 文件拆分

**重构前**：所有后端逻辑集中在 `server.js`（~570 行）

**重构后**：

| 文件 | 职责 |
|------|------|
| `server/index.js` | Express 应用配置、路由注册、静态文件托管 |
| `server/db.js` | 数据库初始化、表结构、预编译语句、工具函数 |
| `server/routes.js` | 所有 RESTful API 路由端点 |

### 2.2 关键变更

- **路由层分离**：使用 Express Router 集中管理路由，不再与服务器配置混杂
- **数据库层独立**：db.js 负责所有数据库操作，其他模块通过 require 引入
- **生产模式静态文件托管**：后端在生产模式下同时托管 Vue 构建产物
- **API 接口不变**：所有 API 端点保持原有路径和参数，前端无感知切换

---

## 三、保留的原有功能

| 功能 | 状态 | 说明 |
|------|------|------|
| 笔记本 CRUD | ✅ 保留 | 完整迁移 |
| 笔记 CRUD | ✅ 保留 | 完整迁移 |
| 分页浏览 | ✅ 保留 | 后端分页 + 前端分页控件 |
| 搜索过滤 | ✅ 保留 | 支持标题/内容/标签搜索 |
| 富文本编辑 | ✅ 保留 | contenteditable + execCommand |
| 自动保存 | ✅ 保留 | 500ms 防抖 |
| 标签管理 | ✅ 保留 | 添加/删除标签 |
| AI 创意转化 | ✅ 保留 | 三种转化类型 + 关键词自定义 |
| 主题切换 | ✅ 保留 | 明暗主题 CSS 变量 |
| 导入导出 | ✅ 保留 | JSON 格式 |
| 响应式布局 | ✅ 保留 | 移动端抽屉式面板 |
| 侧边栏溢出修复 | ✅ 保留 | min-height: 0 + overflow: hidden |

---

## 四、移除的代码

| 文件 | 说明 |
|------|------|
| `app.js` | 原生 JS 前端，已被 Vue 组件替代 |
| `index.html` | 原 HTML 入口，已被 client/index.html 替代 |
| `style.css`（根目录） | 移至 client/src/style.css |
| `server.js` | 已拆分为 server/ 目录下的三个模块 |

---

## 五、开发流程变更

| 项目 | 重构前 | 重构后 |
|------|--------|--------|
| 启动方式 | `node server.js` | 开发：`npm run dev` + `npm run dev:client` |
| 构建步骤 | 无 | `npm run build`（Vite 构建 Vue） |
| 生产部署 | `node server.js` | `npm run build && npm start` |
| 热更新 | 无 | Vite HMR（前端热更新） |

---

## 六、依赖变更

### 后端依赖（不变）

- express ^4.18.2
- better-sqlite3 ^12.9.0
- dotenv ^17.4.2

### 前端依赖（新增）

- vue ^3.4.0
- @vitejs/plugin-vue ^5.0.0（devDependencies）
- vite ^5.4.0（devDependencies）

---

## 七、数据库兼容性

数据库结构完全不变，SQLite 数据库文件（`noteflow.db`）可直接沿用，无需迁移或重建。
