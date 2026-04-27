import { inject, onMounted, onUnmounted } from 'vue';
import { 
  createPointFeature, 
  createPolylineFeature, 
  createPolygonFeature, 
  createModelFeature,
  createLabelFeature,
  type Feature
} from '@cgx/feature';

type FeatureType = 'point' | 'polyline' | 'polygon' | 'model' | 'label';

export function useFeature(kind: FeatureType, options: any) {
  const viewer = inject<any>('cgxViewer');
  let feature: any = null;

  if (kind === 'point') feature = createPointFeature(options);
  else if (kind === 'polyline') feature = createPolylineFeature(options);
  else if (kind === 'polygon') feature = createPolygonFeature(options);
  else if (kind === 'model') feature = createModelFeature(options);
  else if (kind === 'label') feature = createLabelFeature(options);

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
    feature,
    setPosition(pos: any) { if (feature && feature.position) feature.position(pos); },
    setPositions(pos: any[]) { if (feature && feature.positions) feature.positions(pos); }
  };
}
