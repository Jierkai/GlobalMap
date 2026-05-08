import { inject, onMounted, onUnmounted } from 'vue';
import { 
  createPointFeature, 
  createPolylineFeature, 
  createPolygonFeature, 
  createModelFeature,
  createLabelFeature,
  createTextFeature,
  type Feature
} from '@cgx/feature';

type FeatureType = 'point' | 'polyline' | 'polygon' | 'model' | 'label' | 'text';

/**
 * 要素组合式函数
 *
 * @description
 * Vue3 组合式 API，根据 kind 类型创建对应的要素实例，
 * 并在组件挂载/卸载时自动完成要素的挂载和清理。
 *
 * @param kind - 要素类型
 * @param options - 要素配置选项
 * @returns 包含 feature 实例及位置设置方法的对象
 */
export function useFeature(kind: FeatureType, options: any) {
  const viewer = inject<any>('cgxViewer');
  let feature: any = null;

  if (kind === 'point') feature = createPointFeature(options);
  else if (kind === 'polyline') feature = createPolylineFeature(options);
  else if (kind === 'polygon') feature = createPolygonFeature(options);
  else if (kind === 'model') feature = createModelFeature(options);
  else if (kind === 'label') feature = createLabelFeature(options);
  else if (kind === 'text') feature = createTextFeature(options);

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

  return {
    /** 要素实例 */
    feature,
    /** 设置单个位置 */
    setPosition(pos: any) { if (feature && feature.position) feature.position(pos); },
    /** 设置顶点列表 */
    setPositions(pos: any[]) { if (feature && feature.positions) feature.positions(pos); }
  };
}
