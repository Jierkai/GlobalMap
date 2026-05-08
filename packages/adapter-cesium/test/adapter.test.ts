import { describe, expect, it } from 'vitest';
import * as Cesium from 'cesium';
import { createCesiumAdapter } from '../src/adapter';

describe('createCesiumAdapter', () => {
  it('mounts GeoJSON and tileset data layers through the layer channel', async () => {
    const adapter = createCesiumAdapter();
    await adapter.initialize?.('test-container');

    const geo = adapter.mountLayer?.({
      id: 'geo',
      kind: 'data',
      sourceType: 'geojson',
      payload: { type: 'FeatureCollection', features: [] },
      visible: true,
    });

    await Promise.resolve();
    expect((Cesium as any).GeoJsonDataSource.load).toHaveBeenCalledWith(
      { type: 'FeatureCollection', features: [] },
      undefined,
    );

    const tileset = adapter.mountLayer?.({
      id: 'tileset',
      kind: 'data',
      sourceType: 'tileset',
      payload: { url: 'https://example.com/tileset.json' },
      options: { maximumScreenSpaceError: 8 },
      visible: false,
    });

    await Promise.resolve();
    expect(Cesium.Cesium3DTileset.fromUrl).toHaveBeenCalledWith(
      'https://example.com/tileset.json',
      { maximumScreenSpaceError: 8 },
    );

    geo?.dispose();
    tileset?.dispose();
    await adapter.dispose?.();
  });

  it('mounts model features by renderMode', async () => {
    const adapter = createCesiumAdapter();
    await adapter.initialize?.('test-container');
    const viewer = adapter.unsafeNative?.() as any;

    const entityHandle = adapter.mountFeature?.({
      id: 'model-entity',
      kind: 'model',
      position: [120, 30, 100],
      model: { uri: '/entity.glb', renderMode: 'entity' },
    });

    const primitiveHandle = adapter.mountFeature?.({
      id: 'model-primitive',
      kind: 'model',
      position: [121, 31, 120],
      model: { uri: '/primitive.glb', renderMode: 'primitive' },
    });

    await Promise.resolve();
    expect(viewer?.entities.add).toHaveBeenCalledWith(expect.objectContaining({
      id: 'model-entity',
      model: { uri: '/entity.glb' },
    }));
    expect(viewer?.scene.primitives.add).toHaveBeenCalledWith(expect.objectContaining({
      id: 'model-primitive',
      model: { uri: '/primitive.glb', renderMode: 'primitive' },
    }));

    entityHandle?.dispose();
    primitiveHandle?.dispose();
    await adapter.dispose?.();
  });
});
