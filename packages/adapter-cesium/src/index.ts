/**
 * @fileoverview Cesium 适配器模块入口
 * 导出 Cesium 适配器的所有公共 API
 * 
 * @module adapter-cesium
 * @description
 * 该模块是 Cesium 适配器的主入口点，提供了以下功能：
 * 
 * - **Viewer 创建**: createViewer - 创建 Cesium Viewer 实例的工厂函数
 * - **坐标转换**: toCartesian3, fromCartesian3 - 经纬度与笛卡尔坐标的转换
 * - **事件处理**: ScreenSpaceEmitter - 屏幕空间事件发射器
 * - **逃生舱口**: unsafeGetCesium, unsafeGetNativeViewer - 直接访问 Cesium 原生 API
 * - **类型定义**: 导出所有类型定义
 * 
 * @example
 * ```typescript
 * import { createViewer, toCartesian3, ScreenSpaceEmitter } from '@cgx/adapter-cesium';
 * 
 * // 创建 Viewer
 * const viewer = createViewer('cesiumContainer', { shouldAnimate: true });
 * 
 * // 坐标转换
 * const cartesian3 = toCartesian3({ lng: 116.3974, lat: 39.9093, alt: 100 });
 * 
 * // 事件处理
 * const emitter = new ScreenSpaceEmitter(viewer.scene, canvas);
 * emitter.on('click', (payload) => {
 *   console.log('点击位置:', payload.position);
 * });
 * ```
 */

// 导出 Viewer 创建函数
export { createViewer } from './viewer';

// 导出逃生舱口函数（谨慎使用）
export { unsafeGetCesium, unsafeGetNativeViewer } from './escape-hatch';

// 导出坐标转换工具函数
export { toCartesian3, fromCartesian3 } from './coord';

// 导出屏幕空间事件发射器
export { ScreenSpaceEmitter } from './event';

// 导出所有类型定义
export * from './types';