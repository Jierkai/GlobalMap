import { afterEach, describe, it, expect, vi } from 'vitest';
import * as Cesium from 'cesium';
import { EntityPool } from '../../src/pool/EntityPool';
import { __test__, createCesiumAdapter } from '../../src';
import { createViewer, _getInternalViewer } from '../../src/viewer';
import { createEntityFeatureHandle } from '../../src/handles/feature-entity';
import { getEntityPool, resetEntityPools } from '../../src/handles/_entity-pool';
import type { FeatureRenderSpec } from '@cgx/core';

/** 最小假 spec，cast 为 FeatureRenderSpec 方便测试。 */
const makeSpec = (id = 'f1') => ({ id, kind: 'point' } as unknown as FeatureRenderSpec);

describe('EntityPool', () => {
  afterEach(() => {
    delete process.env.CGX_DISABLE_POOL;
    resetEntityPools();
  });

  it('复用已释放的实体：create 仅调用 2 次，第三次 acquire 返回已释放对象', () => {
    let counter = 0;
    const create = vi.fn(() => ({ id: ++counter }));
    const reset = vi.fn();
    const pool = new EntityPool<{ id: number }>({ create, reset });

    const specA = makeSpec('a');
    const specB = makeSpec('b');
    const specC = makeSpec('c');

    const a = pool.acquire('point', specA);
    const b = pool.acquire('point', specB);
    pool.release('point', a);
    const c = pool.acquire('point', specC);

    // c 应当是被复用的 a
    expect(c).toBe(a);
    // b 是单独新建的，不受影响
    expect(b).not.toBe(a);
    // create 只应调用了 2 次（a 和 b），c 复用了 a
    expect(create).toHaveBeenCalledTimes(2);
    // reset 应以 (a, specC) 调用
    expect(reset).toHaveBeenCalledWith(a, specC);
  });

  it('遵守容量限制：桶满时 release 调用 destroy', () => {
    const create = vi.fn(() => ({}));
    const reset = vi.fn();
    const destroy = vi.fn();
    const pool = new EntityPool<object>({ create, reset, destroy, capacity: 1 });

    const spec = makeSpec();
    const x = pool.acquire('point', spec);
    const y = pool.acquire('point', spec);

    pool.release('point', x); // 桶：[x]，未满
    pool.release('point', y); // 桶已满（capacity=1），y 应被 destroy

    expect(destroy).toHaveBeenCalledTimes(1);
    expect(destroy).toHaveBeenCalledWith(y);
  });

  it('snapshot 正确统计 acquires 和 hits', () => {
    let counter = 0;
    const create = vi.fn(() => ({ id: ++counter }));
    const reset = vi.fn();
    const pool = new EntityPool<{ id: number }>({ create, reset, capacity: 4 });

    const spec = makeSpec();

    // 第 1 次 acquire → miss
    const e1 = pool.acquire('point', spec);
    pool.release('point', e1);
    // 第 2 次 acquire → hit（复用 e1）
    const e2 = pool.acquire('point', spec);
    // 第 3 次 acquire → miss（桶空了）
    pool.acquire('point', spec);

    const snap = pool.snapshot();
    expect(snap.acquires).toBe(3);
    expect(snap.hits).toBe(1);
    expect(snap.hitRate).toBe(1 / 3);
    expect(snap.bucketSizes).toEqual({ point: 0, polyline: 0, billboard: 0 });
    // e2 是复用的 e1
    expect(e2).toBe(e1);
  });

  it('flush 销毁所有缓存实体并清空桶', () => {
    const create = vi.fn(() => ({}));
    const reset = vi.fn();
    const destroy = vi.fn();
    const pool = new EntityPool<object>({ create, reset, destroy, capacity: 4 });

    const spec = makeSpec();
    const x = pool.acquire('point', spec);
    const y = pool.acquire('point', spec);
    pool.release('point', x);
    pool.release('point', y);

    pool.flush();

    // destroy 应对 x 和 y 各调用一次
    expect(destroy).toHaveBeenCalledTimes(2);
    expect(destroy).toHaveBeenCalledWith(x);
    expect(destroy).toHaveBeenCalledWith(y);

    // flush 后桶应为空
    const snap = pool.snapshot();
    expect(snap.bucketSizes).toEqual({ point: 0, polyline: 0, billboard: 0 });
  });

  it('CGX_DISABLE_POOL=1 禁用复用并在 release 时销毁实体', () => {
    process.env.CGX_DISABLE_POOL = '1';
    let counter = 0;
    const create = vi.fn(() => ({ id: ++counter }));
    const reset = vi.fn();
    const destroy = vi.fn();
    const pool = new EntityPool<{ id: number }>({ create, reset, destroy, capacity: 4 });

    const spec = makeSpec();
    const first = pool.acquire('point', spec);
    pool.release('point', first);
    const second = pool.acquire('point', spec);

    expect(second).not.toBe(first);
    expect(create).toHaveBeenCalledTimes(2);
    expect(reset).not.toHaveBeenCalled();
    expect(destroy).toHaveBeenCalledWith(first);
    expect(pool.snapshot()).toEqual({
      acquires: 2,
      hits: 0,
      hitRate: 0,
      bucketSizes: { point: 0, polyline: 0, billboard: 0 },
    });
  });

  it('entity feature handles reuse poolable Cesium entities and reset stale state', async () => {
    const viewerHandle = createViewer('test-container');
    const viewer = _getInternalViewer(viewerHandle) as any;

    const first = createEntityFeatureHandle(viewerHandle, {
      id: 'point-a',
      kind: 'point',
      position: [120, 30],
      point: { pixelSize: 12 },
      label: { text: 'stale label' },
    });

    await Promise.resolve();
    const firstEntity = first.unsafeNative() as any;
    expect(firstEntity.show).toBe(true);

    first.dispose();
    expect(firstEntity.show).toBe(false);
    expect(viewer.entities.remove).toHaveBeenCalledWith(firstEntity);

    const second = createEntityFeatureHandle(viewerHandle, {
      id: 'point-b',
      kind: 'point',
      position: [121, 31],
      point: { pixelSize: 3 },
    });

    await Promise.resolve();
    const secondEntity = second.unsafeNative() as any;

    expect(secondEntity).toBe(firstEntity);
    expect(secondEntity.id).toBe('point-b');
    expect(secondEntity.show).toBe(true);
    expect(secondEntity.label).toBeUndefined();
    expect(secondEntity.point).toEqual(expect.objectContaining({ pixelSize: 3 }));
    expect(secondEntity.polyline).toBeUndefined();
    expect(viewer.entities.add).toHaveBeenLastCalledWith(secondEntity);

    second.dispose();
    viewerHandle.destroy();
  });

  it('adapter dispose flushes viewer-scoped entity pools', async () => {
    const viewerHandle = createViewer('test-container');
    const adapter = createCesiumAdapter({ viewer: viewerHandle });
    await adapter.initialize?.('test-container');

    const handle = adapter.mountFeature?.({
      id: 'pooled-point',
      kind: 'point',
      position: [120, 30],
    });
    handle?.dispose();

    const pool = getEntityPool(viewerHandle);
    expect(pool.snapshot().bucketSizes.point).toBe(1);

    await adapter.dispose?.();

    expect(pool.snapshot().bucketSizes.point).toBe(0);
    viewerHandle.destroy();
  });

  it('pooled point updates reuse the existing Cartesian3 position object', () => {
    const viewerHandle = createViewer('test-container');
    const handle = createEntityFeatureHandle(viewerHandle, {
      id: 'pooled-position',
      kind: 'point',
      position: [120, 30],
      point: { pixelSize: 4 },
    });
    const entity = handle.unsafeNative?.() as any;
    const initialPosition = entity.position;
    vi.mocked(Cesium.Cartesian3.fromDegrees).mockClear();

    handle.update({ position: [121, 31] });
    __test__.flushUpdates();

    expect(entity.position).toBe(initialPosition);
    expect(Cesium.Cartesian3.fromDegrees).toHaveBeenCalledWith(
      121,
      31,
      0,
      undefined,
      initialPosition,
    );

    handle.dispose();
    viewerHandle.destroy();
  });
});
