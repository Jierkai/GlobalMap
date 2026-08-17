import { helloMapCode } from './hello-map/code'

/**
 * Demo 注册表：主页案例画廊与示例路由的唯一数据源。
 *
 * 新增功能 demo 的流程（后续填充功能只需这两步）：
 * 1. 新建 `src/demos/<demo-name>/code.ts`，编写示例默认代码；
 * 2. 在下方 `demos` 数组追加一条登记。
 * 主页卡片与 `/demos/<demo-name>` 示例页（通用「左编辑器 + 右实时预览」）自动生成。
 *
 * 示例代码约定：
 * - 运行时可用变量：GM（@globalmap/core 全部导出，即编译产物）/ Cesium / container（预览面板元素）；
 * - 地图能力一律通过 Map3DOptions 配置项初始化（basemapsLayer / layer / control 等），
 *   不直接实例化图层等内部对象——配置项初始化是库的设计契约，example 验证的就是这条路径；
 * - 地图捕获规则（执行引擎据此做销毁/重建的生命周期管理，三选一）：
 *   返回 Map3D 实例 / 返回 resolve 为 Map3D 的 Promise / 赋值 window.__map。
 */
export interface DemoEntry {
  /** 唯一标识，同时用作路由路径：/demos/<name> */
  name: string
  /** 主页卡片与示例页标题 */
  title: string
  /** 一句话描述（主页卡片副标题） */
  description?: string
  /** 示例默认代码（示例页编辑器中可编辑运行） */
  code: string
}

export const demos: DemoEntry[] = [
  {
    name: 'hello-map',
    title: '地球初始化',
    description: '最简单的地球：basemapsLayer 配置项初始化',
    code: helloMapCode,
  },
  // 后续功能 demo 在此逐条填充（1.0 版本开发完毕后按功能域补齐）。
]
