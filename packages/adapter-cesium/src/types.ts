/**
 * @fileoverview Cesium 适配器类型定义模块
 * 提供适配器内部使用的不透明类型（Opaque Types）和接口定义
 * 
 * @module types
 * @description
 * 该模块定义了 Cesium 适配器的核心类型，包括：
 * - 不透明类型（Opaque Types）：防止直接操作原生 Cesium 对象
 * - 经纬度坐标接口
 * - Viewer 配置和句柄接口
 * - 屏幕空间事件类型定义
 */

/** 不透明类型标签的唯一 Symbol 声明 */
declare const __opaqueTag: unique symbol;

/**
 * 不透明类型包装器
 * 
 * @description
 * 使用 TypeScript 的 unique symbol 特性创建不透明类型，
 * 防止不同类型之间的隐式转换，确保类型安全。
 * 
 * @typeParam K - 不透明类型的标识字符串
 */
export type Opaque<K extends string> = { readonly [__opaqueTag]: K };

/** Cesium 场景不透明类型 */
export type NativeScene = Opaque<'Scene'>;
/** Cesium 相机不透明类型 */
export type NativeCamera = Opaque<'Camera'>;
/** Cesium 时钟不透明类型 */
export type NativeClock = Opaque<'Clock'>;
/** Cesium 影像图层集合不透明类型 */
export type NativeImageryLayerCollection = Opaque<'ImageryLayerCollection'>;
/** Cesium 地形提供者不透明类型 */
export type NativeTerrainProvider = Opaque<'TerrainProvider'>;
/** Cesium 笛卡尔3坐标不透明类型 */
export type NativeCartesian3 = Opaque<'Cartesian3'>;

/**
 * 经纬度坐标接口
 * 
 * @description
 * 通用的经纬度坐标表示，使用度（degrees）作为单位。
 */
export interface LngLat {
  /** 经度（度） */
  lng: number;
  /** 纬度（度） */
  lat: number;
  /** 海拔高度（米），可选，默认为 0 */
  alt?: number;
}

/** 场景模式。 */
export type SceneModeOption = '3d' | '2d' | 'columbus';

/**
 * Viewer 配置选项接口。
 *
 * @description
 * 只暴露 Cgx 自己的中立配置，不把 Cesium 原生类型扩散到公开类型中。
 */
export interface ViewerOptions {
  /** 是否显示底图选择器。 */
  baseLayerPicker?: boolean;
  /** 是否启动动画时钟。 */
  shouldAnimate?: boolean;
  /** 是否显示时间轴。 */
  timeline?: boolean;
  /** 是否显示信息框。 */
  infoBox?: boolean;
  /** 是否显示地理编码控件。 */
  geocoder?: boolean;
  /** 是否显示主页按钮。 */
  homeButton?: boolean;
  /** 是否显示导航帮助按钮。 */
  navigationHelpButton?: boolean;
  /** 是否显示场景模式切换器。 */
  sceneModePicker?: boolean;
  /** 初始场景模式。 */
  sceneMode?: SceneModeOption;
  /** 是否启用按需渲染。 */
  requestRenderMode?: boolean;
  /** 目标帧率。 */
  targetFrameRate?: number;
  /** 是否只创建 3D 场景资源。 */
  scene3DOnly?: boolean;
}

/**
 * Cesium Viewer 句柄接口
 * 
 * @description
 * 对 Cesium Viewer 的抽象封装，提供类型安全的访问接口。
 * 使用不透明类型防止直接操作原生对象，确保适配器的封装性。
 */
export interface CesiumViewerHandle {
  /** 销毁 Viewer 实例并释放资源 */
  destroy(): void;
  /** 获取场景对象 */
  readonly scene: NativeScene;
  /** 获取相机对象 */
  readonly camera: NativeCamera;
  /** 获取时钟对象 */
  readonly clock: NativeClock;
  /** 获取影像图层集合 */
  readonly imageryLayers: NativeImageryLayerCollection;
  /** 获取地形提供者 */
  readonly terrainProvider: NativeTerrainProvider;
}

/**
 * 屏幕空间事件类型映射
 * 
 * @description
 * 定义所有支持的屏幕空间事件及其负载类型。
 * 每个事件都包含地理坐标位置和屏幕窗口坐标。
 */
export type TypedEvents = {
  /** 鼠标左键点击事件 */
  click: { position: LngLat; windowPosition: { x: number; y: number } };
  /** 鼠标左键双击事件 */
  dblclick: { position: LngLat; windowPosition: { x: number; y: number } };
  /** 鼠标移动事件 */
  mousemove: {
    /** 移动起始位置的地理坐标 */
    startPosition: LngLat;
    /** 移动结束位置的地理坐标 */
    endPosition: LngLat;
    /** 结束位置的屏幕窗口坐标 */
    windowPosition: { x: number; y: number };
  };
  /** 鼠标左键按下事件 */
  mousedown: { position: LngLat; windowPosition: { x: number; y: number } };
  /** 鼠标左键抬起事件 */
  mouseup: { position: LngLat; windowPosition: { x: number; y: number } };
  /** 鼠标右键点击事件 */
  rightclick: { position: LngLat; windowPosition: { x: number; y: number } };
};

/**
 * 取消订阅函数类型
 * 
 * @description
 * 调用此函数可取消之前注册的事件监听器。
 */
export type Off = () => void;
