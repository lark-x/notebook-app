# NoteFlow 开发规范

本文档定义了 NoteFlow 项目的编码规范和协作约定，所有贡献者必须遵守。

---

## 一、代码注释规范

### 1.1 总则

**所有代码文件必须包含详细的中文注释。** 注释是代码的重要组成部分，有助于团队协作和后期维护。

### 1.2 文件头注释

每个 `.js` / `.vue` 文件必须以 JSDoc 格式的文件头注释开头，说明文件的功能用途：

```javascript
/**
 * NoteFlow 数据库模块
 *
 * 负责 SQLite 数据库的初始化、表结构创建、
 * 预编译 SQL 语句的注册，以及工具函数的导出。
 */
```

### 1.3 函数注释

所有函数必须使用 JSDoc 格式注释，包含：

- **功能描述**：函数的作用
- **@param**：每个参数的名称、类型和含义
- **@returns**：返回值的类型和含义
- **逻辑说明**：复杂函数需补充实现思路

```javascript
/**
 * 根据当前笔记本和搜索条件过滤笔记
 * 过滤逻辑：先按笔记本筛选，再按搜索关键词匹配标题/内容/标签
 * @returns {Array} 过滤并排序后的笔记数组
 */
function getFilteredNotes() { ... }
```

### 1.4 区块注释

使用 `// ===== 标题 =====` 格式的区块分隔符，将代码按功能模块划分：

```javascript
// ===== 渲染笔记本列表 =====
// ===== 事件：笔记本列表点击 =====
// ===== AI 创意转化模块 =====
```

### 1.5 行内注释

关键逻辑处必须添加行内注释，说明"为什么这样做"而非"做了什么"：

```javascript
// 未传入的字段保持原值（支持部分更新）
const name = req.body.name !== undefined ? req.body.name : nb.name;

// 使用 AbortController 实现 30 秒超时
const controller = new AbortController();
```

### 1.6 SQL 注释

SQL 语句中的表结构和字段必须添加注释：

```sql
CREATE TABLE IF NOT EXISTS notes (
  id TEXT PRIMARY KEY,               -- 笔记唯一标识
  notebook_id TEXT NOT NULL,         -- 所属笔记本 ID
  title TEXT DEFAULT '',             -- 笔记标题
  content TEXT DEFAULT '',           -- 笔记内容（HTML 格式）
  tags TEXT DEFAULT '[]',            -- 标签列表（JSON 数组字符串）
  created_at INTEGER DEFAULT ...,    -- 创建时间戳（毫秒）
  updated_at INTEGER DEFAULT ...,    -- 更新时间戳
  FOREIGN KEY (notebook_id) REFERENCES notebooks(id) ON DELETE CASCADE
  -- 外键约束：删除笔记本时级联删除其下所有笔记
);
```

### 1.7 HTML / Vue 模板注释

HTML 和 Vue 模板中的结构区块必须添加注释说明：

```html
<!-- ===== 左侧边栏：笔记本列表、搜索、操作按钮 ===== -->
<aside id="sidebar">
  <!-- 顶栏：Logo 和新建笔记本按钮 -->
  <div class="sidebar-header">...</div>
</aside>
```

### 1.8 CSS 注释

CSS 中使用区块注释和行内注释说明样式用途：

```css
/* ===== 左侧边栏 ===== */

/* 笔记本列表容器 */
#notebook-list {
  flex: 1;
  overflow-y: auto;
  padding: 0 8px;
}
```

### 1.9 注释语言

- **必须使用中文**编写所有注释
- 技术术语可保留英文（如 API、DOM、SQL、CSS）
- 翻译外来概念时，首次出现可附注英文原文

---

## 二、代码风格

### 2.1 JavaScript / Vue

- 使用 2 空格缩进
- 字符串优先使用单引号 `'`
- 语句末尾使用分号
- 使用 `const`/`let`，禁止使用 `var`
- 函数命名使用 camelCase
- 常量命名使用 UPPER_SNAKE_CASE
- Vue 组件使用 Composition API（`<script setup>`）

