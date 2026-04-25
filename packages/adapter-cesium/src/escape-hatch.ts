/**
 * @fileoverview 逃生舱口模块
 * 提供直接访问 Cesium 原生 API 的底层接口
 * 
 * @module escape-hatch
 * @warning 使用此模块的代码将直接耦合到 Cesium API，应尽量避免在 L2/L3 层代码中使用
 * 
 * @description
 * 该模块提供了"逃生舱口"模式，允许在必要时直接访问 Cesium 的原生对象。
 * 这是一种设计模式，用于在抽象层需要访问底层实现时提供灵活性，
 * 但应谨慎使用，因为它会破坏抽象层的封装性。
 */

import * as Cesium from 'cesium';
import type { CesiumViewerHandle } from './types';
import { _getInternalViewer } from './viewer';

/**
 * 获取 Cesium 原生模块
 * 
 * @description 提供对完整 Cesium 模块的直接访问。
 * 使用此函数可以直接调用 Cesium 的任何 API。
 * 
 * @warning 注意：使用此函数将使您的代码直接耦合到 Cesium API。
 * 应尽量避免在 L2/L3 层代码中使用，仅在 L1 适配层中使用。
 * 
 * @returns {typeof import('cesium')} Cesium 模块对象，包含所有 Cesium 类和函数
 * 
 * @example
 * ```typescript
 * const Cesium = unsafeGetCesium();
 * const position = new Cesium.Cartesian3(0, 0, 0);
 * ```
 */
export function unsafeGetCesium(): typeof import('cesium') {
  return Cesium;
}

/**
 * 获取 Cesium 原生 Viewer 实例
 * 
 * @description 提供对底层 Cesium.Viewer 实例的直接访问。
 * 这允许在需要时绕过抽象层，直接操作 Cesium Viewer。
 * 
 * @warning 注意：使用此函数将使您的代码直接耦合到 Cesium API。
 * 应尽量避免在 L2/L3 层代码中使用，仅在 L1 适配层中使用。
 * 
 * @param {CesiumViewerHandle} handle - 由 createViewer 创建的 viewer 句柄对象
 * @returns {unknown} 原生的 Cesium.Viewer 实例，需要手动类型断言使用
 * 
 * @example
 * ```typescript
 * const nativeViewer = unsafeGetNativeViewer(handle) as Cesium.Viewer;
 * nativeViewer.zoomTo(someEntity);
 * ```
 */
export function unsafeGetNativeViewer(handle: CesiumViewerHandle): unknown {
  return _getInternalViewer(handle);
}