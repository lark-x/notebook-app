/**
 * NoteFlow Vue 3 应用入口
 *
 * 创建 Vue 应用实例，引入全局样式，挂载到 #app 元素。
 */

import { createApp } from 'vue'
import App from './App.vue'
import './style.css'

// 创建并挂载应用
const app = createApp(App)
app.mount('#app')
