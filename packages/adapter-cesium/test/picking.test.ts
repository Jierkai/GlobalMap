import { describe, it, expect } from 'vitest';
import {
  bindPickFeature,
  drillPickSceneFeatures,
  getBoundPickFeature,
  pickSceneFeature,
  unbindPickFeature,
} from '../src/picking';
import { createViewer } from '../src/viewer';

describe('picking helpers', () => {
  it('should set, get, and remove feature mapping', () => {
    const cesiumObject = { id: 'obj1' };
    const feature = { name: 'feature1' };
    
    bindPickFeature(cesiumObject, feature);
    expect(getBoundPickFeature(cesiumObject)).toBe(feature);
    
    unbindPickFeature(cesiumObject);
    expect(getBoundPickFeature(cesiumObject)).toBeUndefined();
  });

  it('should pick and drillPick mapped features', () => {
    const handle = createViewer('test-container');
    const windowPos = { x: 10, y: 10 } as any;
    
    const picked = pickSceneFeature(handle, windowPos);
    expect(picked).toBeDefined();
    expect(picked.id).toBe('picked'); // From mock
    
    const drilled = drillPickSceneFeatures(handle, windowPos);
    expect(drilled).toBeDefined();
    expect(drilled.length).toBe(1);
    expect(drilled[0].id).toBe('picked1'); // From mock
    
    // Test mapping
    const mockPickedObj = { id: 'picked' };
    const mockFeature = { featureId: 99 };
    bindPickFeature('picked', mockFeature);
    
    // In mock, `pick` returns { id: 'picked' } which means id is 'picked'
    // target is pickedObject.id ('picked')
    const pickedMapped = pickSceneFeature(handle, windowPos);
    expect(pickedMapped).toBe(mockFeature);
  });
});
