import { describe, it, expect } from 'vitest';
import { EntityBridge } from '../src/primitive';
import { createViewer } from '../src/viewer';

describe('EntityBridge', () => {
  it('should add and remove entity', () => {
    const handle = createViewer('test-container');
    const entity = EntityBridge.addEntity(handle, { id: 'test-entity' });
    expect(entity).toBeDefined();
    expect((entity as any).id).toBe('entity-id');
    
    const removed = EntityBridge.removeEntity(handle, entity!);
    expect(removed).toBe(true);
  });

  it('should update entity properties', () => {
    const entity: any = { point: { pixelSize: 10 } };
    EntityBridge.updateEntity(entity, { point: { pixelSize: 20, color: 'red' } });
    expect(entity.point.pixelSize).toBe(20);
    expect(entity.point.color).toBe('red');

    const entity2: any = {};
    EntityBridge.updateEntity(entity2, { polyline: { width: 5 } });
    expect(entity2.polyline.width).toBe(5);
  });
});
