import { describe, it, expect } from 'vitest';
import { createViewer } from '../src/viewer';
import { unsafeGetNativeViewer } from '../src/escape-hatch';

describe('createViewer', () => {
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