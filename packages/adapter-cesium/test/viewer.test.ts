import { describe, it, expect } from 'vitest';
import * as Cesium from 'cesium';
import { createViewer } from '../src/viewer';
import { unsafeGetNativeViewer } from '../src/escape-hatch';
import { mockViewerConstructor } from './setup';

describe('createViewer', () => {
  it('passes native Cesium viewer options through unchanged', () => {
    const el = document.createElement('div');
    const options = {
      animation: true,
      shouldAnimate: true,
      timeline: true,
      sceneMode: Cesium.SceneMode.SCENE2D,
      requestRenderMode: true,
    };

    createViewer(el, options);

    expect(mockViewerConstructor).toHaveBeenLastCalledWith(el, options);
  });

  it('should create a viewer handle and allow destruction', () => {
    const el = document.createElement('div');
    const handle = createViewer(el, {});
    
    expect(handle).toBeDefined();
    expect(handle.scene).toBeDefined();
    
    const nativeViewer = unsafeGetNativeViewer(handle);
    expect(nativeViewer).toBeDefined();
    
    handle.destroy();
    
    // Check it cleans up
    expect(unsafeGetNativeViewer(handle)).toBeUndefined();
    
    // Idempotent destroy
    expect(() => handle.destroy()).not.toThrow();
  });
});
