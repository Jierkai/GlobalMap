import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import { demos } from '../demos'

/**
 * 路由由 demos 注册表生成：新增 demo 无需手工维护路由。
 * `/` 重定向到第一个 demo；未知路径兜底回 `/`。
 */
const routes: RouteRecordRaw[] = [
  { path: '/', redirect: demos.length > 0 ? `/demos/${demos[0].name}` : '/' },
  ...demos.map((demo): RouteRecordRaw => ({
    path: `/demos/${demo.name}`,
    name: demo.name,
    component: demo.component,
    meta: { title: demo.title, description: demo.description },
  })),
  { path: '/:pathMatch(.*)*', redirect: '/' },
]

export const router = createRouter({
  history: createWebHistory(),
  routes,
})
