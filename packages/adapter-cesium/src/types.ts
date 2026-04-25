/**
 * @fileoverview Cesium 适配器类型定义模块
 * 定义适配器所需的所有类型接口和类型别名
 * 
 * @module types
 * @description
 * 该模块定义了 Cesium 适配器的核心类型系统，包括：
 * - 不透明类型（Opaque Types）：用于类型安全的 Cesium 原生对象包装
 * - 接口定义：Viewer 配置、坐标格式、事件类型等
 * 
 * 使用不透明类型可以在编译时提供类型安全，同时避免直接暴露 Cesium 内部类型。
 */

/** 用于创建不透明类型的唯一符号标记 */
declare const __opaqueTag: unique symbol;

/**
 * 不透明类型构造器
 * 
 * @description
 * 创建一个不透明类型，用于包装底层类型并提供类型安全。
 * 不透明类型在编译时可以区分不同的类型，但在运行时没有额外开销。
 * 
 * @typeParam K - 类型标识符字符串
 * @example
 * ```typescript
 * type NativeScene = Opaque<'Scene'>;
 * // NativeScene 类型与 string 类型不兼容，即使底层都是 string
 * ```
 */
export type Opaque<K extends string> = { readonly [__opaqueTag]: K };

/**
 * Cesium Scene 对象的不透明类型
 * @description 表示 Cesium 的 Scene 对象，用于场景渲染管理
 */
export type NativeScene = Opaque<'Scene'>;

/**
 * Cesium Camera 对象的不透明类型
 * @description 表示 Cesium 的 Camera 对象，用于相机控制和视角管理
 */
export type NativeCamera = Opaque<'Camera'>;

/**
 * Cesium Clock 对象的不透明类型
 * @description 表示 Cesium 的 Clock 对象，用于时间管理
 */
export type NativeClock = Opaque<'Clock'>;

/**
 * Cesium ImageryLayerCollection 对象的不透明类型
 * @description 表示 Cesium 的影像图层集合，用于管理底图图层
 */
export type NativeImageryLayerCollection = Opaque<'ImageryLayerCollection'>;

/**
 * Cesium TerrainProvider 对象的不透明类型
 * @description 表示 Cesium 的地形提供者，用于地形数据管理
 */
export type NativeTerrainProvider = Opaque<'TerrainProvider'>;

/**
 * Cesium Cartesian3 对象的不透明类型
 * @description 表示 Cesium 的笛卡尔3坐标，即三维直角坐标
 */
export type NativeCartesian3 = Opaque<'Cartesian3'>;

/**
 * 经纬度坐标接口
 * 
 * @description
 * 表示地理坐标系统中的位置，使用经度、纬度和可选的海拔高度。
 * 经纬度单位为度（degrees），海拔高度单位为米（meters）。
 * 
 * @property {number} lng - 经度，范围 -180 到 180
 * @property {number} lat - 纬度，范围 -90 到 90
 * @property {number} [alt] - 海拔高度（米），可选，默认为 0
 * 
 * @example
 * ```typescript
 * const position: LngLat = {
 *   lng: 116.3974,  // 北京经度
 *   lat: 39.9093,   // 北京纬度
 *   alt: 100        // 海拔 100 米
 * };
 * ```
 */
export interface LngLat {
  /** 经度（度），范围 -180 到 180 */
  lng: number;
  /** 纬度（度），范围 -90 到 90 */
  lat: number;
  /** 海拔高度（米），可选 */
  alt?: number;
}

/**
 * Viewer 配置选项接口
 * 
 * @description
 * 定义创建 Cesium Viewer 时的配置选项。
 * 这些选项控制 Viewer 的各种 UI 组件和默认行为。
 * 
 * @property {HTMLElement | string} [container] - Viewer 容器元素或元素 ID
 * @property {boolean} [shouldAnimate=false] - 是否启用动画，默认 false
 * @property {boolean} [baseLayerPicker=false] - 是否显示底图选择器，默认 false
 * @property {boolean} [timeline=false] - 是否显示时间轴，默认 false
 * @property {boolean} [infoBox=false] - 是否显示信息框，默认 false
 * @property {boolean} [geocoder=false] - 是否显示地理编码器，默认 false
 * @property {boolean} [homeButton=false] - 是否显示主页按钮，默认 false
 * @property {boolean} [navigationHelpButton=false] - 是否显示导航帮助按钮，默认 false
 * @property {boolean} [sceneModePicker=false] - 是否显示场景模式选择器，默认 false
 * 
 * @example
 * ```typescript
 * const options: ViewerOptions = {
 *   container: 'cesiumContainer',
 *   shouldAnimate: true,
 *   timeline: true,
 *   baseLayerPicker: true
 * };
 * ```
 */
