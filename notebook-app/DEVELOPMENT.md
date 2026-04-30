# NoteFlow 开发规范

本文档定义了 NoteFlow 项目的编码规范和协作约定，所有贡献者必须遵守。

---

## 一、代码注释规范

### 1.1 总则

**所有代码文件必须包含详细的中文注释。** 注释是代码的重要组成部分，有助于团队协作和后期维护。

### 1.2 文件头注释

每个 `.js` 文件必须以 JSDoc 格式的文件头注释开头，说明文件的功能用途：

```javascript
/**
 * NoteFlow 后端服务
 *
 * 基于 Express + better-sqlite3 实现的 REST API 服务端。
 * 提供笔记本、笔记、设置的 CRUD 接口，数据持久化到 SQLite 数据库。
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

### 1.7 HTML 注释

HTML 中的结构区块必须添加注释说明：

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

### 2.1 JavaScript

- 使用 2 空格缩进
- 字符串优先使用单引号 `'`
- 语句末尾使用分号
- 使用 `const`/`let`，禁止使用 `var`
- 函数命名使用 camelCase
- 常量命名使用 UPPER_SNAKE_CASE

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

### 3.3 示例

```
feat(pagination): 添加笔记列表分页功能

- 后端 GET /api/notes 支持 page/pageSize/search 参数
- 前端新增分页控件，每页 15 条
- 切换笔记本或搜索时自动重置到第一页
```

---

## 四、分支与协作

- `master` 分支为主分支，保持可运行状态
- 新功能从 `master` 创建功能分支，完成后合并回 `master`
- 每次提交前确保代码可正常运行

---

## 五、技术栈

| 层级 | 技术 |
|------|------|
| 后端 | Node.js + Express + better-sqlite3 |
| 前端 | 原生 HTML + CSS + JavaScript（无框架） |
| 数据库 | SQLite（WAL 模式） |
| AI 集成 | OpenAI 兼容 API（支持 DeepSeek、Qwen 等） |
