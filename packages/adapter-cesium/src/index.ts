/**
 * @fileoverview Cesium 适配器模块入口
 *
 * @module adapter-cesium
 * @description
 * 该模块是 Cesium 适配器的主入口点。Stage 3 boundary lockdown 之后，
 * 入口仅暴露以下 API：
 *
 * - **Viewer 创建**: createViewer / createCgxViewer
 * - **EngineAdapter 工厂**: createCesiumAdapter / createCesiumRuntime
 * - **坐标工具**: LngLatPosition / toCartesian3 / fromCartesian3
 * - **屏幕事件**: ScreenSpaceEmitter
 * - **逃生舱口**: unsafeGetCesium / unsafeGetNativeViewer
 *
 * 内部 helper（provider/layer/primitive/entity/material/picking 的具体实现）
 * 已不再从主入口透传；如确需访问 Cesium 原生 API 请走 unsafeGetCesium /
 * unsafeGetNativeViewer 逃生舱口。
 */

export { createViewer } from './viewer';
export { createCgxViewer, type CreateCgxViewerOptions } from './createCgxViewer';

export {
  createCesiumAdapter,
  createCesiumRuntime,
  type CesiumEngineAdapterOptions,
} from './adapter';

export { unsafeGetCesium, unsafeGetNativeViewer } from './escape-hatch';

export {
  LngLatPosition,
  toCartesian3,
  fromCartesian3,
  type LngLatPositionInput,
} from './coord';

export { ScreenSpaceEmitter } from './event';

// Cesium-specific Opaque 与 viewer/runtime 类型（用户写自定义 adapter 时需要）。
export type {
  CesiumViewerOptions,
  CesiumViewerHandle,
  CgxViewerRuntimeOptions,
  CesiumRuntime,
  Opaque,
  NativeScene,
  NativeCamera,
  NativeClock,
  NativeImageryLayerCollection,
  NativeTerrainProvider,
  NativeCartesian3,
} from './types';
