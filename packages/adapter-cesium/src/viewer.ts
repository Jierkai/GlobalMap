/**
 * @fileoverview Cesium Viewer 创建和管理模块
 * 提供 Cesium Viewer 实例的创建工厂函数和内部访问机制
 * 
 * @module viewer
 * @description
 * 该模块负责创建和管理 Cesium Viewer 实例，采用句柄模式（Handle Pattern）
 * 将 Cesium 的原生 Viewer 对象封装为抽象的 CesiumViewerHandle 接口。
 * 
 * 主要功能：
 * - 创建配置好的 Cesium Viewer 实例
 * - 提供类型安全的 Viewer 句柄接口
 * - 管理 Viewer 生命周期（创建和销毁）
 * - 通过 WeakMap 实现句柄与原生 Viewer 的映射
 * - 集成 WeatherEffectManager 管理天气特效
 */

import * as Cesium from 'cesium';
import type { 
  ViewerOptions, 
  CesiumViewerHandle, 
  NativeScene, 
  NativeCamera, 
  NativeClock, 
  NativeImageryLayerCollection, 
  NativeTerrainProvider 
} from './types';
import { WeatherEffectManagerImpl } from './effect/manager';

/**
 * Viewer 句柄与原生 Viewer 实例的映射表
 * 
 * @description
 * 使用 WeakMap 存储句柄与原生 Viewer 的映射关系。
 * WeakMap 的优势在于当句柄对象被垃圾回收时，
 * 映射关系会自动清除，避免内存泄漏。
 * 
 * @internal 内部使用，不应直接访问
 */
const viewerMap = new WeakMap<CesiumViewerHandle, Cesium.Viewer>();

/**
 * 创建 Cesium Viewer 实例
 * 
 * @description
 * 工厂函数，用于创建配置好的 Cesium Viewer 实例。
 * 返回一个 CesiumViewerHandle 句柄对象，提供对 Viewer 的抽象访问。
 * 
 * 该函数会根据传入的配置选项初始化 Viewer，默认禁用大部分 UI 组件，
 * 以提供一个干净的 3D 场景。
 * 
 * 如果 `options.effects` 中包含天气效果配置，会自动创建
 * `WeatherEffectManager` 并初始化对应的效果实例。
 * 
 * @param {HTMLElement | string} container - Viewer 容器元素或元素 ID
 * @param {ViewerOptions} [options={}] - Viewer 配置选项
 * @param {boolean} [options.baseLayerPicker=false] - 是否显示底图选择器
 * @param {boolean} [options.shouldAnimate=false] - 是否启用动画
 * @param {boolean} [options.timeline=false] - 是否显示时间轴
 * @param {boolean} [options.infoBox=false] - 是否显示信息框
 * @param {boolean} [options.geocoder=false] - 是否显示地理编码器
 * @param {boolean} [options.homeButton=false] - 是否显示主页按钮
 * @param {boolean} [options.navigationHelpButton=false] - 是否显示导航帮助按钮
 * @param {boolean} [options.sceneModePicker=false] - 是否显示场景模式选择器
 * @param {WeatherEffectConfig[]} [options.effects] - 天气效果配置数组
 * @returns {CesiumViewerHandle} Viewer 句柄对象
 * 
 * @example
 * ```typescript
 * // 使用元素 ID 创建
 * const handle = createViewer('cesiumContainer', {
 *   shouldAnimate: true,
 *   timeline: true
 * });
 * 
 * // 使用 DOM 元素创建
 * const container = document.getElementById('cesiumContainer')!;
 * const handle = createViewer(container, {
 *   baseLayerPicker: true
 * });
 * 
 * // 声明式天气效果配置
 * const handle = createViewer('cesiumContainer', {
 *   effects: [
 *     { type: 'rain', intensity: 0.8 },
 *     { type: 'fog', density: 0.0003 },
 *   ],
 * });
 * 
 * // 访问场景和相机
 * const scene = handle.scene;
 * const camera = handle.camera;
 * 
 * // 操作天气效果
 * await handle.weatherEffectManager.enableEffect(WeatherType.Rain);
 * handle.weatherEffectManager.disableEffect(WeatherType.Fog);
 * 
 * // 销毁 Viewer
 * handle.destroy();
 * ```
 */
