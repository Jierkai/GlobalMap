import { describe, expect, it } from 'vitest';
import * as Cesium from 'cesium';
import { createCesiumAdapter, __test__ } from '../src';

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

  it('coalesces primitive model feature updates until flush', async () => {
    const adapter = createCesiumAdapter();
    await adapter.initialize?.('test-container');

    const handle = adapter.mountFeature?.({
      id: 'model-primitive-update',
      kind: 'model',
      position: [120, 30, 10],
      model: { uri: '/initial.glb', renderMode: 'primitive' },
    });

    await Promise.resolve();
    const primitive = handle?.unsafeNative?.() as any;
    expect(primitive?.model?.uri).toBe('/initial.glb');

    handle?.update?.({ model: { uri: '/first.glb', renderMode: 'primitive' } });
    handle?.update?.({ model: { uri: '/final.glb', renderMode: 'primitive' } });
    expect(primitive?.model?.uri).toBe('/initial.glb');

    __test__.flushUpdates();
    expect(primitive?.model?.uri).toBe('/final.glb');

    handle?.dispose();
    await adapter.dispose?.();
  });

  it('coalesces batched primitive feature updates until flush', async () => {
    const adapter = createCesiumAdapter();
    await adapter.initialize?.('test-container');

    const handle = adapter.mountFeature?.({
      id: 'point-primitive-update',
      kind: 'point',
      renderMode: 'primitive' as any,
      position: [120, 30],
      point: { pixelSize: 8 },
    });

    await Promise.resolve();
    const pointPrimitive = (handle?.unsafeNative?.() as any[])
      .find((primitive: any) => primitive.id === 'point-primitive-update:point');
    expect(pointPrimitive.items).toEqual([
      expect.objectContaining({ id: 'point-primitive-update', pixelSize: 8 }),
    ]);

    handle?.update?.({ point: { pixelSize: 12 } });
    handle?.update?.({ point: { pixelSize: 16 } });
    expect(pointPrimitive.items).toEqual([
      expect.objectContaining({ id: 'point-primitive-update', pixelSize: 8 }),
    ]);

    __test__.flushUpdates();
    expect(pointPrimitive.items).toEqual([
      expect.objectContaining({ id: 'point-primitive-update', pixelSize: 16 }),
    ]);

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

  it('applies scene center/resolution/background and bootstraps terrain/basemaps/layers from core DTO', async () => {
    const adapter = createCesiumAdapter();
    await adapter.initialize?.('test-container', {
      scene: {
        center: { lng: 121.5, lat: 31.2, alt: 1000, heading: 90, pitch: -45, roll: 0 },
        resolutionScale: 1.5,
        bgType: 'color',
        bgColor: '#112233',
      },
      terrain: {
        url: 'https://example.com/terrain',
        requestVertexNormals: true,
      },
      basemaps: [
        {
          id: 'base-gaode',
          provider: 'gaode',
          style: 'vec',
        },
        {
          id: 'base-xyz',
          kind: 'imagery',
          provider: { type: 'xyz', url: 'https://a/{z}/{x}/{y}.png' },
        },
      ],
      layers: [
        {
          id: 'preload-geo',
          kind: 'data',
          sourceType: 'geojson',
          payload: { type: 'FeatureCollection', features: [] },
        },
      ],
    });

    const viewer = adapter.unsafeNative?.() as any;
    expect(viewer?.camera.setView).toHaveBeenCalledTimes(1);
    expect(viewer?.camera.setView).toHaveBeenCalledWith(expect.objectContaining({
      destination: expect.objectContaining({ x: 121.5, y: 31.2, z: 1000 }),
      orientation: expect.objectContaining({
        heading: Math.PI / 2,
        pitch: -Math.PI / 4,
        roll: 0,
      }),
    }));
    expect(viewer?.resolutionScale).toBe(1.5);
    expect((Cesium as any).Color.fromCssColorString).toHaveBeenCalledWith('#112233');
    expect(viewer?.scene.backgroundColor).toEqual({ __css: '#112233' });
    expect(viewer?.imageryLayers.addImageryProvider).toHaveBeenCalledWith(expect.objectContaining({
      url: expect.stringContaining('autonavi.com'),
    }));
    expect(viewer?.imageryLayers.addImageryProvider).toHaveBeenCalledWith(expect.objectContaining({
      url: 'https://a/{z}/{x}/{y}.png',
    }));

    expect((Cesium as any).CesiumTerrainProvider.fromUrl).toHaveBeenCalledWith(
      'https://example.com/terrain',
      { requestVertexNormals: true },
    );
    await Promise.resolve();
    expect((Cesium as any).GeoJsonDataSource.load).toHaveBeenCalledWith(
      { type: 'FeatureCollection', features: [] },
      undefined,
    );

    await adapter.dispose?.();
  });

  it('mounts bing preset basemaps through the async imagery path', async () => {
    const adapter = createCesiumAdapter();
    await adapter.initialize?.('test-container', {
      basemaps: [
        {
          id: 'base-bing',
          provider: 'bing',
          key: 'bing-key',
          style: 'AERIAL',
          culture: 'zh-CN',
        },
      ],
    });

    const viewer = adapter.unsafeNative?.() as any;
    expect((Cesium as any).BingMapsImageryProvider.fromUrl).toHaveBeenCalledWith(
      'https://dev.virtualearth.net',
      expect.objectContaining({
        key: 'bing-key',
        mapStyle: 'AERIAL',
        culture: 'zh-CN',
      }),
    );
    expect((Cesium as any).ImageryLayer.fromProviderAsync).toHaveBeenCalledTimes(1);
    expect(viewer?.imageryLayers.add).toHaveBeenCalledTimes(1);

    await adapter.dispose?.();
  });

  it('supports bgType image with skybox sources and defaults bgType to skybox', async () => {
    const adapter = createCesiumAdapter();
    const sources = {
      positiveX: '/px.jpg',
      negativeX: '/nx.jpg',
      positiveY: '/py.jpg',
      negativeY: '/ny.jpg',
      positiveZ: '/pz.jpg',
      negativeZ: '/nz.jpg',
    };
    await adapter.initialize?.('test-container', {
      scene: {
        bgImage: sources,
      },
    });
    const viewer = adapter.unsafeNative?.() as any;
    expect(viewer?.scene.skyBox).toEqual(expect.objectContaining({ sources }));
    await adapter.dispose?.();
  });
});
