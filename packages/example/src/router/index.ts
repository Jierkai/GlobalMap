import { defineComponent, h, defineAsyncComponent, computed } from 'vue'
import type { Component } from 'vue'
import { createRouter, createWebHistory, useRoute } from 'vue-router'
import Home from '../views/Home.vue'

type AsyncComponentLoader = () => Promise<Component>

// import.meta.glob 收集案例页：新增案例零配置（DRY）
const caseModules = import.meta.glob('../views/cases/*.vue')

/** 案例名称清单（供 Home 导航与路由解析共用） */
export const caseNames: string[] = Object.keys(caseModules)
  .map((path) => /\/cases\/(.+)\.vue$/.exec(path)?.[1] ?? '')
  .filter(Boolean)

const CaseView = defineComponent({
  name: 'CaseView',
  setup() {
    const route = useRoute()
    const component = computed(() => {
      const name = String(route.params.name)
      const loader = caseModules[`../views/cases/${name}.vue`] as
        | AsyncComponentLoader
        | undefined
      return loader ? defineAsyncComponent(loader) : null
    })
    return () =>
      component.value
        ? h(component.value)
        : h('div', { style: 'padding: 24px' }, `案例不存在：${String(route.params.name)}`)
  },
})

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'home', component: Home },
    { path: '/case/:name', name: 'case', component: CaseView },
  ],
})

export default router
