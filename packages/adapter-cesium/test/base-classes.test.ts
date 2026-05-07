import { describe, expect, it } from 'vitest';
import * as Cesium from 'cesium';
import { createViewer } from '../src/viewer';
import { PrimitiveBase } from '../src/primitive';
import { EntityBase } from '../src/entity';

class TestPrimitive extends PrimitiveBase<Cesium.Primitive> {
  protected _createPrimitive(): Cesium.Primitive {
    return new Cesium.Primitive({ id: 'primitive-id' });
  }
}

class TestEntity extends EntityBase<Cesium.Entity.ConstructorOptions, Cesium.Entity> {
  protected _createEntityOptions(): Cesium.Entity.ConstructorOptions {
    return {
      id: 'entity-id',
      point: { pixelSize: 10 },
    };
  }
}

describe('PrimitiveBase', () => {
  it('should init, attach, detach, and dispose a primitive', async () => {
    const handle = createViewer('test-container');
    const primitive = new TestPrimitive(handle, { autoAttach: false });

    const instance = await primitive.init();
    expect(instance).toBeDefined();
    expect(primitive.isInitialized).toBe(true);
    expect(primitive.isAttached).toBe(false);

    expect(primitive.attach()).toBe(true);
    expect(primitive.isAttached).toBe(true);

    expect(primitive.detach()).toBe(true);
    expect(primitive.isAttached).toBe(false);

    primitive.dispose();
    expect(primitive.primitive).toBeNull();
  });
});

describe('EntityBase', () => {
  it('should init, attach, update, detach, and dispose an entity', async () => {
    const handle = createViewer('test-container');
    const entity = new TestEntity(handle, { autoAttach: false });

    const options = await entity.init();
    expect(options.id).toBe('entity-id');
    expect(entity.isInitialized).toBe(true);
    expect(entity.isAttached).toBe(false);

    expect(entity.attach()).toBe(true);
    expect(entity.entity).toBeDefined();
    expect(entity.isAttached).toBe(true);

    entity.update({ point: { pixelSize: 20, color: 'red' } });
    expect((entity.entity as any).point.pixelSize).toBe(20);
    expect((entity.entity as any).point.color).toBe('red');

    expect(entity.detach()).toBe(true);
    expect(entity.entity).toBeNull();
    expect(entity.isAttached).toBe(false);

    entity.dispose();
    expect(entity.entity).toBeNull();
  });
});
