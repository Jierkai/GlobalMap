import * as Cesium from 'cesium';
import type {
  LayerHandle,
  ImageryLayerRenderSpec,
  TerrainLayerRenderSpec,
  LayerRenderSpec,
} from '@cgx/core';
import type { CesiumViewerHandle } from '../types';
import { LayerBridge } from '../layer';

export function createImageryLayerHandle(
  viewer: CesiumViewerHandle,
  spec: ImageryLayerRenderSpec,
): LayerHandle {
  const cesiumLayer = LayerBridge.addImageryLayer(
    viewer,
    spec.provider as unknown as Cesium.ImageryProvider,
  );
  applyVisibility(cesiumLayer as unknown as Record<string, unknown> | undefined, spec);

  return {
    id: spec.id,
    update(patch: Partial<LayerRenderSpec>) {
      applyVisibility(cesiumLayer as unknown as Record<string, unknown> | undefined, patch);
    },
    setVisible(v) {
      if (cesiumLayer) (cesiumLayer as unknown as { show: boolean }).show = v;
    },
    setOpacity(o) {
      if (cesiumLayer) (cesiumLayer as unknown as { alpha: number }).alpha = o;
    },
    setZIndex(_z) {
      // Cesium imageryLayers reorder is non-trivial; defer to stage 4.
    },
    unsafeNative: () => cesiumLayer ?? null,
    dispose() {
      if (cesiumLayer) LayerBridge.removeImageryLayer(viewer, cesiumLayer);
    },
  };
}

export function createTerrainLayerHandle(
  viewer: CesiumViewerHandle,
  spec: TerrainLayerRenderSpec,
): LayerHandle {
  LayerBridge.setTerrainProvider(viewer, spec.provider as unknown as Cesium.TerrainProvider);

  return {
    id: spec.id,
    update() { /* terrain provider replace is a remount, not handled in update */ },
    setVisible() { /* terrain does not support hiding */ },
    setOpacity() { /* same */ },
    setZIndex() { /* same */ },
    unsafeNative: () => null,
    dispose() {
      LayerBridge.removeTerrainProvider(viewer);
    },
  };
}

function applyVisibility(
  target: Record<string, unknown> | undefined,
  spec: Partial<LayerRenderSpec>,
): void {
  if (!target) return;
  if (spec.visible !== undefined) target.show = spec.visible;
  if (spec.opacity !== undefined) target.alpha = spec.opacity;
}