export interface ViewerOptions {
  /** Viewer 容器元素或元素 ID */
  container?: HTMLElement | string;
  /** 是否启用动画 */
  shouldAnimate?: boolean;
  /** 是否显示底图选择器 */
  baseLayerPicker?: boolean;
  /** 是否显示时间轴 */
  timeline?: boolean;
  /** 是否显示信息框 */
  infoBox?: boolean;
  /** 是否显示地理编码器（搜索框） */
  geocoder?: boolean;
  /** 是否显示主页按钮 */
  homeButton?: boolean;
  /** 是否显示导航帮助按钮 */
  navigationHelpButton?: boolean;
  /** 是否显示场景模式选择器（2D/3D 切换） */
  sceneModePicker?: boolean;
}

/**
 * Cesium Viewer 句柄接口
 * 
 * @description
 * 提供对 Cesium Viewer 实例的抽象访问接口。
 * 该接口隐藏了 Cesium Viewer 的具体实现细节，
 * 只暴露必要的属性和方法，便于上层代码使用。
 * 
 * 通过句柄模式，可以在不直接依赖 Cesium 类型的情况下操作 Viewer。
 * 
 * @property {Function} destroy - 销毁 Viewer 实例的方法
 * @property {NativeScene} scene - 场景对象，用于场景渲染管理
 * @property {NativeCamera} camera - 相机对象，用于视角控制
 * @property {NativeClock} clock - 时钟对象，用于时间管理
 * @property {NativeImageryLayerCollection} imageryLayers - 影像图层集合
 * @property {NativeTerrainProvider} terrainProvider - 地形提供者
 * 
 * @example
 * ```typescript
 * const handle = createViewer('container', options);
 * 
 * // 访问场景
 * const scene = handle.scene;
 * 
 * // 销毁 Viewer
 * handle.destroy();
 * ```
 */
export interface CesiumViewerHandle {
  /** 销毁 Viewer 实例，释放资源 */
  destroy(): void;
  /** 场景对象，用于场景渲染管理 */
  readonly scene: NativeScene;
  /** 相机对象，用于视角控制 */
  readonly camera: NativeCamera;
  /** 时钟对象，用于时间管理 */
  readonly clock: NativeClock;
  /** 影像图层集合，用于管理底图图层 */
  readonly imageryLayers: NativeImageryLayerCollection;
  /** 地形提供者，用于地形数据管理 */
  readonly terrainProvider: NativeTerrainProvider;
}

/**
 * 类型化事件映射接口
 * 
 * @description
 * 定义所有屏幕空间事件的类型签名。
 * 每个事件类型都包含地理坐标位置和屏幕窗口坐标。
 * 
 * @property {Object} click - 鼠标左键点击事件
 * @property {LngLat} click.position - 点击位置的地理坐标
 * @property {Object} click.windowPosition - 点击位置的屏幕坐标
 * @property {number} click.windowPosition.x - 屏幕 X 坐标
 * @property {number} click.windowPosition.y - 屏幕 Y 坐标
 * 
 * @property {Object} dblclick - 鼠标左键双击事件
 * @property {LngLat} dblclick.position - 双击位置的地理坐标
 * @property {Object} dblclick.windowPosition - 双击位置的屏幕坐标
 * 
 * @property {Object} mousemove - 鼠标移动事件
 * @property {LngLat} mousemove.startPosition - 移动起始位置的地理坐标
 * @property {LngLat} mousemove.endPosition - 移动结束位置的地理坐标
 * @property {Object} mousemove.windowPosition - 当前位置的屏幕坐标
 * 
 * @property {Object} mousedown - 鼠标左键按下事件
 * @property {LngLat} mousedown.position - 按下位置的地理坐标
 * @property {Object} mousedown.windowPosition - 按下位置的屏幕坐标
 * 
 * @property {Object} mouseup - 鼠标左键抬起事件
 * @property {LngLat} mouseup.position - 抬起位置的地理坐标
 * @property {Object} mouseup.windowPosition - 抬起位置的屏幕坐标
 * 
 * @property {Object} rightclick - 鼠标右键点击事件
 * @property {LngLat} rightclick.position - 右键点击位置的地理坐标
 * @property {Object} rightclick.windowPosition - 右键点击位置的屏幕坐标
 */
export type TypedEvents = {
  /** 鼠标左键点击事件 */
  'click': { position: LngLat; windowPosition: { x: number; y: number } };
  /** 鼠标左键双击事件 */
  'dblclick': { position: LngLat; windowPosition: { x: number; y: number } };
  /** 鼠标移动事件 */
  'mousemove': { startPosition: LngLat; endPosition: LngLat; windowPosition: { x: number; y: number } };
  /** 鼠标左键按下事件 */
  'mousedown': { position: LngLat; windowPosition: { x: number; y: number } };
  /** 鼠标左键抬起事件 */
  'mouseup': { position: LngLat; windowPosition: { x: number; y: number } };
  /** 鼠标右键点击事件 */
  'rightclick': { position: LngLat; windowPosition: { x: number; y: number } };
};

/**
 * 事件取消订阅函数类型
 * 
 * @description
 * 调用此函数可以取消事件监听器的订阅。
 * 返回自事件订阅方法（如 `on` 方法）。
 * 
 * @example
 * ```typescript
 * const off: Off = emitter.on('click', handler);
 * // 取消订阅
 * off();
 * ```
 */
export type Off = () => void;