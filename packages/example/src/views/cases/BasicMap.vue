<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import {
  ImageryLayer,
  OpenStreetMapImageryProvider,
  ProviderViewModel,
  UrlTemplateImageryProvider,
} from 'cesium'
import { Map3D, BaseLayer, BaseGraphic } from '@globalmap/core'

/** 内存演示图层：不操作真实 Cesium 实体，仅演示生命周期与事件流 */
class DemoLayer extends BaseLayer {
  readonly type = 'demo'
  onMap = false

  addToMap(): void {
    this.onMap = true
  }

  removeFromMap(): void {
    this.onMap = false
  }

  protected _updateShow(show: boolean): void {
    this.onMap = show
  }
}

/** 内存演示图元：泛型 style 透传演示 */
class DemoGraphic extends BaseGraphic<{ color: string }> {
  readonly type = 'demo'
  onMap = false

  addToMap(): void {
    this.onMap = true
  }

  removeFromMap(): void {
    this.onMap = false
  }

  protected _updateShow(show: boolean): void {
    this.onMap = show
  }
}

const ready = ref(false)
const layerOnMap = ref(false)
const graphicOnMap = ref(false)
const logs = ref<string[]>([])

let map: Map3D | null = null
let demoLayer: DemoLayer | null = null
let demoGraphic: DemoGraphic | null = null

function log(message: string): void {
  logs.value.push(`[${new Date().toLocaleTimeString()}] ${message}`)
}

onMounted(() => {
  const cesiumBaseUrl = import.meta.env.BASE_URL + 'cesium'
  // ArcGIS 影像瓦片模板直连：不走 ArcGisMapServerImageryProvider.fromUrl，
  // 避免其 MapServer 元数据请求（本网络下该端点访问不稳定会抛 RuntimeError）。
  const arcgisTileUrl =
    'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'

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

  map = new Map3D({
    container: 'map-container',
    cesiumBaseUrl,
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
  const { eventBus } = map

  // 外部消费者标准用法：判断地图就绪的唯一信号
  eventBus.on('map3d:ready', () => {
    ready.value = true
    log('map3d:ready —— 地图就绪')
  })
  eventBus.on('map3d:destroyed', () => log('map3d:destroyed'))
  eventBus.on('layer:added', ({ layer }) => log(`layer:added → ${layer.id}`))
  eventBus.on('layer:removed', ({ layerId }) => log(`layer:removed → ${layerId}`))
  eventBus.on('layer:showChanged', ({ layerId, show }) =>
    log(`layer:showChanged → ${layerId} show=${show}`),
  )
  eventBus.on('graphic:added', ({ graphic }) => log(`graphic:added → ${graphic.id}`))
  eventBus.on('graphic:removed', ({ graphicId }) => log(`graphic:removed → ${graphicId}`))
})

onUnmounted(() => {
  // 幂等销毁在真实环境无副作用
  map?.destroy()
  map = null
})

function addLayer(): void {
  if (!map || demoLayer) return
  demoLayer = new DemoLayer('demo-layer', map.viewer, map.eventBus)
  map.layer.addLayer(demoLayer)
  layerOnMap.value = true
}

function toggleLayerShow(): void {
  if (!demoLayer) return
  demoLayer.show = !demoLayer.show
}

function removeLayer(): void {
  if (!map || !demoLayer) return
  map.layer.removeLayer(demoLayer.id)
  demoLayer = null
  layerOnMap.value = false
}

function addGraphic(): void {
  if (!map || demoGraphic) return
  demoGraphic = new DemoGraphic('demo-graphic', map.viewer, map.eventBus, { color: 'red' })
  map.graphic.addGraphic(demoGraphic)
  graphicOnMap.value = true
}

function removeGraphic(): void {
  if (!map || !demoGraphic) return
  map.graphic.removeGraphic(demoGraphic.id)
  demoGraphic = null
  graphicOnMap.value = false
}
</script>

<template>
  <div class="basic-map">
    <div id="map-container" class="map-container"></div>

    <div class="panel">
      <h3>BasicMap 端到端闭环</h3>
      <p class="status">
        状态：
        <span :class="['badge', ready ? 'ok' : 'pending']">
          {{ ready ? '地图就绪' : '初始化中…' }}
        </span>
      </p>

      <div class="actions">
        <button :disabled="!ready || layerOnMap" @click="addLayer">添加图层</button>
        <button :disabled="!layerOnMap" @click="toggleLayerShow">显示/隐藏</button>
        <button :disabled="!layerOnMap" @click="removeLayer">移除图层</button>
        <button :disabled="!ready || graphicOnMap" @click="addGraphic">添加图元</button>
        <button :disabled="!graphicOnMap" @click="removeGraphic">移除图元</button>
      </div>

      <router-link class="back" to="/">← 返回案例列表</router-link>

      <ul class="log-list">
        <li v-for="(item, i) in logs" :key="i">{{ item }}</li>
      </ul>
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
  width: 320px;
  max-height: calc(100% - 32px);
  overflow: auto;
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

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}

.actions button {
  padding: 4px 10px;
  font-size: 13px;
  cursor: pointer;
}

.actions button:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.back {
  display: inline-block;
  margin-bottom: 12px;
  font-size: 13px;
  color: #165dff;
}

.log-list {
  margin: 0;
  padding: 0 0 0 16px;
  font-size: 12px;
  color: #4e5969;
}

.log-list li {
  margin-bottom: 4px;
}
</style>
