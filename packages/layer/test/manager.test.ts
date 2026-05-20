import { describe, it, expect, vi } from 'vitest';
import type { CgxViewer } from '@cgx/core';
import { Layers } from '../src/manager/LayerManager.js';
import { ImageryLayer } from '../src/layer/ImageryLayer.js';
import { createXyzProvider } from '../src/provider/xyz.js';
import { effect } from '@cgx/reactive';

const mocks = vi.hoisted(() => {
  const handle = { destroy: vi.fn() };
  const layerHandle = { dispose: vi.fn(), update: vi.fn() };
  const runtime = {
    bootstrap: vi.fn(),
    dispose: vi.fn(),
    mountLayer: vi.fn(() => layerHandle),
    unmountLayer: vi.fn((mounted) => mounted?.dispose()),
    unsafeNative: vi.fn(),
  };
  return {
    handle,
    layerHandle,
    runtime,
    createCesiumViewer: vi.fn(() => handle),
    createCesiumRuntime: vi.fn(() => runtime),
  };
});

vi.mock('@cgx/adapter-cesium', () => ({
  createViewer: mocks.createCesiumViewer,
  createCesiumRuntime: mocks.createCesiumRuntime,
}));

const mockViewer = {
  runtime: mocks.runtime,
} as unknown as CgxViewer;

describe('LayerManager and Layers', () => {
  it('should manage layer addition and removal', async () => {
    const layerManager = Layers.install(mockViewer);

    const provider = createXyzProvider({ url: 'http://test' });
    const layer = new ImageryLayer({ id: 'test-layer', provider });

    const listSignal = layerManager.list();
    expect(listSignal().length).toBe(0);

    layerManager.add(layer);
    expect(listSignal().length).toBe(1);
    expect(listSignal()[0].id).toBe('test-layer');

    layerManager.remove(layer);
    expect(listSignal().length).toBe(0);
  });

  it('should reorder layers', () => {
    const layerManager = Layers.install(mockViewer);

    const l1 = new ImageryLayer({ id: 'l1', provider: createXyzProvider({ url: '' }) });
    const l2 = new ImageryLayer({ id: 'l2', provider: createXyzProvider({ url: '' }) });
    
    layerManager.add(l1);
    layerManager.add(l2);
    
    expect(layerManager.list()().map(l => l.id)).toEqual(['l1', 'l2']);
    
    layerManager.moveTo('l1', 1);
    expect(layerManager.list()().map(l => l.id)).toEqual(['l2', 'l1']);
  });

  it('should trigger reactivity on visible/opacity changes', () => {
    const layer = new ImageryLayer({ id: 'l1', provider: createXyzProvider({ url: '' }) });
    let visibleVal = false;
    
    const disposer = effect(() => {
      visibleVal = layer.visible();
    });
    
    expect(visibleVal).toBe(true); // default true
    
    layer.hide();
    expect(visibleVal).toBe(false);
    expect(layer.visible()).toBe(false);
    
    layer.show();
    expect(visibleVal).toBe(true);

    let opacityVal = -1;
    const opacityDisposer = effect(() => {
       opacityVal = layer.opacity();
    });
    expect(opacityVal).toBe(1);
    layer.opacity(0.5);
    expect(opacityVal).toBe(0.5);

    if (typeof disposer === 'function') disposer();
    if (typeof opacityDisposer === 'function') opacityDisposer();
  });
});
