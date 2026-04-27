<template>
  <slot />
</template>

<script setup lang="ts">
import { inject, onMounted, onUnmounted, watch } from 'vue';
import { createImageryLayer } from '@cgx/layer';

const props = defineProps<{
  id?: string;
  provider: any;
  visible?: boolean;
  opacity?: number;
  zIndex?: number;
}>();

const viewer = inject<any>('cgxViewer');

const layer = createImageryLayer({
  id: props.id,
  provider: props.provider,
  visible: props.visible ?? true,
  opacity: props.opacity ?? 1.0,
  zIndex: props.zIndex ?? 0
});

onMounted(() => {
  if (viewer) {
     // Assuming viewer is the adapter or has a Layers capability
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
