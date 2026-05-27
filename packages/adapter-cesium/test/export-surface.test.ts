import { describe, it, expect } from 'vitest';
import * as publicApi from '../src/index';

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
] as const;

describe('@cgx/adapter-cesium public surface', () => {
  it('only exposes the documented narrow API (Stage 3 boundary lockdown)', () => {
    const actual = Object.keys(publicApi).sort();
    const expected = [...ALLOWED_KEYS].sort();
    expect(actual).toEqual(expected);
  });
});
