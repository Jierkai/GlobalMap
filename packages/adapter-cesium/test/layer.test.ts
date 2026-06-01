import { describe, it, expect } from 'vitest';
import {
  bridgeAdd3DTileset,
  bridgeAddImageryLayer,
  bridgeRemove3DTileset,
  bridgeRemoveImageryLayer,
} from '../src/layer';
import { createViewer } from '../src/viewer';
import * as Cesium from 'cesium';

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
