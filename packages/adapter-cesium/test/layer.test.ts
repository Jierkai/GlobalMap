import { describe, it, expect } from 'vitest';
import { LayerBridge } from '../src/layer';
import { createViewer } from '../src/viewer';
import * as Cesium from 'cesium';

describe('LayerBridge', () => {
  it('should add and remove imagery layer', () => {
    const handle = createViewer('test-container');
    const provider = new Cesium.UrlTemplateImageryProvider({ url: 'test' });
    const layer = LayerBridge.addImageryLayer(handle, provider);
    expect(layer).toBeDefined();
    
    const removed = LayerBridge.removeImageryLayer(handle, layer!);
    expect(removed).toBe(true);
  });

  it('should add and remove 3D tileset', async () => {
    const handle = createViewer('test-container');
    const tileset = await LayerBridge.add3DTileset(handle, 'http://test.tileset');
    expect(tileset).toBeDefined();
    
    const removed = LayerBridge.remove3DTileset(handle, tileset!);
    expect(removed).toBe(true);
  });
});
