<template>
  <slot />
</template>

<script setup lang="ts">
import { inject, onMounted, onUnmounted, watch, ref } from 'vue';
import { 
  createPointFeature, 
  createPolylineFeature, 
  createPolygonFeature, 
  createModelFeature,
  createLabelFeature
} from '@cgx/feature';

const props = defineProps<{
  id?: string;
  kind: 'point' | 'polyline' | 'polygon' | 'model' | 'label';
  position?: any;
  positions?: any[];
  style?: any;
  properties?: any;
}>();

const viewer = inject<any>('cgxViewer');
let feature: any = null;

if (props.kind === 'point') {
  feature = createPointFeature({ id: props.id, position: props.position, ...props.style });
} else if (props.kind === 'polyline') {
  feature = createPolylineFeature({ id: props.id, positions: props.positions, ...props.style });
} else if (props.kind === 'polygon') {
  feature = createPolygonFeature({ id: props.id, positions: props.positions, ...props.style });
} else if (props.kind === 'model') {
  feature = createModelFeature({ id: props.id, position: props.position, ...props.style });
} else if (props.kind === 'label') {
  feature = createLabelFeature({ id: props.id, position: props.position, ...props.style });
}

onMounted(() => {
  if (viewer && feature && feature._mount) {
     feature._mount(viewer.adapter || viewer);
  }
});

onUnmounted(() => {
  if (viewer && feature && feature._unmount) {
     feature._unmount(viewer.adapter || viewer);
  }
});

watch(() => props.position, (val) => {
  if (val !== undefined && feature && feature.position) {
     feature.position(val);
  }
});

watch(() => props.positions, (val) => {
  if (val !== undefined && feature && feature.positions) {
     feature.positions(val);
  }
});

</script>
