import { describe, expect, it, vi } from 'vitest';
import type { EngineAdapter, FeatureRenderSpec, LayerRenderSpec, Updatable } from '@cgx/core';
import {
  createDataLayer,
  createGeoJsonLayer,
  createGraphicLayer,
  createPointCloudLayer,
  createTilesetLayer,
  createVectorLayer,
} from '../src/index.js';

function createMountHandle<T>(): Updatable<T> {
  return {
    update: vi.fn(),
    dispose: vi.fn(),
  };
}

function createAdapter() {
  const featureHandles: Array<Updatable<FeatureRenderSpec>> = [];
  const layerHandles: Array<Updatable<LayerRenderSpec>> = [];

  const adapter: EngineAdapter = {
    mountFeature: vi.fn(() => {
      const handle = createMountHandle<FeatureRenderSpec>();
      featureHandles.push(handle);
      return handle;
    }),
    unmountFeature: vi.fn(),
    mountLayer: vi.fn(() => {
      const handle = createMountHandle<LayerRenderSpec>();
      layerHandles.push(handle);
      return handle;
    }),
    unmountLayer: vi.fn(),
  };

  return { adapter, featureHandles, layerHandles };
}

describe('GraphicLayer', () => {
  it('manages graphics and exports clustering/model renderMode in render specs', () => {
    const layer = createGraphicLayer({
      id: 'graphics',
      clustering: { enabled: true, pixelRange: 24, minimumClusterSize: 3 },
      renderMode: 'primitive',
    });

    const point = layer.addPoint({ id: 'p1', position: [120, 30], pixelSize: 12, label: { text: 'P1' } });
    layer.addPolyline({ id: 'line-1', positions: [[120, 30], [121, 31]] });
    const model = layer.addModel({ id: 'm1', position: [120, 30, 100], uri: '/model.glb', renderMode: 'primitive' });
    const text = layer.addText({ id: 't1', position: [121, 31], text: 'Hello' });

    expect(layer.getById('p1')).toBe(point);
    expect(layer.find((graphic) => graphic.id === 'm1')).toBe(model);
    expect(layer.find((graphic) => graphic.id === 't1')).toBe(text);
    expect(layer.list()).toHaveLength(4);

    const spec = layer.toRenderSpec();
    expect(spec.kind).toBe('graphic');
    expect(spec.clustering).toEqual({ enabled: true, pixelRange: 24, minimumClusterSize: 3 });
    expect(spec.renderMode).toBe('primitive');
    expect(spec.graphics).toHaveLength(4);
    expect(spec.graphics?.find((graphic) => graphic.id === 'p1')).toMatchObject({
      kind: 'point',
      label: { text: 'P1' },
    });
    expect(spec.graphics?.find((graphic) => graphic.id === 't1')).toMatchObject({
      kind: 'text',
      label: { text: 'Hello' },
    });
    expect(spec.graphics?.find((graphic) => graphic.id === 'm1')).toMatchObject({
      kind: 'model',
      model: { uri: '/model.glb', scale: 1, renderMode: 'primitive' },
    });
  });

  it('mounts graphic layers through the layer channel and updates on visibility/list changes', () => {
    const { adapter, layerHandles } = createAdapter();
    const layer = createGraphicLayer({ id: 'graphics' });
    layer.addPoint({ id: 'p1', position: [120, 30] });
    layer.addModel({ id: 'm1', position: [120, 30, 100], uri: '/model.glb' });

    layer._mount?.(adapter);
    expect(adapter.mountLayer).toHaveBeenCalledTimes(1);
    expect(adapter.mountFeature).not.toHaveBeenCalled();

    layer.hide();
    expect(layerHandles[0]?.update).toHaveBeenCalled();

    layer.show();
    expect(layerHandles[0]?.update).toHaveBeenCalled();

    expect(layer.removeGraphic('p1')).toBe(true);
    expect(layerHandles[0]?.update).toHaveBeenCalled();

    layer.clear();
    expect(layer.list()).toHaveLength(0);
    expect(layerHandles[0]?.update).toHaveBeenCalled();

    layer._unmount?.(adapter);
    expect(adapter.unmountLayer).toHaveBeenCalledTimes(1);
  });

  it('falls back to per-feature mounting when layer mounting is unavailable', () => {
    const featureHandles: Array<Updatable<FeatureRenderSpec>> = [];
    const adapter: EngineAdapter = {
      mountFeature: vi.fn(() => {
        const handle = createMountHandle<FeatureRenderSpec>();
        featureHandles.push(handle);
        return handle;
      }),
      unmountFeature: vi.fn(),
    };
    const layer = createGraphicLayer({ id: 'graphics' });
    layer.addPoint({ id: 'p1', position: [120, 30] });
    layer.addModel({ id: 'm1', position: [120, 30, 100], uri: '/model.glb' });

    layer._mount?.(adapter);
    expect(adapter.mountFeature).toHaveBeenCalledTimes(2);

    layer.hide();
    expect(adapter.unmountFeature).toHaveBeenCalledTimes(2);
  });
});

describe('DataLayer family', () => {
  it('builds generic data layer specs without forcing subtype-specific core kinds', () => {
    const layer = createDataLayer({
      id: 'data-1',
      sourceType: 'custom',
      payload: { url: '/data.bin' },
      options: { retry: 2 },
    });

    expect(layer.type).toBe('data');
    expect(layer.toRenderSpec()).toEqual({
      id: 'data-1',
      kind: 'data',
      visible: true,
      opacity: 1,
      zIndex: 0,
      sourceType: 'custom',
      payload: { url: '/data.bin' },
      options: { retry: 2 },
    });
  });

  it('maps GeoJSON, tileset, point cloud and legacy vector into the data-layer branch', () => {
    const geo = createGeoJsonLayer({ id: 'geo', data: { type: 'FeatureCollection', features: [] } });
    const tileset = createTilesetLayer({ id: 'tileset', url: 'https://example.com/tileset.json' });
    const pointCloud = createPointCloudLayer({ id: 'pc', url: 'https://example.com/point-cloud.pnts' });
    const vector = createVectorLayer({ id: 'legacy-vector', data: { type: 'FeatureCollection', features: [] } });

    expect(geo.sourceType).toBe('geojson');
    expect(geo.toRenderSpec()).toMatchObject({ kind: 'data', sourceType: 'geojson' });

    expect(tileset.type).toBe('data');
    expect(tileset.sourceType).toBe('tileset');
    expect(tileset.toRenderSpec()).toMatchObject({
      kind: 'data',
      sourceType: 'tileset',
      payload: { url: 'https://example.com/tileset.json' },
    });

    expect(pointCloud.toRenderSpec()).toMatchObject({
      kind: 'data',
      sourceType: 'point-cloud',
      payload: { url: 'https://example.com/point-cloud.pnts' },
    });

    expect(vector.type).toBe('data');
    expect(vector.legacyType).toBe('vector');
    expect(vector.toRenderSpec()).toMatchObject({ kind: 'data', sourceType: 'geojson' });
  });

  it('mounts through the layer channel and forwards reactive updates to the handle', () => {
    const { adapter, layerHandles } = createAdapter();
    const layer = createTilesetLayer({ id: 'tileset', url: 'https://example.com/tileset.json' });

    layer._mount?.(adapter);
    expect(adapter.mountLayer).toHaveBeenCalledTimes(1);

    layer.opacity(0.4);
    expect(layerHandles[0]?.update).toHaveBeenCalled();

    layer._unmount?.(adapter);
    expect(adapter.unmountLayer).toHaveBeenCalledTimes(1);
  });
});
