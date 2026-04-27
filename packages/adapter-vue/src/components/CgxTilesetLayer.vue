<template>
  <slot />
</template>

<script setup lang="ts">
import { inject, onMounted, onUnmounted, watch } from 'vue';
import { createTilesetLayer } from '@cgx/layer';

/**
 * CgxTilesetLayer 组件 Props
 *
 * @description
 * 3D Tileset 图层组件，用于向 Cesium Viewer 加载和显示 3D Tileset 数据。
 */
const props = defineProps<{
  /** 图层唯一标识 */
  id?: string;
  /** Tileset 资源 URL */
  url: string;
  /** 是否可见 */
  visible?: boolean;
  /** 透明度 (0.0 - 1.0) */
  opacity?: number;
  /** 层级顺序 */
  zIndex?: number;
}>();

const viewer = inject<any>('cgxViewer');

const layer = createTilesetLayer({
  id: props.id,
  url: props.url,
  visible: props.visible ?? true,
  opacity: props.opacity ?? 1.0,
  zIndex: props.zIndex ?? 0
});

// 组件挂载时将图层挂载到 Viewer
onMounted(() => {
  if (viewer) {
     layer._mount?.(viewer.adapter || viewer);
  }
});

// 组件卸载时移除图层
onUnmounted(() => {
  if (viewer) {
     layer._unmount?.(viewer.adapter || viewer);
  }
});

// 监听 visible 变化，实时更新图层可见性
watch(() => props.visible, (val) => {
  if (val !== undefined) layer.visible(val);
});

// 监听 opacity 变化，实时更新图层透明度
watch(() => props.opacity, (val) => {
  if (val !== undefined) layer.opacity(val);
});

// 监听 zIndex 变化，实时更新图层层级
watch(() => props.zIndex, (val) => {
  if (val !== undefined) layer.zIndex(val);
});
</script>
