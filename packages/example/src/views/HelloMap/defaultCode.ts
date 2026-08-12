/**
 * HelloMap 编辑器默认代码（重置时恢复到此代码）
 * 仅创建最简单的地球
 *
 * 编辑器中可用的变量：
 * - GM：@globalmap/core 全部导出（Map3D, TdtLayer, OsmLayer, basemaps, setMapKey, ...）
 * - Cesium：cesium 全部导出
 * - container：预览面板的 HTMLDivElement
 */
export const DEFAULT_CODE = `// GlobalMap HelloMap 调试器
// 可用变量: GM(@globalmap/core), Cesium, container(HTMLDivElement)
// GM 导出了 Map3D / TdtLayer / OsmLayer / ArcGisLayer / basemaps / setMapKey 等

const { Map3D } = GM

const map = new Map3D({
  container: 'cesiumContainer',
  viewerOptions: {
    infoBox: false,
    geocoder: false,
    baseLayer: new Cesium.ImageryLayer(
      new Cesium.UrlTemplateImageryProvider({
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        credit: 'Esri',
        maximumLevel: 18
      })
    )
  }
})

map.eventBus.on('map3d:ready', () => {
  console.log('[HelloMap] Map3D ready')
})

// 将 map 暴露到全局方便调试
window.__map = map
`
