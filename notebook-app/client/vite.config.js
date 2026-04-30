/**
 * Vite 构建配置
 *
 * 配置 Vue 3 插件、开发服务器代理（将 /api 请求转发到后端）、
 * 以及生产构建的输出目录。
 */

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  // 启用 Vue 3 单文件组件支持
  plugins: [vue()],

  // 开发服务器配置
  server: {
    port: 5173,
    // 将 /api 请求代理到后端 Express 服务
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      }
    }
  },

  // 生产构建配置
  build: {
    // 输出到 client/dist 目录
    outDir: 'dist',
    // 清空输出目录
    emptyOutDir: true,
  }
})
