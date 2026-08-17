<script setup lang="ts">
import { onMounted, onBeforeUnmount } from 'vue'
import { Map3D } from '@globalmap/core'

/**
 * Demo 1 / 冒烟测试：消费 @globalmap/core 的编译产物（dist），只初始化一个地球。
 *
 * 底图 / 图层 / 控件一律通过 Map3DOptions 配置项初始化
 * （basemapsLayer / layer / control 等），不直接实例化内部对象传入。
 * 其余功能由开发者在本页手动验证；功能 demo 页在 1.0 版本开发完毕后填充。
 */
let map: Map3D | null = null

onMounted(() => {
  map = new Map3D({
    container: 'map-container',
    // 底图集合走配置项：首项为默认底图（OSM 免 key，适合冒烟）
    basemapsLayer: [{ type: 'osm', options: {}, name: 'OpenStreetMap' }],
  })
  // map3d:ready 是外部消费者判断地图就绪的唯一信号
  map.eventBus.on('map3d:ready', () => {
    console.log('[example] Map3D ready')
  })
})

onBeforeUnmount(() => {
  map?.destroy()
  map = null
})
</script>

<template>
  <div id="map-container" class="map-container"></div>
</template>

<style scoped>
.map-container {
  width: 100%;
  height: 100%;
}
</style>
