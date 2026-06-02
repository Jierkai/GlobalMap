import { afterEach, describe, it, expect, vi } from 'vitest';
import * as publicApi from '../src/index';
import { __resetBatcherForTest__, getDefaultBatcher } from '../src/scheduler';

// Stage 3 boundary lockdown 之后 @cgx/adapter-cesium 的精确公开面。
// 任何新增/删除 export 必须显式更新此列表，迫使设计者审视"是否真的属于公开 API"。
const ALLOWED_KEYS = [
  // Viewer 句柄工厂（adapter 内部装配也用）
  'createViewer',
  // 用户工厂
  'createCgxViewer',
  // EngineAdapter 工厂
  'createCesiumAdapter',
  'createCesiumRuntime',
  // 逃生舱口
  'unsafeGetCesium',
  'unsafeGetNativeViewer',
  // 坐标 helper
  'LngLatPosition',
  'toCartesian3',
  'fromCartesian3',
  // 屏幕事件
  'ScreenSpaceEmitter',
  // 测试钩子命名空间（仅暴露同步 flush 与指标重置/快照，不透出内部实现）
  '__test__',
] as const;

describe('@cgx/adapter-cesium public surface', () => {
  afterEach(() => {
    __resetBatcherForTest__();
  });

  it('only exposes the documented narrow API (Stage 3 boundary lockdown)', () => {
    const actual = Object.keys(publicApi).sort();
    const expected = [...ALLOWED_KEYS].sort();
    expect(actual).toEqual(expected);
  });

  it('exposes the adapter test hooks namespace', () => {
    const hooks = (publicApi as any).__test__;

    expect(Object.keys(hooks).sort()).toEqual([
      'flushUpdates',
      'getMetricsSnapshot',
      'resetMetrics',
      'resetPools',
    ]);
    expect(() => hooks.flushUpdates()).not.toThrow();
    expect(() => hooks.resetMetrics()).not.toThrow();
    expect(() => hooks.resetPools()).not.toThrow();
    expect(hooks.getMetricsSnapshot()).toEqual({
      framePatchCount: 0,
      frameNativeWriteCount: 0,
    });
  });

  it('delegates test hooks to the default update batcher', () => {
    const hooks = (publicApi as any).__test__;
    const apply = vi.fn();
    const batcher = getDefaultBatcher();

    batcher.enqueue('h1', { a: 1 }, apply);
    batcher.enqueue('h1', { b: 2 }, apply);

    expect(apply).not.toHaveBeenCalled();
    expect(hooks.getMetricsSnapshot()).toEqual({
      framePatchCount: 2,
      frameNativeWriteCount: 0,
    });

    hooks.flushUpdates();

    expect(apply).toHaveBeenCalledTimes(1);
    expect(apply).toHaveBeenCalledWith({ a: 1, b: 2 });
    expect(hooks.getMetricsSnapshot()).toEqual({
      framePatchCount: 2,
      frameNativeWriteCount: 1,
    });

    hooks.resetMetrics();

    expect(hooks.getMetricsSnapshot()).toEqual({
      framePatchCount: 0,
      frameNativeWriteCount: 0,
    });
  });
});
