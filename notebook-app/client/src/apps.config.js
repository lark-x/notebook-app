/**
 * 应用注册配置
 *
 * 门户页面从此文件读取可用应用列表。
 * 新增应用时，只需在 apps 数组中添加一条记录即可。
 *
 * 字段说明：
 * - id: 应用唯一标识（字符串）
 * - name: 应用显示名称
 * - icon: 应用图标（emoji 或图片 URL）
 * - description: 应用简介（显示在卡片中）
 * - route: 应用对应的前端路由路径
 *
 * 扩展示例：
 * export const apps = [
 *   { id: 'noteflow', name: 'NoteFlow 笔记', icon: '📓', description: '...', route: '/app/noteflow' },
 *   { id: 'todo', name: '待办清单', icon: '✅', description: '...', route: '/app/todo' },
 *   { id: 'kanban', name: '看板', icon: '📋', description: '...', route: '/app/kanban' },
 * ]
 */

export const apps = [
  {
    id: 'noteflow',
    name: 'NoteFlow 笔记',
    icon: '📓',
    description: '富文本笔记本，支持 AI 创意转化',
    route: '/app/noteflow'
  }
]