### 2.2 HTML

- 使用 2 空格缩进
- 属性值使用双引号
- 语义化标签（`<aside>`、`<section>`、`<main>`、`<nav>`）

### 2.3 CSS

- 使用 2 空格缩进
- 每个选择器独占一行
- 属性按功能分组（布局 → 盒模型 → 排版 → 视觉 → 动画）

---

## 三、Git 提交规范

### 3.1 提交信息格式

```
<类型>(<范围>): <简短描述>

<详细说明（可选）>
```

### 3.2 类型

| 类型 | 说明 |
|------|------|
| `feat` | 新功能 |
| `fix` | Bug 修复 |
| `docs` | 文档变更 |
| `style` | 代码格式调整（不影响功能） |
| `refactor` | 重构（既非新功能也非修复） |
| `perf` | 性能优化 |
| `test` | 测试相关 |
| `chore` | 构建/工具链变更 |

---

## 四、项目结构

```
notebook-app/
├── server/                     # 后端模块
│   ├── index.js               # 入口：Express 配置、路由注册、静态文件托管
│   ├── db.js                  # 数据库：SQLite 初始化、表结构、预编译语句
│   └── routes.js              # 路由：所有 RESTful API 端点
├── client/                     # 前端 Vue 3 应用
│   ├── index.html             # HTML 入口
│   ├── package.json           # 前端依赖（vue、vite）
│   ├── vite.config.js         # Vite 构建配置 + 开发代理
│   ├── src/
│   │   ├── main.js            # Vue 应用入口
│   │   ├── App.vue            # 根组件（三栏布局）
│   │   ├── style.css          # 全局样式
│   │   ├── components/        # Vue 组件
│   │   │   ├── Sidebar.vue    # 侧边栏（笔记本列表、搜索、操作）
│   │   │   ├── NoteList.vue   # 笔记列表 + 分页控件
│   │   │   ├── Editor.vue     # 富文本编辑器 + 工具栏
│   │   │   └── AiPanel.vue    # AI 创意转化面板
│   │   ├── composables/       # 组合式函数（状态管理 + 业务逻辑）
│   │   │   ├── useNotebooks.js # 笔记本 CRUD
│   │   │   ├── useNotes.js    # 笔记 CRUD + 分页 + 自动保存
│   │   │   ├── useAi.js       # AI 创意转化
│   │   │   └── useSettings.js # 主题、导入导出
│   │   └── utils/             # 工具函数
│   │       ├── api.js         # API 请求封装
│   │       └── helpers.js     # 通用工具函数
│   └── dist/                  # 构建产物（git 忽略）
├── package.json               # 后端依赖 + 脚本
├── .env.example               # 环境变量模板
├── .gitignore
├── DEVELOPMENT.md             # 本文件
└── migration-report.md        # 迁移报告
```

---

## 五、技术栈

| 层级 | 技术 |
|------|------|
| 后端 | Node.js + Express + better-sqlite3 |
| 前端 | Vue 3 (Composition API) + Vite |
| 数据库 | SQLite（WAL 模式） |
| AI 集成 | OpenAI 兼容 API（支持 DeepSeek、Qwen 等） |

---

## 六、启动与部署

### 6.1 开发模式

```bash
# 安装依赖
npm run install:all

# 启动后端（端口 3000）
npm run dev

# 新终端：启动前端开发服务器（端口 5173，自动代理 /api 到后端）
npm run dev:client
```

### 6.2 生产构建

```bash
# 构建前端
npm run build

# 启动服务（同时提供 API 和静态文件）
npm start
```

### 6.3 环境变量

复制 `.env.example` 为 `.env`，配置 AI API 密钥：

```bash
cp .env.example .env
# 编辑 .env 设置 AI_API_KEY
```

---

## 七、分支与协作

- `master` 分支为主分支，保持可运行状态
- 新功能从 `master` 创建功能分支，完成后合并回 `master`
- 每次提交前确保代码可正常运行
