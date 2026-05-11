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

  it('mounts attached labels and independent text as entities', async () => {
    const adapter = createCesiumAdapter();
    await adapter.initialize?.('test-container');
    const viewer = adapter.unsafeNative?.() as any;

    const pointHandle = adapter.mountFeature?.({
      id: 'point-with-label',
      kind: 'point',
      position: [120, 30],
      point: { pixelSize: 12 },
      label: { text: 'Point label', pixelOffset: [0, -16] },
    });

    const textHandle = adapter.mountFeature?.({
      id: 'text-only',
      kind: 'text',
      position: [121, 31],
      label: { text: 'Only text' },
    });

    await Promise.resolve();
    expect(viewer?.entities.add).toHaveBeenCalledWith(expect.objectContaining({
      id: 'point-with-label',
      point: { pixelSize: 12 },
      label: { text: 'Point label', pixelOffset: expect.objectContaining({ x: 0, y: -16 }) },
    }));
    expect(viewer?.entities.add).toHaveBeenCalledWith(expect.objectContaining({
      id: 'text-only',
      label: { text: 'Only text' },
    }));

    pointHandle?.dispose();
    textHandle?.dispose();
    await adapter.dispose?.();
  });

  it('batches primitive graphics at the graphic layer level', async () => {
    const adapter = createCesiumAdapter();
    await adapter.initialize?.('test-container');
    const viewer = adapter.unsafeNative?.() as any;

    const handle = adapter.mountLayer?.({
      id: 'graphics',
      kind: 'graphic',
      renderMode: 'primitive',
      graphics: [
        {
          id: 'p1',
          kind: 'point',
          position: [120, 30],
          point: { pixelSize: 10 },
          label: { text: 'P1' },
        },
        {
          id: 'line-1',
          kind: 'polyline',
          positions: [[120, 30], [121, 31]],
          polyline: { width: 2 },
        },
        {
          id: 'text-1',
          kind: 'text',
          position: [122, 32],
          label: { text: 'Text' },
        },
        {
          id: 'm1',
          kind: 'model',
          position: [123, 33, 10],
          model: { uri: '/model.glb', renderMode: 'entity' },
        },
      ],
    });

    await Promise.resolve();
    expect(viewer?.scene.primitives.add).toHaveBeenCalledWith(expect.objectContaining({ id: 'graphics:point' }));
    expect(viewer?.scene.primitives.add).toHaveBeenCalledWith(expect.objectContaining({ id: 'graphics:label' }));
    expect(viewer?.scene.primitives.add).toHaveBeenCalledWith(expect.objectContaining({ id: 'graphics:polyline' }));
    expect(viewer?.entities.add).toHaveBeenCalledWith(expect.objectContaining({
      id: 'm1',
      model: { uri: '/model.glb' },
    }));

    const labelPrimitive = viewer?.scene.primitives.add.mock.calls
      .map((call: any[]) => call[0])
      .find((primitive: any) => primitive.id === 'graphics:label');
    expect(labelPrimitive.items).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'p1', text: 'P1' }),
      expect.objectContaining({ id: 'text-1', text: 'Text' }),
    ]));

    handle?.dispose();
    await adapter.dispose?.();
  });

  it('normalizes label screen vector tuples for Cesium', async () => {
    const adapter = createCesiumAdapter();
    await adapter.initialize?.('test-container');
    const viewer = adapter.unsafeNative?.() as any;

    const handle = adapter.mountFeature?.({
      id: 'offset-label',
      kind: 'point',
      position: [120, 30],
      label: {
        text: 'Offset label',
        pixelOffset: [4, -20],
        eyeOffset: [0, 0, 8],
      },
    });

    await Promise.resolve();
    expect(viewer?.entities.add).toHaveBeenCalledWith(expect.objectContaining({
      id: 'offset-label',
      label: expect.objectContaining({
        pixelOffset: expect.objectContaining({ x: 4, y: -20 }),
        eyeOffset: expect.objectContaining({ x: 0, y: 0, z: 8 }),
      }),
    }));

    handle?.dispose();
    await adapter.dispose?.();
  });
});
