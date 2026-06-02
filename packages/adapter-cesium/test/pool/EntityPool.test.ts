import { describe, it, expect, vi } from 'vitest';
import { EntityPool } from '../../src/pool/EntityPool';
import type { FeatureRenderSpec } from '@cgx/core';

/** 最小假 spec，cast 为 FeatureRenderSpec 方便测试。 */
const makeSpec = (id = 'f1') => ({ id, kind: 'point' } as unknown as FeatureRenderSpec);

describe('EntityPool', () => {
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
    expect(snap.bucketSizes).toEqual({});
  });
});
