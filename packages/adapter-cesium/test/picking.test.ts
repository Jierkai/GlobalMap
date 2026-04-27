import { describe, it, expect } from 'vitest';
import { PickingBridge } from '../src/picking';
import { createViewer } from '../src/viewer';

describe('PickingBridge', () => {
  it('should set, get, and remove feature mapping', () => {
    const cesiumObject = { id: 'obj1' };
    const feature = { name: 'feature1' };
    
    PickingBridge.setFeature(cesiumObject, feature);
    expect(PickingBridge.getFeature(cesiumObject)).toBe(feature);
    
    PickingBridge.removeFeature(cesiumObject);
    expect(PickingBridge.getFeature(cesiumObject)).toBeUndefined();
  });

  it('should pick and drillPick mapped features', () => {
    const handle = createViewer('test-container');
    const windowPos = { x: 10, y: 10 } as any;
    
    const picked = PickingBridge.pick(handle, windowPos);
    expect(picked).toBeDefined();
    expect(picked.id).toBe('picked'); // From mock
    
    const drilled = PickingBridge.drillPick(handle, windowPos);
    expect(drilled).toBeDefined();
    expect(drilled.length).toBe(1);
    expect(drilled[0].id).toBe('picked1'); // From mock
    
    // Test mapping
    const mockPickedObj = { id: 'picked' };
    const mockFeature = { featureId: 99 };
    PickingBridge.setFeature('picked', mockFeature);
    
    // In mock, `pick` returns { id: 'picked' } which means id is 'picked'
    // target is pickedObject.id ('picked')
    const pickedMapped = PickingBridge.pick(handle, windowPos);
    expect(pickedMapped).toBe(mockFeature);
  });
});
