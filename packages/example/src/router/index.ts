import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import Home from '../views/Home.vue'

/**
 * 路由：`/` 案例画廊；`/demos/:name` 通用示例页（左编辑器 + 右实时预览）。
 * 示例页按 name 从 demos 注册表解析条目；未知名由 Playground 重定向回主页。
 * Playground 懒加载：CodeMirror / cesium 等重依赖只在进入案例页时加载。
 */
const routes: RouteRecordRaw[] = [
  { path: '/', name: 'home', component: Home },
  {
    path: '/demos/:name',
    name: 'demo',
    component: () => import('../views/Playground.vue'),
  },
  { path: '/:pathMatch(.*)*', redirect: '/' },
]

export const router = createRouter({
  history: createWebHistory(),
  routes,
})
