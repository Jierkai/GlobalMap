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
  createLabelFeature,
  createTextFeature
} from '@cgx/feature';

/**
 * CgxFeature 组件 Props
 *
 * @description
 * 统一的要素组件，根据 kind 属性自动创建对应的要素类型。
 * 支持 point、polyline、polygon、model、label/text 等要素类型。
 */
const props = defineProps<{
  /** 要素唯一标识 */
  id?: string;
  /** 要素类型 */
  kind: 'point' | 'polyline' | 'polygon' | 'model' | 'label' | 'text';
  /** 要素位置（用于 point/model/label） */
  position?: any;
  /** 要素顶点列表（用于 polyline/polygon） */
  positions?: any[];
  /** 要素样式配置 */
  style?: any;
  /** 自定义属性 */
  properties?: any;
  /** 渲染模式 */
  renderMode?: any;
  /** 附属标签配置 */
  label?: any;
}>();

const viewer = inject<any>('cgxViewer');
let feature: any = null;

// 根据 kind 类型创建对应的要素实例
if (props.kind === 'point') {
  feature = createPointFeature({ id: props.id, position: props.position, renderMode: props.renderMode, label: props.label, ...props.style });
} else if (props.kind === 'polyline') {
  feature = createPolylineFeature({ id: props.id, positions: props.positions, renderMode: props.renderMode, label: props.label, ...props.style });
} else if (props.kind === 'polygon') {
  feature = createPolygonFeature({ id: props.id, positions: props.positions, renderMode: props.renderMode, label: props.label, ...props.style });
} else if (props.kind === 'model') {
  feature = createModelFeature({ id: props.id, position: props.position, renderMode: props.renderMode, label: props.label, ...props.style });
} else if (props.kind === 'label') {
  feature = createLabelFeature({ id: props.id, position: props.position, renderMode: props.renderMode, ...props.style });
} else if (props.kind === 'text') {
  feature = createTextFeature({ id: props.id, position: props.position, renderMode: props.renderMode, ...props.style });
}

// 组件挂载时将要素挂载到 Viewer
onMounted(() => {
  if (viewer && feature && feature._mount) {
     feature._mount(viewer.adapter || viewer);
  }
});

// 组件卸载时移除要素
onUnmounted(() => {
  if (viewer && feature && feature._unmount) {
     feature._unmount(viewer.adapter || viewer);
  }
});

// 监听 position 变化，实时更新要素位置
watch(() => props.position, (val) => {
  if (val !== undefined && feature && feature.position) {
     feature.position(val);
  }
});

// 监听 positions 变化，实时更新要素顶点
watch(() => props.positions, (val) => {
  if (val !== undefined && feature && feature.positions) {
     feature.positions(val);
  }
});
</script>
