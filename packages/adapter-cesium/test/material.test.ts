import { describe, it, expect } from 'vitest';
import { MaterialBridge } from '../src/material';

describe('MaterialBridge', () => {
  it('should create material', () => {
    const material = MaterialBridge.createMaterial({
      type: 'CustomMaterial',
      uniforms: { color: 'red' },
      source: 'czm_material czm_getMaterial(czm_materialInput materialInput) { return czm_getDefaultMaterial(materialInput); }'
    });
    
    expect(material).toBeDefined();
    expect((material as any).fabric.type).toBe('CustomMaterial');
    expect((material as any).fabric.uniforms.color).toBe('red');
  });

  it('should register custom material without throwing', () => {
    expect(() => {
      MaterialBridge.registerCustomMaterial({
        type: 'RegisteredMaterial',
        uniforms: { alpha: 1.0 }
      });
    }).not.toThrow();
  });
});
