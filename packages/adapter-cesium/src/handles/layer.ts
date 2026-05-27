import * as Cesium from 'cesium';
import type {
  LayerHandle,
  ImageryLayerRenderSpec,
  TerrainLayerRenderSpec,
  LayerRenderSpec,
  DataLayerRenderSpec,
  FeatureRenderSpec,
  GraphicLayerRenderSpec,
  FeatureHandle,
} from '@cgx/core';
import type { CesiumViewerHandle } from '../types';
import { LayerBridge } from '../layer';
import { resolveProvider } from './_provider';
import { GraphicLayerMount } from '../adapter';

export function createImageryLayerHandle(
  viewer: CesiumViewerHandle,
  spec: ImageryLayerRenderSpec,
): LayerHandle {
  const cesiumLayer = LayerBridge.addImageryLayer(
    viewer,
    resolveProvider(spec.provider) as Cesium.ImageryProvider | Promise<Cesium.ImageryProvider>,
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
  LayerBridge.setTerrainProvider(viewer, resolveProvider(spec.provider) as Cesium.TerrainProvider);

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

function payloadRecord(payload: unknown): Record<string, unknown> {
  return payload && typeof payload === 'object' ? payload as Record<string, unknown> : {};
}

export function createTilesetLayerHandle(
  viewer: CesiumViewerHandle,
  spec: DataLayerRenderSpec,
): LayerHandle {
  let disposed = false;
  let raw: Cesium.Cesium3DTileset | undefined;
  let loadVersion = 0;
  let current: DataLayerRenderSpec = spec;

  const attach = async (next: DataLayerRenderSpec): Promise<void> => {
    const version = ++loadVersion;
    const payload = payloadRecord(next.payload);
    const url = payload.url;
    if (typeof url !== 'string') return;
    const mounted = await LayerBridge.add3DTileset(viewer, url, next.options);
    if (disposed || current !== next || version !== loadVersion) {
      if (mounted) LayerBridge.remove3DTileset(viewer, mounted);
      return;
    }
    raw = mounted;
    applyVisibility(raw as unknown as Record<string, unknown> | undefined, next);
  };

  void attach(spec);

  return {
    id: spec.id,
    update(patch: Partial<LayerRenderSpec>) {
      current = { ...current, ...patch } as DataLayerRenderSpec;
      applyVisibility(raw as unknown as Record<string, unknown> | undefined, current);
    },
    setVisible(v) {
      if (raw) (raw as unknown as { show: boolean }).show = v;
    },
    setOpacity(_o) { /* tileset opacity 不在本阶段处理 */ },
    setZIndex(_z) { /* tileset 没有 z-index 概念 */ },
    unsafeNative: () => raw ?? null,
    dispose() {
      disposed = true;
      loadVersion += 1;
      if (raw) {
        LayerBridge.remove3DTileset(viewer, raw);
        raw = undefined;
      }
    },
  };
}

export function createDataSourceLayerHandle(
  viewer: CesiumViewerHandle,
  spec: DataLayerRenderSpec,
): LayerHandle {
  let disposed = false;
  let raw: Cesium.DataSource | undefined;
  let loadVersion = 0;
  let current: DataLayerRenderSpec = spec;

  const attach = async (next: DataLayerRenderSpec): Promise<void> => {
    const version = ++loadVersion;
    const load = (Cesium as any).GeoJsonDataSource?.load;
    if (typeof load !== 'function') return;
    const dataSource = await load(next.payload, next.options);
    if (disposed || current !== next) return;
    const mounted = await LayerBridge.addDataSource(viewer, dataSource);
    if (disposed || current !== next || version !== loadVersion) {
      if (mounted) LayerBridge.removeDataSource(viewer, mounted);
      return;
    }
    raw = mounted;
    applyVisibility(raw as unknown as Record<string, unknown> | undefined, next);
  };

  void attach(spec);

  return {
    id: spec.id,
    update(patch: Partial<LayerRenderSpec>) {
      current = { ...current, ...patch } as DataLayerRenderSpec;
      applyVisibility(raw as unknown as Record<string, unknown> | undefined, current);
    },
    setVisible(v) {
      if (raw) (raw as unknown as { show: boolean }).show = v;
    },
    setOpacity(o) {
      if (raw) (raw as unknown as { alpha?: number }).alpha = o;
    },
    setZIndex(_z) { /* dataSource 不支持显式 z 序 */ },
    unsafeNative: () => raw ?? null,
    dispose() {
      disposed = true;
      loadVersion += 1;
      if (raw) {
        LayerBridge.removeDataSource(viewer, raw);
        raw = undefined;
      }
    },
  };
}

export function createGraphicLayerHandle(
  viewer: CesiumViewerHandle,
  spec: GraphicLayerRenderSpec,
  mountFeature: (spec: FeatureRenderSpec) => FeatureHandle,
): LayerHandle {
  const mount = new GraphicLayerMount(viewer, spec, mountFeature);
  let current: GraphicLayerRenderSpec = spec;

  return {
    id: spec.id,
    update(patch: Partial<LayerRenderSpec>) {
      current = { ...current, ...patch } as GraphicLayerRenderSpec;
      mount.update(current);
    },
    setVisible(v) {
      current = { ...current, visible: v };
      mount.update(current);
    },
    setOpacity(o) {
      current = { ...current, opacity: o };
      mount.update(current);
    },
    setZIndex(z) {
      current = { ...current, zIndex: z };
      mount.update(current);
    },
    unsafeNative: () => mount.raw(),
    dispose() {
      mount.dispose();
    },
  };
}