export function createViewer(container: HTMLElement | string, options: ViewerOptions = {}): CesiumViewerHandle {
  // 创建 Cesium Viewer 实例，应用配置选项
  const viewer = new Cesium.Viewer(container, {
    baseLayerPicker: options.baseLayerPicker ?? false,      // 底图选择器，默认禁用
    animation: options.shouldAnimate ?? false,              // 动画控件，默认禁用
    timeline: options.timeline ?? false,                    // 时间轴，默认禁用
    infoBox: options.infoBox ?? false,                      // 信息框，默认禁用
    geocoder: options.geocoder ?? false,                    // 地理编码器，默认禁用
    homeButton: options.homeButton ?? false,                // 主页按钮，默认禁用
    navigationHelpButton: options.navigationHelpButton ?? false, // 导航帮助按钮，默认禁用
    sceneModePicker: options.sceneModePicker ?? false       // 场景模式选择器，默认禁用
  });

  // 创建天气效果管理器（先创建，handle 引用它）
  const weatherEffectManager = new WeatherEffectManagerImpl();

  // 创建句柄对象，提供对 Viewer 的抽象访问
  const handle: CesiumViewerHandle = {
    /**
     * 销毁 Viewer 实例
     * @description 清理资源并从映射表中移除，同时销毁天气效果管理器
     */
    destroy() {
      // 先销毁天气效果管理器中的所有效果
      weatherEffectManager.disposeAll();
      if (!viewer.isDestroyed()) {
        viewer.destroy();
      }
      viewerMap.delete(handle);
    },
    /** 获取场景对象 */
    get scene() { return viewer.scene as unknown as NativeScene; },
    /** 获取相机对象 */
    get camera() { return viewer.camera as unknown as NativeCamera; },
    /** 获取时钟对象 */
    get clock() { return viewer.clock as unknown as NativeClock; },
    /** 获取影像图层集合 */
    get imageryLayers() { return viewer.imageryLayers as unknown as NativeImageryLayerCollection; },
    /** 获取地形提供者 */
    get terrainProvider() { return viewer.terrainProvider as unknown as NativeTerrainProvider; },
    /** 天气效果管理器 */
    get weatherEffectManager() { return weatherEffectManager; },
  };

  // 将句柄与原生 Viewer 建立映射关系
  viewerMap.set(handle, viewer);

  // 建立管理器与 handle 的双向引用
  weatherEffectManager.setViewer(handle);

  // 如果配置了天气效果，异步初始化（不阻塞返回）
  if (options.effects && options.effects.length > 0) {
    weatherEffectManager.initFromConfigs(options.effects).catch((err) => {
      console.error('[createViewer] 天气效果初始化失败:', err);
    });
  }

  return handle;
}

/**
 * 获取内部 Viewer 实例
 * 
 * @description
 * 内部函数，用于从句柄获取原生的 Cesium.Viewer 实例。
 * 该函数仅供适配器内部使用，外部代码应使用 unsafeGetNativeViewer。
 * 
 * @internal 内部函数，不应在模块外部使用
 * @param {CesiumViewerHandle} handle - Viewer 句柄对象
 * @returns {Cesium.Viewer | undefined} 原生 Viewer 实例，如果句柄无效则返回 undefined
 * 
 * @example
 * ```typescript
 * // 内部使用示例
 * const nativeViewer = _getInternalViewer(handle);
 * if (nativeViewer) {
 *   // 访问原生 API
 *   nativeViewer.zoomTo(someEntity);
 * }
 * ```
 */
export function _getInternalViewer(handle: CesiumViewerHandle): Cesium.Viewer | undefined {
  return viewerMap.get(handle);
}
