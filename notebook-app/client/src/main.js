/**
 * NoteFlow Vue 3 应用入口
 *
 * 创建 Vue 应用实例，注册路由，引入全局样式，挂载到 #app 元素。
 */

import { createApp } from 'vue'
import App from './App.vue'
import router from './router/index.js'
import './style.css'

// 创建并挂载应用
const app = createApp(App)
app.use(router)
app.mount('#app')
