<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import {
  ImageryLayer,
  OpenStreetMapImageryProvider,
  ProviderViewModel,
  UrlTemplateImageryProvider,
} from 'cesium'
import { Map3D } from '@globalmap/core'

/**
 * BasicMap —— 空演示项目（设计定稿后降为空壳）。
 *
 * 仅 new Map3D + 渲染地球 + ready 徽标，不维护 Demo 图层/图元闭环逻辑。
 * 快速开发阶段案例页从简，新功能案例页等 1.0 后再补。
 */
const ready = ref(false)
let map: Map3D | null = null

onMounted(() => {
  // ArcGIS 影像瓦片模板直连：不走 ArcGisMapServerImageryProvider.fromUrl，
  // 避免其 MapServer 元数据请求（本网络下该端点访问不稳定会抛 RuntimeError）。
  const arcgisTileUrl =
    'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'

  // vite-plugin-cesium 自动注入 window.CESIUM_BASE_URL（指向 /cesium），
  // 这里取该值用于 ProviderViewModel 的 iconUrl 拼接。
  const cesiumBaseUrl = (window as { CESIUM_BASE_URL?: string }).CESIUM_BASE_URL ?? '/cesium'

  // 当前网络无法访问 api.cesium.com：Cesium 默认影像列表基于 ion 资产，
  // baseLayerPicker 初始化会请求 /v1/assets/2/endpoint 导致 RequestErrorEvent 且地球无影像。
  // 这里自定义非 ion 影像列表（ArcGIS / OSM 直连），默认选中第一项，进入页面即显示瓦片。
  const imageryViewModels = [
    new ProviderViewModel({
      name: 'ArcGIS World Imagery',
      iconUrl: `${cesiumBaseUrl}/Widgets/Images/ImageryProviders/ArcGisMapServiceWorldImagery.png`,
      tooltip: 'ArcGIS 在线影像（瓦片直连，不依赖 ion）',
      creationFunction: () =>
        new UrlTemplateImageryProvider({ url: arcgisTileUrl, credit: 'Esri', maximumLevel: 18 }),
    }),
    new ProviderViewModel({
      name: 'OpenStreetMap',
      iconUrl: `${cesiumBaseUrl}/Widgets/Images/ImageryProviders/openStreetMap.png`,
      tooltip: 'OpenStreetMap 在线地图（不依赖 ion）',
      creationFunction: () =>
        new OpenStreetMapImageryProvider({ url: 'https://tile.openstreetmap.org/' }),
    }),
  ]

  // 零配置：不传 cesiumBaseUrl，由 resolveCesiumBaseUrl 自动识别
  // （vite-plugin-cesium 已注入 window.CESIUM_BASE_URL = '/cesium'）
  map = new Map3D({
    container: 'map-container',
    // 本案例不做实体点选：禁用 InfoBox，消除其沙箱 iframe 的 Chrome 拦截提示；
    // 默认 ion 地理编码在本网络不可用：禁用 geocoder；
    // 初始 baseLayer 直接挂 ArcGIS 影像（同步构造，无任何元数据请求）。
    viewerOptions: {
      infoBox: false,
      geocoder: false,
      baseLayer: new ImageryLayer(
        new UrlTemplateImageryProvider({ url: arcgisTileUrl, credit: 'Esri', maximumLevel: 18 }),
      ),
      imageryProviderViewModels: imageryViewModels,
      selectedImageryProviderViewModel: imageryViewModels[0],
    },
  })

  // 外部消费者标准用法：map3d:ready 是判断地图就绪的唯一信号
  map.eventBus.on('map3d:ready', () => {
    ready.value = true
  })
})

onUnmounted(() => {
  // 幂等销毁在真实环境无副作用
  map?.destroy()
  map = null
})
</script>

<template>
  <div class="basic-map">
    <div id="map-container" class="map-container"></div>

    <div class="panel">
      <h3>BasicMap</h3>
      <p class="status">
        状态：
        <span :class="['badge', ready ? 'ok' : 'pending']">
          {{ ready ? '地图就绪' : '初始化中…' }}
        </span>
      </p>
      <router-link class="back" to="/">← 返回案例列表</router-link>
    </div>
  </div>
</template>

<style scoped>
.basic-map {
  position: relative;
  width: 100%;
  height: 100%;
}

.map-container {
  width: 100%;
  height: 100%;
}

.panel {
  position: absolute;
  top: 16px;
  left: 16px;
  width: 240px;
  padding: 16px;
  background: rgb(255 255 255 / 92%);
  border-radius: 8px;
  box-shadow: 0 4px 16px rgb(0 0 0 / 12%);
}

.panel h3 {
  margin: 0 0 8px;
  font-size: 16px;
}

.status {
  margin: 0 0 12px;
  font-size: 13px;
}

.badge {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
}

.badge.ok {
  color: #fff;
  background: #00b42a;
}

.badge.pending {
  color: #fff;
  background: #ff7d00;
}

.back {
  display: inline-block;
  font-size: 13px;
  color: #165dff;
}
</style>
