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
import {
  bridgeAdd3DTileset,
  bridgeAddDataSource,
  bridgeAddImageryLayer,
  bridgeRemove3DTileset,
  bridgeRemoveDataSource,
  bridgeRemoveImageryLayer,
  bridgeRemoveTerrainProvider,
  bridgeSetTerrainProvider,
} from '../layer';
import { resolveProvider } from './_provider';
import { GraphicLayerMount } from '../adapter';
import { createBatchKey, getDefaultBatcher } from '../scheduler';

export function createImageryLayerHandle(
  viewer: CesiumViewerHandle,
  spec: ImageryLayerRenderSpec,
): LayerHandle {
  const cesiumLayer = bridgeAddImageryLayer(
    viewer,
    resolveProvider(spec.provider) as Cesium.ImageryProvider | Promise<Cesium.ImageryProvider>,
  );
  applyVisibility(cesiumLayer as unknown as Record<string, unknown> | undefined, spec);
  let current: ImageryLayerRenderSpec = spec;

  const batcher = getDefaultBatcher();
  const batchId = createBatchKey('layer', spec.id);
  // apply 闭包：将补丁写入 Cesium ImageryLayer（visible→show，opacity→alpha）
  const apply = (patch: Partial<LayerRenderSpec>): void => {
    applyVisibility(
      cesiumLayer as unknown as Record<string, unknown> | undefined,
      latestVisibilityPatch(patch, current),
    );
  };

  return {
    id: spec.id,
    update(patch: Partial<LayerRenderSpec>) {
      current = { ...current, ...patch } as ImageryLayerRenderSpec;
      batcher.enqueue(batchId, patch, apply);
    },
    setVisible(v) {
      // 可见性是用户交互行为，同步写入
      current = { ...current, visible: v };
      batcher.enqueue(batchId, { visible: v } as Partial<LayerRenderSpec>, apply, { sync: true });
    },
    setOpacity(o) {
      current = { ...current, opacity: o };
      batcher.enqueue(batchId, { opacity: o } as Partial<LayerRenderSpec>, apply);
    },
    setZIndex(_z) {
      // Cesium imageryLayers reorder is non-trivial; defer to stage 4.
    },
    unsafeNative: () => cesiumLayer ?? null,
    dispose() {
      if (cesiumLayer) bridgeRemoveImageryLayer(viewer, cesiumLayer);
    },
  };
}

