import { describe, it, expect, vi } from 'vitest';
import {
  bridgeAdd3DTileset,
  bridgeAddImageryLayer,
  bridgeRemove3DTileset,
  bridgeRemoveImageryLayer,
} from '../src/layer';
import { createViewer } from '../src/viewer';
import * as Cesium from 'cesium';
import { __test__ } from '../src';
import {
  createDataSourceLayerHandle,
  createGraphicLayerHandle,
  createTilesetLayerHandle,
} from '../src/handles/layer';

describe('layer bridge functions', () => {
  it('should add and remove imagery layer', () => {
    const handle = createViewer('test-container');
    const provider = new Cesium.UrlTemplateImageryProvider({ url: 'test' });
    const layer = bridgeAddImageryLayer(handle, provider);
    expect(layer).toBeDefined();
    
    const removed = bridgeRemoveImageryLayer(handle, layer!);
    expect(removed).toBe(true);
  });

  it('should add and remove 3D tileset', async () => {
    const handle = createViewer('test-container');
    const tileset = await bridgeAdd3DTileset(handle, 'http://test.tileset');
    expect(tileset).toBeDefined();
    
    const removed = bridgeRemove3DTileset(handle, tileset!);
    expect(removed).toBe(true);
  });
});

describe('LayerHandle update batching', () => {
  it('defers dataSource opacity updates until flush but keeps visibility sync', async () => {
    const viewer = createViewer('test-container');
    const handle = createDataSourceLayerHandle(viewer, {
      id: 'geo',
      kind: 'data',
      sourceType: 'geojson',
      payload: { type: 'FeatureCollection', features: [] },
      visible: true,
    });

    await Promise.resolve();
    await Promise.resolve();
    const raw = handle.unsafeNative?.() as Record<string, unknown>;

    handle.setOpacity?.(0.25);
    expect(raw.alpha).toBeUndefined();

    handle.setVisible?.(false);
    expect(raw.show).toBe(false);

    __test__.flushUpdates();
    expect(raw.alpha).toBe(0.25);
    expect(raw.show).toBe(false);

    handle.dispose();
  });

  it('defers tileset updates until flush but keeps visibility sync', async () => {
    const viewer = createViewer('test-container');
    const handle = createTilesetLayerHandle(viewer, {
      id: 'tileset',
      kind: 'data',
      sourceType: 'tileset',
      payload: { url: 'http://test.tileset' },
      visible: true,
    });

    await Promise.resolve();
    await Promise.resolve();
    const raw = handle.unsafeNative?.() as Record<string, unknown>;

    handle.update?.({ visible: false });
    expect(raw.show).toBe(true);

    __test__.flushUpdates();
    expect(raw.show).toBe(false);

    handle.setVisible?.(true);
    expect(raw.show).toBe(true);

    handle.dispose();
  });

  it('does not cancel async data attaches when visibility changes before mount resolves', async () => {
    const viewer = createViewer('test-container');
    const dataSource = createDataSourceLayerHandle(viewer, {
      id: 'geo-pending',
      kind: 'data',
      sourceType: 'geojson',
      payload: { type: 'FeatureCollection', features: [] },
      visible: true,
    });
    const tileset = createTilesetLayerHandle(viewer, {
      id: 'tileset-pending',
      kind: 'data',
      sourceType: 'tileset',
      payload: { url: 'http://pending.tileset' },
      visible: true,
    });

    dataSource.setVisible?.(false);
    tileset.setVisible?.(false);

    await Promise.resolve();
    await Promise.resolve();

    expect(dataSource.unsafeNative?.()).toEqual(expect.objectContaining({ show: false }));
    expect(tileset.unsafeNative?.()).toEqual(expect.objectContaining({ show: false }));

    dataSource.dispose();
    tileset.dispose();
  });

  it('coalesces graphic layer updates before syncing mounted graphics', () => {
    const viewer = createViewer('test-container');
    const featureHandle = { update: vi.fn(), dispose: vi.fn() };
    const mountFeature = vi.fn(() => featureHandle);
    const handle = createGraphicLayerHandle(
      viewer,
      {
        id: 'graphics',
        kind: 'graphic',
        renderMode: 'entity',
        graphics: [
          { id: 'p1', kind: 'point', position: { lng: 0, lat: 0 }, point: { pixelSize: 4 } },
        ],
      },
      mountFeature as any,
    );

    handle.setOpacity?.(0.4);
    handle.update?.({
      graphics: [
        { id: 'p1', kind: 'point', position: { lng: 1, lat: 1 }, point: { pixelSize: 9 } },
      ],
    });
    expect(featureHandle.update).not.toHaveBeenCalled();

    __test__.flushUpdates();
    expect(featureHandle.update).toHaveBeenCalledTimes(1);
    expect(featureHandle.update).toHaveBeenCalledWith(expect.objectContaining({
      id: 'p1',
      point: { pixelSize: 9 },
    }));

    handle.dispose();
  });
});
