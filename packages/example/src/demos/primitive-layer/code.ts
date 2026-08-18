/**
 * primitive-layer 示例默认代码（重置时恢复到此代码）。
 *
 * 图元Layer（PrimitiveLayer）：点/线/面图元先入图层，图层再入 map——
 * 图元不能直接添加到 Map 实例（设计文档 §5.1 注② / §5.8）。
 */
export const primitiveLayerCode = `// 图元Layer（PrimitiveLayer）：点/线/面图元先入图层，图层再入 map
const { Map3D, PointPrimitive, PolylinePrimitive, PolygonPrimitive } = GM

const token = "67f42928d63ddd24abbe11368b8c287b"

const map = new Map3D({
  container,
  basemapsLayer: [{ type: 'osm', options: {}, name: 'OpenStreetMap' }],
  // 声明式初始化：layer 配置项登记一个空图元Layer
  layer: [{ type: 'primitive', options: { id: 'demo-primitives' } }],
})

map.eventBus.on('map3d:ready', () => {
  const layer = map.layer.getLayer('demo-primitives')

  // 点图元
  layer.addGraphic(
    new PointPrimitive({
      id: 'point-1',
      position: [116.39, 39.9],
      style: { pixelSize: 14, color: Cesium.Color.RED },
    }),
  )

  // 线图元
  layer.addGraphic(
    new PolylinePrimitive({
      id: 'polyline-1',
      positions: [
        [114.5, 38.0],
        [115.8, 39.5],
        [117.2, 39.2],
      ],
      style: { width: 4, color: Cesium.Color.YELLOW },
    }),
  )

  // 面图元（拉伸体）
  layer.addGraphic(
    new PolygonPrimitive({
      id: 'polygon-1',
      positions: [
        [112.8, 37.0],
        [114.0, 37.0],
        [114.0, 38.0],
        [112.8, 38.0],
      ],
      style: { color: Cesium.Color.CORNFLOWERBLUE.withAlpha(0.7), height: 0, extrudedHeight: 50000 },
    }),
  )

  console.log('[primitive-layer] 图元数量:', layer.getAllGraphics().length)
})

// 暴露到 window 便于控制台调试（同时供执行引擎捕获做生命周期管理）
window.__map = map
`
