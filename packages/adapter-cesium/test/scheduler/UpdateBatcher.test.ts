import { describe, it, expect, vi } from 'vitest';
import { UpdateBatcher } from '../../src/scheduler/UpdateBatcher';

describe('UpdateBatcher', () => {
  it('同一帧内多次入队同一 handle 的补丁会浅合并，flush 后 apply 仅调用一次', () => {
    const apply = vi.fn();
    const b = new UpdateBatcher();

    b.enqueue('h1', { a: 1 }, apply);
    b.enqueue('h1', { b: 2 }, apply);
    b.enqueue('h1', { a: 3 }, apply);

    // flush 之前不应调用 apply
    expect(apply).not.toHaveBeenCalled();

    b.flush();

    // flush 后 apply 仅调用一次，且补丁已合并
    expect(apply).toHaveBeenCalledTimes(1);
    expect(apply).toHaveBeenCalledWith({ a: 3, b: 2 });
  });

  it('连续入队 100 次同一 handle，flush 后 apply 仅调用一次', () => {
    const apply = vi.fn();
    const b = new UpdateBatcher();

    for (let i = 0; i < 100; i++) {
      b.enqueue('h1', { v: i }, apply);
    }

    b.flush();

    expect(apply).toHaveBeenCalledTimes(1);
    expect(apply).toHaveBeenCalledWith({ v: 99 });
  });

  it('sync 模式下补丁立即写入，不等待 flush', () => {
    const apply = vi.fn();
    const b = new UpdateBatcher();

    b.enqueue('h1', { x: 1 }, apply, { sync: true });

    // 未调用 flush，apply 应已被调用
    expect(apply).toHaveBeenCalledTimes(1);
    expect(apply).toHaveBeenCalledWith({ x: 1 });
  });

  it('disabled 模式下每次入队立即写入，bypass 批处理', () => {
    const apply = vi.fn();
    const b = new UpdateBatcher({ enabled: false });

    b.enqueue('h1', { a: 1 }, apply);
    b.enqueue('h1', { a: 2 }, apply);

    // 两次入队各自立即写入
    expect(apply).toHaveBeenCalledTimes(2);
  });

  it('can toggle batching at runtime', () => {
    const apply = vi.fn();
    const b = new UpdateBatcher();

    b.setEnabled(false);
    b.enqueue('h1', { a: 1 }, apply);
    b.enqueue('h1', { b: 2 }, apply);

    expect(apply).toHaveBeenCalledTimes(2);

    b.setEnabled(true);
    b.enqueue('h1', { c: 3 }, apply);

    expect(apply).toHaveBeenCalledTimes(2);

    b.flush();

    expect(apply).toHaveBeenCalledTimes(3);
    expect(apply).toHaveBeenLastCalledWith({ c: 3 });
  });

  it('reports and resets per-frame patch and native-write metrics', () => {
    const apply = vi.fn();
    const b = new UpdateBatcher();

    b.enqueue('h1', { a: 1 }, apply);
    b.enqueue('h1', { b: 2 }, apply);
    b.enqueue('h2', { c: 3 }, apply);

    expect(b.snapshot()).toEqual({
      framePatchCount: 3,
      frameNativeWriteCount: 0,
    });

    b.flush();

    expect(apply).toHaveBeenCalledTimes(2);
    expect(b.snapshot()).toEqual({
      framePatchCount: 3,
      frameNativeWriteCount: 2,
    });

    b.resetMetrics();

    expect(b.snapshot()).toEqual({
      framePatchCount: 0,
      frameNativeWriteCount: 0,
    });
  });

  it('注入手动调度器时，入队不立即 apply；运行捕获的回调后 apply 被调用一次并携带合并补丁', () => {
    let captured: (() => void) | null = null;
    const scheduler = vi.fn((cb: () => void) => {
      captured = cb;
      return 1;
    });

    const apply = vi.fn();
    const b = new UpdateBatcher({ scheduler });

    b.enqueue('h1', { a: 1 }, apply);
    b.enqueue('h1', { b: 2 }, apply);

    // 调度器已被调用，但 apply 尚未执行
    expect(scheduler).toHaveBeenCalledTimes(1);
    expect(apply).not.toHaveBeenCalled();

    // 手动触发调度回调（模拟 RAF 触发 flush）
    expect(captured).not.toBeNull();
    captured!();

    expect(apply).toHaveBeenCalledTimes(1);
    expect(apply).toHaveBeenCalledWith({ a: 1, b: 2 });
  });
});
