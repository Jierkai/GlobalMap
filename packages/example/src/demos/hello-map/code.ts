/**
 * hello-map 示例默认代码（重置时恢复到此代码）。
 *
 * 编辑器运行时可用变量：
 * - GM：@globalmap/core 全部导出（编译产物）
 * - Cesium：cesium 全部导出
 * - container：预览面板的 HTMLDivElement
 *
 * 地图捕获规则（执行引擎生命周期管理，三选一）：
 * 返回 Map3D 实例 / 返回 resolve 为 Map3D 的 Promise / 赋值 window.__map。
 */
export const helloMapCode = `// 最简单的地球：basemapsLayer 配置项初始化（不直接实例化内部对象）
const { Map3D } = GM

const map = new Map3D({
  container,
  // 底图集合走配置项：首项为默认底图（OSM 免 key，适合冒烟）
  basemapsLayer: [{ type: 'osm', options: {}, name: 'OpenStreetMap' }],
})

// map3d:ready 是外部消费者判断地图就绪的唯一信号
map.eventBus.on('map3d:ready', () => {
  console.log('[hello-map] Map3D ready')
})

// 暴露到 window 便于控制台调试（同时供执行引擎捕获做生命周期管理）
window.__map = map
`