export function createTerrainLayerHandle(
  viewer: CesiumViewerHandle,
  spec: TerrainLayerRenderSpec,
): LayerHandle {
  bridgeSetTerrainProvider(viewer, resolveProvider(spec.provider) as Cesium.TerrainProvider);

  return {
    id: spec.id,
    update() { /* terrain provider replace is a remount, not handled in update */ },
    setVisible() { /* terrain does not support hiding */ },
    setOpacity() { /* same */ },
    setZIndex() { /* same */ },
    unsafeNative: () => null,
    dispose() {
      bridgeRemoveTerrainProvider(viewer);
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

function latestVisibilityPatch(
  patch: Partial<LayerRenderSpec>,
  current: Partial<LayerRenderSpec>,
): Partial<LayerRenderSpec> {
  if (patch.visible === undefined || patch.visible === current.visible) return patch;
  const { visible: _staleVisible, ...rest } = patch;
  return rest;
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
  const batcher = getDefaultBatcher();
  const batchId = createBatchKey('layer', spec.id);

  const apply = (patch: Partial<LayerRenderSpec>): void => {
    if (disposed) return;
    applyVisibility(raw as unknown as Record<string, unknown> | undefined, latestVisibilityPatch(patch, current));
  };

  const attach = async (next: DataLayerRenderSpec): Promise<void> => {
    const version = ++loadVersion;
    const payload = payloadRecord(next.payload);
    const url = payload.url;
    if (typeof url !== 'string') return;
    const mounted = await bridgeAdd3DTileset(viewer, url, next.options);
    if (disposed || version !== loadVersion) {
      if (mounted) bridgeRemove3DTileset(viewer, mounted);
      return;
    }
    raw = mounted;
    applyVisibility(raw as unknown as Record<string, unknown> | undefined, current);
  };

  void attach(spec);

  return {
    id: spec.id,
    update(patch: Partial<LayerRenderSpec>) {
      current = { ...current, ...patch } as DataLayerRenderSpec;
      batcher.enqueue(batchId, patch, apply);
    },
    setVisible(v) {
      current = { ...current, visible: v };
      batcher.enqueue(batchId, { visible: v } as Partial<LayerRenderSpec>, apply, { sync: true });
    },
    setOpacity(_o) { /* tileset opacity 不在本阶段处理 */ },
    setZIndex(_z) { /* tileset 没有 z-index 概念 */ },
    unsafeNative: () => raw ?? null,
    dispose() {
      disposed = true;
      loadVersion += 1;
      if (raw) {
        bridgeRemove3DTileset(viewer, raw);
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
  const batcher = getDefaultBatcher();
  const batchId = createBatchKey('layer', spec.id);

  const apply = (patch: Partial<LayerRenderSpec>): void => {
    if (disposed) return;
    applyVisibility(raw as unknown as Record<string, unknown> | undefined, latestVisibilityPatch(patch, current));
  };

  const attach = async (next: DataLayerRenderSpec): Promise<void> => {
    const version = ++loadVersion;
    const load = (Cesium as any).GeoJsonDataSource?.load;
    if (typeof load !== 'function') return;
    const dataSource = await load(next.payload, next.options);
    if (disposed || version !== loadVersion) return;
    const mounted = await bridgeAddDataSource(viewer, dataSource);
    if (disposed || version !== loadVersion) {
      if (mounted) bridgeRemoveDataSource(viewer, mounted);
      return;
    }
    raw = mounted;
    applyVisibility(raw as unknown as Record<string, unknown> | undefined, current);
  };

  void attach(spec);

  return {
    id: spec.id,
    update(patch: Partial<LayerRenderSpec>) {
      current = { ...current, ...patch } as DataLayerRenderSpec;
      batcher.enqueue(batchId, patch, apply);
    },
    setVisible(v) {
      current = { ...current, visible: v };
      batcher.enqueue(batchId, { visible: v } as Partial<LayerRenderSpec>, apply, { sync: true });
    },
    setOpacity(o) {
      current = { ...current, opacity: o };
      batcher.enqueue(batchId, { opacity: o } as Partial<LayerRenderSpec>, apply);
    },
    setZIndex(_z) { /* dataSource 不支持显式 z 序 */ },
    unsafeNative: () => raw ?? null,
    dispose() {
      disposed = true;
      loadVersion += 1;
      if (raw) {
        bridgeRemoveDataSource(viewer, raw);
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
  let applied: GraphicLayerRenderSpec = spec;
  const batcher = getDefaultBatcher();
  const batchId = createBatchKey('layer', spec.id);

  const apply = (patch: Partial<LayerRenderSpec>): void => {
    applied = { ...applied, ...latestVisibilityPatch(patch, current) } as GraphicLayerRenderSpec;
    mount.update(applied);
  };

  return {
    id: spec.id,
    update(patch: Partial<LayerRenderSpec>) {
      current = { ...current, ...patch } as GraphicLayerRenderSpec;
      batcher.enqueue(batchId, patch, apply);
    },
    setVisible(v) {
      current = { ...current, visible: v };
      batcher.enqueue(batchId, { visible: v } as Partial<LayerRenderSpec>, apply, { sync: true });
    },
    setOpacity(o) {
      current = { ...current, opacity: o };
      batcher.enqueue(batchId, { opacity: o } as Partial<LayerRenderSpec>, apply);
    },
    setZIndex(z) {
      current = { ...current, zIndex: z };
      batcher.enqueue(batchId, { zIndex: z } as Partial<LayerRenderSpec>, apply);
    },
    unsafeNative: () => mount.raw(),
    dispose() {
      mount.dispose();
    },
  };
}
