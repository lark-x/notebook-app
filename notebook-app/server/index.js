/**
 * NoteFlow 后端入口
 *
 * 职责：
 * 1. 加载环境变量
 * 2. 创建 Express 应用并配置中间件
 * 3. 注册 API 路由（来自 routes.js 模块）
 * 4. 在生产模式下托管 Vue 构建产物（静态文件）
 * 5. 启动 HTTP 监听
 *
 * 开发模式下前端由 Vite dev server 独立运行（端口 5173），
 * 后端仅提供 API 服务（端口 3000）。
 * 生产模式下后端同时提供 API 和静态文件服务。
 */

// 加载 .env 文件中的环境变量（必须在其他 require 之前）
require('dotenv').config();

const express = require('express');
const path = require('path');
const apiRoutes = require('./routes');

const app = express();
// 服务端口，优先读取环境变量 PORT，默认 3000
const PORT = process.env.PORT || 3000;

// ===== 中间件配置 =====

// 解析 JSON 请求体，限制最大 10MB（笔记内容可能较大）
app.use(express.json({ limit: '10mb' }));

// ===== 注册 API 路由 =====

// 所有 /api 开头的请求交由路由模块处理
app.use('/api', apiRoutes);

// ===== 生产模式：托管 Vue 构建产物 =====

// Vue 项目构建输出目录
const distPath = path.join(__dirname, '..', 'client', 'dist');

// 托管静态文件（index.html、JS、CSS 等）
app.use(express.static(distPath));

// 所有非 API 请求回退到 index.html（支持 Vue Router 的 History 模式）
app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

// ===== 启动服务 =====

app.listen(PORT, () => {
  console.log(`NoteFlow server running at http://localhost:${PORT}`);
  console.log(`API base: http://localhost:${PORT}/api`);
  console.log(`Mode: ${process.env.NODE_ENV || 'development'}`);
});
