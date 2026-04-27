<template>
  <slot />
</template>

<script setup lang="ts">
import { inject, onMounted, onUnmounted, watch } from 'vue';
import { createTilesetLayer } from '@cgx/layer';

const props = defineProps<{
  id?: string;
  url: string;
  visible?: boolean;
  opacity?: number;
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

onMounted(() => {
  if (viewer) {
     layer._mount?.(viewer.adapter || viewer);
  }
});

onUnmounted(() => {
  if (viewer) {
     layer._unmount?.(viewer.adapter || viewer);
  }
});

watch(() => props.visible, (val) => {
  if (val !== undefined) layer.visible(val);
});

watch(() => props.opacity, (val) => {
  if (val !== undefined) layer.opacity(val);
});

watch(() => props.zIndex, (val) => {
  if (val !== undefined) layer.zIndex(val);
});
</script>
