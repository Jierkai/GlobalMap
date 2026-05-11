import { describe, expect, it, vi } from 'vitest';
import type { EngineAdapter, FeatureRenderSpec, LayerRenderSpec, Updatable } from '@cgx/core';
import {
  ImageryLayer,
  TerrainLayer,
  DataLayer,
  GeoJsonLayer,
  PointCloudLayer,
  TilesetLayer,
  VectorLayer,
  GraphicLayer,
  BaseLayer,
} from '../src/index.js';
import type { ImageryProvider } from '../src/provider/ImageryProvider.js';
import { signal } from '@cgx/reactive';

// ─── 测试辅助工具 ───

function createMountHandle<T>(): Updatable<T> {
  return {
    update: vi.fn(),
    dispose: vi.fn(),
  };
}

function createMockProvider(url = 'https://example.com/{z}/{x}/{y}.png'): ImageryProvider {
  return {
    ready: signal(true),
    toRenderSpec() {
      return { type: 'xyz', url };
    },
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

// ─── BaseLayer 抽象类测试 ───

describe('BaseLayer', () => {
  it('cannot be instantiated directly (abstract class)', () => {
    expect(BaseLayer).toBeDefined();
  });
});

// ─── ImageryLayer 类测试 ───

describe('ImageryLayer class', () => {
  it('constructs with default values', () => {
    const provider = createMockProvider();
    const layer = new ImageryLayer({ provider });

    expect(layer.id).toBeDefined();
    expect(layer.type).toBe('imagery');
    expect(layer.visible()).toBe(true);
    expect(layer.opacity()).toBe(1);
    expect(layer.zIndex()).toBe(0);
    expect(layer.provider).toBe(provider);
  });

  it('constructs with custom options', () => {
    const provider = createMockProvider();
    const layer = new ImageryLayer({
      id: 'custom-imagery',
      provider,
      visible: false,
      opacity: 0.5,
      zIndex: 10,
    });

    expect(layer.id).toBe('custom-imagery');
    expect(layer.visible()).toBe(false);
    expect(layer.opacity()).toBe(0.5);
    expect(layer.zIndex()).toBe(10);
  });

  it('generates UUID when id is undefined', () => {
    const layer1 = new ImageryLayer({ provider: createMockProvider() });
    const layer2 = new ImageryLayer({ provider: createMockProvider() });

    expect(layer1.id).not.toBe(layer2.id);
    expect(layer1.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
  });

  it('outputs correct render spec before mount', () => {
    const provider = createMockProvider();
    const layer = new ImageryLayer({ id: 'img-1', provider });

    const spec = layer.toRenderSpec();
    expect(spec).toEqual({
      id: 'img-1',
      kind: 'imagery',
      visible: true,
      opacity: 1,
      zIndex: 0,
      provider: null, // 未解析
    });
  });

  it('reactive state changes are reflected in spec', () => {
    const layer = new ImageryLayer({ id: 'img-r', provider: createMockProvider() });

    layer.visible(false);
    layer.opacity(0.3);
    layer.zIndex(5);

    const spec = layer.toRenderSpec();
    expect(spec.visible).toBe(false);
    expect(spec.opacity).toBe(0.3);
    expect(spec.zIndex).toBe(5);
  });

  it('show/hide toggles visibility signal', () => {
    const layer = new ImageryLayer({ provider: createMockProvider() });

    expect(layer.visible()).toBe(true);
    layer.hide();
    expect(layer.visible()).toBe(false);
    layer.show();
    expect(layer.visible()).toBe(true);
  });

  it('raw returns null before mount', () => {
    const layer = new ImageryLayer({ provider: createMockProvider() });
    expect(layer.raw()).toBeNull();
  });

  it('mounts and unmounts via adapter', async () => {
    const { adapter, layerHandles } = createAdapter();
    const provider = createMockProvider();
    const layer = new ImageryLayer({ id: 'img-m', provider });

    await layer._mount(adapter);
    expect(adapter.mountLayer).toHaveBeenCalledTimes(1);
    expect(layerHandles).toHaveLength(1);
    expect(layer.raw()).toBe(layerHandles[0]);

    await layer._unmount(adapter);
    expect(adapter.unmountLayer).toHaveBeenCalledTimes(1);
    expect(layerHandles[0]?.dispose).toHaveBeenCalledTimes(1);
    expect(layer.raw()).toBeNull();
  });

  it('resolves async provider on mount', async () => {
    const { adapter } = createAdapter();
    const provider = Promise.resolve(createMockProvider());
    const layer = new ImageryLayer({ id: 'img-async', provider });

    await layer._mount(adapter);
    expect(adapter.mountLayer).toHaveBeenCalledTimes(1);
    const spec = layer.toRenderSpec();
    expect(spec).toMatchObject({
      provider: { type: 'xyz', url: 'https://example.com/{z}/{x}/{y}.png' },
    });
  });

  it('on() emits mounted and removed events', () => {
    const layer = new ImageryLayer({ provider: createMockProvider() });
    const mountedCb = vi.fn();
    const removedCb = vi.fn();

    layer.on('mounted', mountedCb);
    layer.on('removed', removedCb);

    layer._emitMounted();
    expect(mountedCb).toHaveBeenCalledTimes(1);

    layer._emitRemoved();
    expect(removedCb).toHaveBeenCalledTimes(1);
  });

  it('remove() delegates to manager ref', () => {
    const layer = new ImageryLayer({ id: 'img-rm', provider: createMockProvider() });
    const manager = { remove: vi.fn() };
    layer._setManager(manager);

    layer.remove();
    expect(manager.remove).toHaveBeenCalledWith('img-rm');
  });
});

// ─── TerrainLayer 类测试 ───

describe('TerrainLayer class', () => {
  it('constructs with default values', () => {
    const provider = { type: 'cesium-terrain' };
    const layer = new TerrainLayer({ provider });

    expect(layer.type).toBe('terrain');
    expect(layer.visible()).toBe(true);
    expect(layer.provider).toBe(provider);
  });

  it('constructs with visible false', () => {
    const layer = new TerrainLayer({ provider: {}, visible: false });
    expect(layer.visible()).toBe(false);
  });

  it('outputs correct render spec', () => {
    const layer = new TerrainLayer({ id: 'terr-1', provider: { type: 'custom' } });

    const spec = layer.toRenderSpec();
    expect(spec).toEqual({
      id: 'terr-1',
      kind: 'terrain',
      visible: true,
      opacity: 1,
      zIndex: 0,
      provider: { type: 'custom' },
    });
  });

  it('mounts and unmounts via adapter', async () => {
    const { adapter, layerHandles } = createAdapter();
    const layer = new TerrainLayer({ id: 'terr-m', provider: {} });

    await layer._mount(adapter);
    expect(adapter.mountLayer).toHaveBeenCalledTimes(1);

    await layer._unmount(adapter);
    expect(adapter.unmountLayer).toHaveBeenCalledTimes(1);
  });
});

// ─── DataLayer 类测试 ───

describe('DataLayer class', () => {
  it('constructs with all options', () => {
    const layer = new DataLayer({
      id: 'data-1',
      sourceType: 'custom',
      payload: { url: '/data.bin' },
      options: { retry: 2 },
      visible: false,
      opacity: 0.8,
      zIndex: 3,
    });

    expect(layer.type).toBe('data');
    expect(layer.sourceType).toBe('custom');
    expect(layer.payload).toEqual({ url: '/data.bin' });
    expect(layer.options).toEqual({ retry: 2 });
    expect(layer.visible()).toBe(false);
    expect(layer.opacity()).toBe(0.8);
    expect(layer.zIndex()).toBe(3);
  });

  it('outputs correct render spec', () => {
    const layer = new DataLayer({
      id: 'data-spec',
      sourceType: 'custom',
      payload: { url: '/data.bin' },
      options: { retry: 2 },
    });

    expect(layer.toRenderSpec()).toEqual({
      id: 'data-spec',
      kind: 'data',
      visible: true,
      opacity: 1,
      zIndex: 0,
      sourceType: 'custom',
      payload: { url: '/data.bin' },
      options: { retry: 2 },
    });
  });

  it('omits undefined payload and options from spec', () => {
    const layer = new DataLayer({ id: 'data-min', sourceType: 'minimal' });
    const spec = layer.toRenderSpec();

    expect(spec).toEqual({
      id: 'data-min',
      kind: 'data',
      visible: true,
      opacity: 1,
      zIndex: 0,
      sourceType: 'minimal',
    });
    expect('payload' in spec).toBe(false);
    expect('options' in spec).toBe(false);
  });

  it('mounts through the layer channel', () => {
    const { adapter, layerHandles } = createAdapter();
    const layer = new DataLayer({
      id: 'data-mount',
      sourceType: 'custom',
      payload: { url: '/data.bin' },
    });

    layer._mount(adapter);
    expect(adapter.mountLayer).toHaveBeenCalledTimes(1);
    expect(layer.raw()).toBe(layerHandles[0]);

    layer._unmount(adapter);
    expect(adapter.unmountLayer).toHaveBeenCalledTimes(1);
  });

  it('forwards reactive updates to mount handle', () => {
    const { adapter, layerHandles } = createAdapter();
    const layer = new DataLayer({ id: 'data-reactive', sourceType: 'custom' });

    layer._mount(adapter);
    layer.opacity(0.4);
    expect(layerHandles[0]?.update).toHaveBeenCalled();
  });
});

// ─── GeoJsonLayer 类测试 ───

describe('GeoJsonLayer class', () => {
  it('constructs with geojson source type', () => {
    const data = { type: 'FeatureCollection', features: [] };
    const layer = new GeoJsonLayer({ data });

    expect(layer.type).toBe('data');
    expect(layer.sourceType).toBe('geojson');
    expect(layer.data).toBe(data);
    expect(layer.payload).toBe(data);
  });

  it('outputs correct render spec', () => {
    const data = { type: 'FeatureCollection', features: [] };
    const layer = new GeoJsonLayer({ id: 'geo-spec', data });

    expect(layer.toRenderSpec()).toMatchObject({
      id: 'geo-spec',
      kind: 'data',
      sourceType: 'geojson',
      payload: data,
    });
  });

  it('instanceof chain is correct', () => {
    const layer = new GeoJsonLayer({ data: {} });
    expect(layer).toBeInstanceOf(GeoJsonLayer);
    expect(layer).toBeInstanceOf(DataLayer);
    expect(layer).toBeInstanceOf(BaseLayer);
  });
});

// ─── PointCloudLayer 类测试 ───

describe('PointCloudLayer class', () => {
  it('constructs with url', () => {
    const layer = new PointCloudLayer({ url: 'https://example.com/point-cloud.pnts' });

    expect(layer.type).toBe('data');
    expect(layer.sourceType).toBe('point-cloud');
    expect(layer.url).toBe('https://example.com/point-cloud.pnts');
    expect(layer.payload).toEqual({ url: 'https://example.com/point-cloud.pnts' });
  });

  it('outputs correct render spec', () => {
    const layer = new PointCloudLayer({
      id: 'pc-1',
      url: 'https://example.com/point-cloud.pnts',
    });

    expect(layer.toRenderSpec()).toMatchObject({
      id: 'pc-1',
      kind: 'data',
      sourceType: 'point-cloud',
      payload: { url: 'https://example.com/point-cloud.pnts' },
    });
  });

  it('instanceof chain is correct', () => {
    const layer = new PointCloudLayer({ url: 'https://example.com/pc.pnts' });
    expect(layer).toBeInstanceOf(PointCloudLayer);
    expect(layer).toBeInstanceOf(DataLayer);
    expect(layer).toBeInstanceOf(BaseLayer);
  });
});

// ─── TilesetLayer 类测试 ───

describe('TilesetLayer class', () => {
  it('constructs with url', () => {
    const layer = new TilesetLayer({ url: 'https://example.com/tileset.json' });

    expect(layer.type).toBe('data');
    expect(layer.sourceType).toBe('tileset');
    expect(layer.url).toBe('https://example.com/tileset.json');
  });

  it('outputs correct render spec', () => {
    const layer = new TilesetLayer({
      id: 'ts-1',
      url: 'https://example.com/tileset.json',
    });

    expect(layer.toRenderSpec()).toMatchObject({
      id: 'ts-1',
      kind: 'data',
      sourceType: 'tileset',
      payload: { url: 'https://example.com/tileset.json' },
    });
  });

  it('mounts and forwards reactive updates', () => {
    const { adapter, layerHandles } = createAdapter();
    const layer = new TilesetLayer({ id: 'ts-m', url: 'https://example.com/tileset.json' });

    layer._mount(adapter);
    expect(adapter.mountLayer).toHaveBeenCalledTimes(1);

    layer.opacity(0.4);
    expect(layerHandles[0]?.update).toHaveBeenCalled();

    layer._unmount(adapter);
    expect(adapter.unmountLayer).toHaveBeenCalledTimes(1);
  });

  it('instanceof chain is correct', () => {
    const layer = new TilesetLayer({ url: 'https://example.com/tileset.json' });
    expect(layer).toBeInstanceOf(TilesetLayer);
    expect(layer).toBeInstanceOf(DataLayer);
    expect(layer).toBeInstanceOf(BaseLayer);
  });
});

// ─── VectorLayer 类测试 ───

describe('VectorLayer class', () => {
  it('constructs with data', () => {
    const data = { type: 'FeatureCollection', features: [] };
    const layer = new VectorLayer({ data });

    expect(layer.type).toBe('data');
    expect(layer.sourceType).toBe('geojson');
    expect(layer.legacyType).toBe('vector');
    expect(layer.data).toBe(data);
  });

  it('outputs correct render spec', () => {
    const data = { type: 'FeatureCollection', features: [] };
    const layer = new VectorLayer({ id: 'vec-1', data });

    expect(layer.toRenderSpec()).toMatchObject({
      id: 'vec-1',
      kind: 'data',
      sourceType: 'geojson',
    });
  });

  it('instanceof chain is correct', () => {
    const layer = new VectorLayer({ data: {} });
    expect(layer).toBeInstanceOf(VectorLayer);
    expect(layer).toBeInstanceOf(GeoJsonLayer);
    expect(layer).toBeInstanceOf(DataLayer);
    expect(layer).toBeInstanceOf(BaseLayer);
  });
});

// ─── GraphicLayer 类测试 ───

describe('GraphicLayer class', () => {
  it('constructs with default values', () => {
    const layer = new GraphicLayer();

    expect(layer.type).toBe('graphic');
    expect(layer.visible()).toBe(true);
    expect(layer.opacity()).toBe(1);
    expect(layer.zIndex()).toBe(0);
    expect(layer.clustering()).toBeUndefined();
    expect(layer.renderMode()).toBe('entity');
  });

  it('constructs with all options', () => {
    const layer = new GraphicLayer({
      id: 'g-layer',
      visible: false,
      opacity: 0.7,
      zIndex: 5,
      clustering: { enabled: true, pixelRange: 24 },
      renderMode: 'primitive',
    });

    expect(layer.id).toBe('g-layer');
    expect(layer.visible()).toBe(false);
    expect(layer.opacity()).toBe(0.7);
    expect(layer.zIndex()).toBe(5);
    expect(layer.clustering()).toEqual({ enabled: true, pixelRange: 24 });
    expect(layer.renderMode()).toBe('primitive');
  });

  it('adds and retrieves graphics', () => {
    const layer = new GraphicLayer({ id: 'g-add' });

    const point = layer.addPoint({ id: 'p1', position: [120, 30] });
    const polyline = layer.addPolyline({ id: 'line-1', positions: [[120, 30], [121, 31]] });
    const polygon = layer.addPolygon({ id: 'poly-1', positions: [[120, 30], [121, 31], [122, 32]] });
    const model = layer.addModel({ id: 'm1', position: [120, 30, 100], uri: '/model.glb' });
    const text = layer.addText({ id: 't1', position: [121, 31], text: 'Hello' });

    expect(layer.getById('p1')).toBe(point);
    expect(layer.getById('line-1')).toBe(polyline);
    expect(layer.getById('poly-1')).toBe(polygon);
    expect(layer.getById('m1')).toBe(model);
    expect(layer.getById('t1')).toBe(text);
    expect(layer.list()).toHaveLength(5);
  });

  it('find() searches by predicate', () => {
    const layer = new GraphicLayer();
    layer.addPoint({ id: 'p1', position: [120, 30] });
    layer.addPoint({ id: 'p2', position: [121, 31] });

    const found = layer.find((g) => g.id === 'p2');
    expect(found?.id).toBe('p2');

    const notFound = layer.find((g) => g.id === 'p999');
    expect(notFound).toBeUndefined();
  });

  it('removeGraphic() removes by id or reference', () => {
    const layer = new GraphicLayer();
    const point = layer.addPoint({ id: 'p1', position: [120, 30] });
    layer.addPoint({ id: 'p2', position: [121, 31] });

    expect(layer.removeGraphic('p1')).toBe(true);
    expect(layer.getById('p1')).toBeUndefined();
    expect(layer.list()).toHaveLength(1);

    expect(layer.removeGraphic(point)).toBe(false); // 已移除
    expect(layer.removeGraphic('p999')).toBe(false); // 不存在
  });

  it('clear() removes all graphics', () => {
    const layer = new GraphicLayer();
    layer.addPoint({ id: 'p1', position: [120, 30] });
    layer.addPoint({ id: 'p2', position: [121, 31] });
    layer.addPolyline({ id: 'line-1', positions: [[120, 30], [121, 31]] });

    layer.clear();
    expect(layer.list()).toHaveLength(0);
    expect(layer.getById('p1')).toBeUndefined();
  });

  it('update() modifies a graphic in place', () => {
    const layer = new GraphicLayer();
    const point = layer.addPoint({ id: 'p1', position: [120, 30] });

    const updated = layer.update('p1', (g) => {
      // 更新操作
    });
    expect(updated).toBe(point);

    const notFound = layer.update('p999', () => {});
    expect(notFound).toBeUndefined();
  });

  it('outputs correct render spec with clustering', () => {
    const layer = new GraphicLayer({
      id: 'g-spec',
      clustering: { enabled: true, pixelRange: 24, minimumClusterSize: 3 },
      renderMode: 'primitive',
    });
    layer.addPoint({ id: 'p1', position: [120, 30] });

    const spec = layer.toRenderSpec();
    expect(spec).toMatchObject({
      kind: 'graphic',
      clustering: { enabled: true, pixelRange: 24, minimumClusterSize: 3 },
      renderMode: 'primitive',
    });
    expect((spec as any).graphics).toHaveLength(1);
  });

  it('mounts through the layer channel and updates on changes', () => {
    const { adapter, layerHandles } = createAdapter();
    const layer = new GraphicLayer({ id: 'g-mount' });
    layer.addPoint({ id: 'p1', position: [120, 30] });

    layer._mount(adapter);
    expect(adapter.mountLayer).toHaveBeenCalledTimes(1);
    expect(adapter.mountFeature).not.toHaveBeenCalled();

    layer.hide();
    expect(layerHandles[0]?.update).toHaveBeenCalled();

    layer.show();
    expect(layerHandles[0]?.update).toHaveBeenCalled();

    layer.removeGraphic('p1');
    expect(layerHandles[0]?.update).toHaveBeenCalled();

    layer._unmount(adapter);
    expect(adapter.unmountLayer).toHaveBeenCalledTimes(1);
  });

  it('falls back to per-feature mounting when layer channel unavailable', () => {
    const featureHandles: Array<Updatable<FeatureRenderSpec>> = [];
    const adapter: EngineAdapter = {
      mountFeature: vi.fn(() => {
        const handle = createMountHandle<FeatureRenderSpec>();
        featureHandles.push(handle);
        return handle;
      }),
      unmountFeature: vi.fn(),
    };

    const layer = new GraphicLayer({ id: 'g-fallback' });
    layer.addPoint({ id: 'p1', position: [120, 30] });
    layer.addModel({ id: 'm1', position: [120, 30, 100], uri: '/model.glb' });

    layer._mount(adapter);
    expect(adapter.mountFeature).toHaveBeenCalledTimes(2);

    layer.hide();
    expect(adapter.unmountFeature).toHaveBeenCalledTimes(2);
  });

  it('raw() returns mount handle when mounted', () => {
    const { adapter, layerHandles } = createAdapter();
    const layer = new GraphicLayer({ id: 'g-raw' });

    layer._mount(adapter);
    expect(layer.raw()).toBe(layerHandles[0]);

    layer._unmount(adapter);
    expect(layer.raw()).toEqual([]);
  });
});

// ─── 边界情况测试 ───

describe('Edge cases', () => {
  it('mounting on null adapter is a no-op for ImageryLayer', async () => {
    const layer = new ImageryLayer({ provider: createMockProvider() });
    await layer._mount(null as unknown as EngineAdapter);
    expect(layer.raw()).toBeNull();
  });

  it('mounting on null adapter is a no-op for TerrainLayer', async () => {
    const layer = new TerrainLayer({ provider: {} });
    await layer._mount(null as unknown as EngineAdapter);
    expect(layer.raw()).toBeNull();
  });

  it('unmounting before mount is safe', async () => {
    const { adapter } = createAdapter();
    const layer = new ImageryLayer({ provider: createMockProvider() });

    // 不应抛出
    await layer._unmount(adapter);
  });

  it('duplicate graphic id replaces previous', () => {
    const layer = new GraphicLayer();
    layer.addPoint({ id: 'p1', position: [120, 30] });
    layer.addPoint({ id: 'p1', position: [121, 31] });

    expect(layer.list()).toHaveLength(1);
  });

  it('remove() without manager ref is a no-op', () => {
    const layer = new ImageryLayer({ provider: createMockProvider() });
    // 不应抛出
    layer.remove();
  });

  it('multiple unmount calls are safe', async () => {
    const { adapter } = createAdapter();
    const layer = new DataLayer({ sourceType: 'test' });

    layer._mount(adapter);
    await layer._unmount(adapter);
    // 二次卸载不应抛出
    await layer._unmount(adapter);
  });

  it('on() returns off function', () => {
    const layer = new ImageryLayer({ provider: createMockProvider() });
    const cb = vi.fn();

    const off = layer.on('mounted', cb);
    layer._emitMounted();
    expect(cb).toHaveBeenCalledTimes(1);

    off();
    layer._emitMounted();
    expect(cb).toHaveBeenCalledTimes(1); // 已取消
  });
});
