import { defineAsyncComponent } from 'vue'
import type { Component } from 'vue'

/**
 * Demo 注册表：example 路由与侧边导航的唯一数据源。
 *
 * 新增功能 demo 的流程（后续填充功能只需这两步）：
 * 1. 新建目录 `src/demos/<demo-name>/index.vue` 编写 demo 页；
 * 2. 在下方 `demos` 数组追加一条登记。
 * 路由（/demos/<demo-name>）与侧边导航自动生成，无需改其它文件。
 *
 * 约定：demo 页内部一律通过 Map3DOptions 配置项初始化地图能力，
 * 不直接实例化 core 内部对象——example 验证的是配置项初始化这条设计契约。
 */
export interface DemoEntry {
  /** 唯一标识，同时用作路由路径：/demos/<name> */
  name: string
  /** 侧边栏显示名称 */
  title: string
  /** 一句话描述（侧边栏副标题） */
  description?: string
  /** demo 页组件（按 demo 懒加载拆包） */
  component: Component
}

export const demos: DemoEntry[] = [
  {
    name: 'hello-map',
    title: '地球初始化',
    description: '冒烟：配置项初始化一个地球',
    component: defineAsyncComponent(() => import('./hello-map/index.vue')),
  },
  // 后续功能 demo 在此逐条填充（1.0 版本开发完毕后按功能域补齐），例如：
  // {
  //   name: 'layer-tile',
  //   title: '瓦片图层',
  //   description: 'layer 配置项加载多厂商瓦片',
  //   component: defineAsyncComponent(() => import('./layer-tile/index.vue')),
  // },
]
