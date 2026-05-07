import type Cesium from 'cesium';
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
 * 天气效果配置联合类型（判别联合）
 *
 * @description
 * 声明式天气效果配置，通过 `type` 字段区分不同天气类型。
 * 每种类型携带对应的专属配置参数。
 * 也可直接传入已实例化的 `WeatherEffect` 对象。
 *
 * @example
 * ```typescript
 * const configs: WeatherEffectConfig[] = [
 *   { type: 'rain', intensity: 0.8, windSpeed: 0.3 },
 *   { type: 'fog', density: 0.0005, color: 'rgba(200,210,220,0.7)' },
 *   new RainWeatherEffect(viewerHandle, { intensity: 0.5 }),
 * ];
 * ```
 */
export type WeatherEffectConfig =
  | ({ type: WeatherType.Rain } & RainConfig)
  | ({ type: WeatherType.Snow } & SnowConfig)
  | ({ type: WeatherType.Fog } & FogConfig)
  | ({ type: WeatherType.Cloud } & import('./effect/cloud').CloudConfig)
  | ({ type: WeatherType.Lightning } & import('./effect/lightning').LightningConfig)
  | WeatherEffect<WeatherBaseConfig>;

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
 *   baseLayerPicker: true,
 *   effects: [
 *     { type: 'rain', intensity: 0.8 },
 *     { type: 'fog', density: 0.0003 },
 *   ],
 * };
 * ```
 */
export interface ViewerOptions extends Cesium.Viewer.ConstructorOptions {
  layers?: Cesium.ImageryLayer[]
  /** 天气效果配置数组，声明式驱动初始化 */
  effects?: WeatherEffectConfig[];
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
  /** 天气效果管理器，统一管理所有天气特效的生命周期 */
  readonly weatherEffectManager: WeatherEffectManager;
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

/**
 * 天气效果类型枚举
 * 
 * @description
 * 定义所有支持的天气效果类别，作为判别联合的判别键。
 * 每种天气类型对应不同的配置接口和实现策略。
 * 
 * @example
 * ```typescript
 * if (effect.type === WeatherType.Rain) {
 *   const rainEffect = effect as RainWeatherEffect;
 * }
 * ```
 */
export enum WeatherType {
  /** 雨 */
  Rain = 'rain',
  /** 雪 */
  Snow = 'snow',
  /** 雾 */
  Fog = 'fog',
  /** 云 */
  Cloud = 'cloud',
  /** 闪电 */
  Lightning = 'lightning',
  /** 自定义天气效果 */
  Custom = 'custom',
}

/**
 * 天气效果生命周期状态枚举
 * 
 * @description
 * 定义天气效果在其生命周期中的各个状态。
 * 状态转换遵循严格的状态机规则：
 * 
 * 
 * @example
 * ```typescript
 * effect.addStateListener((prev, next) => {
 *   console.log(`状态变更: ${prev} → ${next}`);
 * });
 * ```
 */
export enum WeatherState {
  /** 空闲状态，尚未初始化 */
  Idle = 'idle',
  /** 初始化中，正在加载资源 */
  Initializing = 'initializing',
  /** 运行中，天气效果正在渲染 */
  Running = 'running',
  /** 已暂停，效果暂时停止渲染但资源未释放 */
  Paused = 'paused',
  /** 停止中，正在清理资源 */
  Stopping = 'stopping',
  /** 已停止，资源已释放 */
  Stopped = 'stopped',
  /** 错误状态，初始化或运行时发生异常 */
  Error = 'error',
}

/**
 * 天气效果基础配置接口
 * 
 * @description
 * 所有天气效果共享的基础配置参数。
 * 派生类可扩展此接口添加专属配置。
 * 
 * @property {number} [intensity=0.5] - 效果强度，范围 0-1，0 表示完全不可见
 * @property {number} [speed=1.0] - 动画速度倍率，1.0 表示默认速度
 * @property {number} [radius=5000] - 效果覆盖半径（米），以相机为中心
 * @property {number} [altitude=2000] - 效果海拔高度范围（米），从地面向上
 * @property {number} [opacity=1.0] - 整体透明度，范围 0-1
 * @property {boolean} [enabled=true] - 是否启用渲染
 */
export interface WeatherBaseConfig {
  /** 效果强度 (0-1) */
  intensity?: number;
  /** 动画速度倍率 */
  speed?: number;
  /** 覆盖半径（米） */
  radius?: number;
  /** 海拔高度范围（米） */
  altitude?: number;
  /** 整体透明度 (0-1) */
  opacity?: number;
  /** 是否启用 */
  enabled?: boolean;
}

/**
 * 雨天效果配置接口
 * 
 * @description
 * 扩展基础天气配置，添加雨滴专属参数。
 * 
 * @example
 * ```typescript
 * const rainConfig: RainConfig = {
 *   intensity: 0.8,
 *   speed: 1.2,
 *   dropSize: 0.015,
 *   dropColor: 'rgba(174,194,224,0.6)',
 *   windDirection: 45,
 *   windSpeed: 0.3,
 * };
 * ```
 */
export interface RainConfig extends WeatherBaseConfig {
  /** 雨滴尺寸 */
  dropSize?: number;
  /** 雨滴颜色 (CSS 颜色字符串) */
  dropColor?: string;
  /** 风向角度（度），0 表示北风，90 表示东风 */
  windDirection?: number;
  /** 风速倍率，影响雨滴水平偏移速度 */
  windSpeed?: number;
}

/**
 * 雪天效果配置接口
 * 
 * @description
 * 扩展基础天气配置，添加雪花专属参数。
 * 
 * @example
 * ```typescript
 * const snowConfig: SnowConfig = {
 *   intensity: 0.6,
 *   speed: 0.8,
 *   flakeSize: 0.02,
 *   flakeTexture: '/assets/snowflake.png',
 * };
 * ```
 */
export interface SnowConfig extends WeatherBaseConfig {
  /** 雪花尺寸 */
  flakeSize?: number;
  /** 雪花纹理 URL 地址 */
  flakeTexture?: string;
  /** 地面累积率 (0-1)，控制雪花在地表的可见程度 */
  accumulation?: number;
  /** 风向角度（度） */
  windDirection?: number;
  /** 风速倍率 */
  windSpeed?: number;
}

/**
 * 雾天效果配置接口
 * 
 * @description
 * 扩展基础天气配置，添加雾气专属参数。
 * 
 * @example
 * ```typescript
 * const fogConfig: FogConfig = {
 *   intensity: 0.5,
 *   density: 0.0003,
 *   color: 'rgba(200,210,220,0.7)',
 *   minHeight: 0,
 *   maxHeight: 500,
 * };
 * ```
 */
export interface FogConfig extends WeatherBaseConfig {
  /** 雾密度，控制可见距离的衰减率 */
  density?: number;
  /** 雾的颜色 (CSS 颜色字符串) */
  color?: string;
  /** 雾的底部高度（米） */
  minHeight?: number;
  /** 雾的顶部高度（米） */
  maxHeight?: number;
}

/**
 * 天气效果状态变更回调类型
 * 
 * @description
 * 当天气效果的状态发生变化时触发的回调函数。
 * 
 * @param {WeatherState} previousState - 变更前的状态
 * @param {WeatherState} currentState - 变更后的状态
 */
export type WeatherStateListener = (previousState: WeatherState, currentState: WeatherState) => void;

/**
 * 天气效果配置变更回调类型
 * 
 * @description
 * 当天气效果的配置参数被更新时触发的回调函数。
 * 
 * @param {string[]} changedKeys - 发生变更的配置字段名称列表
 */
export type WeatherConfigListener = (changedKeys: string[]) => void;

/**
 * 天气效果抽象基类
 * 
 * @description
 * 为所有天气效果（雨、雪、雾等）提供统一的接口规范和生命周期管理。
 * 采用**模板方法模式**，定义了天气效果的通用流程骨架，
 * 派生类只需实现核心渲染钩子即可。
 * 
 * **核心功能：**
 * - 标准化的生命周期管理（初始化 → 启动 → 运行 → 停止 → 销毁）
 * - 统一的配置参数更新机制
 * - 状态变更通知
 * - 暂停/恢复支持
 * 
 * **扩展性设计：**
 * - 泛型配置参数 `TConfig` 允许每种天气效果定义专属配置
 * - 通过 `WeatherType` 枚举实现判别联合
 * - 状态机确保所有派生类遵循一致的生命周期约束
 * 
 * @typeParam TConfig - 天气效果的具体配置类型，必须继承自 WeatherBaseConfig
 * 
 * @example
 * ```typescript
 * // 自定义雨水效果
 * class RainWeatherEffect extends WeatherEffect<RainConfig> {
 *   readonly type = WeatherType.Rain;
 * 
 *   protected async _onInit(): Promise<void> {
 *     // 初始化雨滴粒子系统、着色器等资源
 *   }
 * 
 *   protected _onStart(): void {
 *     // 将雨滴粒子添加到场景中
 *   }
 * 
 *   protected _onStop(): void {
 *     // 从场景中移除雨滴粒子
 *   }
 * 
 *   protected _onDispose(): void {
 *     // 释放 GPU 资源、纹理等
 *   }
 * 
 *   protected _onConfigUpdate(changedKeys: string[]): void {
 *     // 响应配置变更，例如动态调整雨量强度
 *   }
 * }
 * ```
 */
export abstract class WeatherEffect<TConfig extends WeatherBaseConfig> {
  /** 天气效果的类型标识 */
  abstract readonly type: WeatherType;

  /** 当前生命周期状态 */
  private _state: WeatherState = WeatherState.Idle;

  /** 状态变更监听器集合 */
  private readonly _stateListeners = new Set<WeatherStateListener>();

  /** 配置变更监听器集合 */
  private readonly _configListeners = new Set<WeatherConfigListener>();

  /**
   * @param viewer - Cesium Viewer 句柄，用于访问场景和渲染上下文
   * @param config - 天气效果的初始配置参数
   */
  constructor(
    protected readonly viewer: CesiumViewerHandle,
    protected config: TConfig,
  ) {}

  /**
   * 获取当前生命周期状态
   */
  get state(): WeatherState {
    return this._state;
  }

  /**
   * 获取当前配置的只读副本
   * 
   * @description
   * 返回配置对象的一个浅拷贝，防止外部直接修改内部配置。
   * 如需更新配置，请使用 `updateConfig` 方法。
   */
  get currentConfig(): Readonly<TConfig> {
    return { ...this.config };
  }

  /**
   * 初始化天气效果
   * 
   * @description
   * 加载天气效果所需的资源（着色器、纹理、几何体等）。
   * 仅在 `Idle` 或 `Stopped` 状态下可调用。
   * 
   * @throws {Error} 如果在非法的状态下调用
   * @returns {Promise<void>} 初始化完成后的 Promise
   */
  async init(): Promise<void> {
    if (this._state !== WeatherState.Idle && this._state !== WeatherState.Stopped) {
      throw new Error(
        `[WeatherEffect] 不能在 "${this._state}" 状态下执行 init()，` +
        `仅允许在 "${WeatherState.Idle}" 或 "${WeatherState.Stopped}" 状态下调用`,
      );
    }
    this._transitionTo(WeatherState.Initializing);
    try {
      await this._onInit();
      this._transitionTo(WeatherState.Idle);
    } catch (error) {
      this._transitionTo(WeatherState.Error);
      throw error;
    }
  }

  /**
   * 启动天气效果渲染
   * 
   * @description
   * 将天气效果添加到场景中开始渲染。
   * 仅在 `Idle` 或 `Paused` 状态下可调用。
   * 如果当前状态为 `Idle` 且尚未初始化，会自动调用 `init()`。
   * 
   * @throws {Error} 如果在非法的状态下调用
   */
  async start(): Promise<void> {
    if (this._state === WeatherState.Running) return;
    if (this._state === WeatherState.Initializing) {
      throw new Error(
        `[WeatherEffect] 不能在 "${WeatherState.Initializing}" 状态下执行 start()，` +
        `请等待初始化完成`,
      );
    }
    if (this._state === WeatherState.Stopping) {
      throw new Error(
        `[WeatherEffect] 不能在 "${WeatherState.Stopping}" 状态下执行 start()，` +
        `请等待停止完成`,
      );
    }
    if (this._state === WeatherState.Error) {
      throw new Error(
        `[WeatherEffect] 不能在 "${WeatherState.Error}" 状态下执行 start()，` +
        `请先调用 init() 重新初始化`,
      );
    }
    if (this._state === WeatherState.Idle) {
      await this.init();
    }
    this._onStart();
    this._transitionTo(WeatherState.Running);
  }

  /**
   * 停止天气效果渲染
   * 
   * @description
   * 从场景中移除天气效果，但不释放已加载的资源。
   * 停止后可以再次调用 `start()` 恢复渲染。
   * 仅在 `Running` 或 `Paused` 状态下可调用。
   * 
   * @throws {Error} 如果在非法的状态下调用
   */
  stop(): void {
    if (this._state === WeatherState.Idle || this._state === WeatherState.Stopped) return;
    if (this._state === WeatherState.Initializing) {
      throw new Error(
        `[WeatherEffect] 不能在 "${WeatherState.Initializing}" 状态下执行 stop()，` +
        `请等待初始化完成`,
      );
    }
    if (this._state === WeatherState.Stopping) return;
    this._transitionTo(WeatherState.Stopping);
    try {
      this._onStop();
      this._transitionTo(WeatherState.Stopped);
    } catch (error) {
      this._transitionTo(WeatherState.Error);
      throw error;
    }
  }

  /**
   * 暂停天气效果渲染
   * 
   * @description
   * 临时暂停渲染，保留所有已加载的资源。
   * 仅在 `Running` 状态下可调用。
   */
  pause(): void {
    if (this._state !== WeatherState.Running) return;
    this._onPause();
    this._transitionTo(WeatherState.Paused);
  }

  /**
   * 恢复天气效果渲染
   * 
   * @description
   * 从暂停状态恢复渲染。
   * 仅在 `Paused` 状态下可调用。
   */
  resume(): void {
    if (this._state !== WeatherState.Paused) return;
    this._onResume();
    this._transitionTo(WeatherState.Running);
  }

  /**
   * 更新天气效果配置参数
   * 
   * @description
   * 在运行时动态更新一个或多个配置项。
   * 传入的配置会与当前配置进行浅合并。
   * 更新时会触发配置变更通知，通知中包含变更的字段名称列表。
   * 
   * @param {Partial<TConfig>} partialConfig - 要更新的配置项（部分更新）
   * 
   * @example
   * ```typescript
   * rainEffect.updateConfig({ intensity: 0.9, windSpeed: 0.5 });
   * ```
   */
  updateConfig(partialConfig: Partial<TConfig>): void {
    const changedKeys: string[] = [];
    for (const key of Object.keys(partialConfig) as (keyof TConfig)[]) {
      if (partialConfig[key] !== undefined && partialConfig[key] !== this.config[key]) {
        (this.config as Record<keyof TConfig, unknown>)[key] = partialConfig[key]!;
        changedKeys.push(key as string);
      }
    }
    if (changedKeys.length > 0) {
      this._onConfigUpdate(changedKeys);
      this._notifyConfigListeners(changedKeys);
    }
  }

  /**
   * 销毁天气效果并释放所有资源
   * 
   * @description
   * 完全销毁天气效果，释放 GPU 资源、纹理、几何体等。
   * 销毁后如需重新使用，必须再次调用 `init()`。
   * 可从任意非 `Idle` 状态调用。
   */
  dispose(): void {
    if (this._state === WeatherState.Idle) return;
    if (this._state === WeatherState.Running || this._state === WeatherState.Paused) {
      this._onStop();
    }
    this._onDispose();
    this._stateListeners.clear();
    this._configListeners.clear();
    this._transitionTo(WeatherState.Idle);
  }

  /**
   * 添加状态变更监听器
   * 
   * @param {WeatherStateListener} listener - 状态变更回调
   * @returns {Off} 取消订阅函数
   */
  onStateChange(listener: WeatherStateListener): Off {
    this._stateListeners.add(listener);
    return () => {
      this._stateListeners.delete(listener);
    };
  }

  /**
   * 添加配置变更监听器
   * 
   * @param {WeatherConfigListener} listener - 配置变更回调
   * @returns {Off} 取消订阅函数
   */
  onConfigChange(listener: WeatherConfigListener): Off {
    this._configListeners.add(listener);
    return () => {
      this._configListeners.delete(listener);
    };
  }

  // ───────── 抽象钩子（派生类必须实现）─────────

  /**
   * 初始化钩子
   * 
   * @description
   * 派生类在此方法中完成资源加载，包括：
   * - 着色器编译与链接
   * - 纹理加载
   * - 几何体创建
   * - 粒子系统初始化
   * 
   * @protected
   * @returns {Promise<void>}
   */
  protected abstract _onInit(): Promise<void>;

  /**
   * 启动钩子
   * 
   * @description
   * 派生类在此方法中将已加载的天气效果添加到 Cesium 场景中开始渲染。
   * 
   * @protected
   */
  protected abstract _onStart(): void;

  /**
   * 停止钩子
   * 
   * @description
   * 派生类在此方法中将天气效果从 Cesium 场景中移除，但不释放基础资源。
   * 
   * @protected
   */
  protected abstract _onStop(): void;

  /**
   * 销毁钩子
   * 
   * @description
   * 派生类在此方法中释放所有 GPU 资源和内存占用。
   * 此方法在 `dispose()` 中被调用，会在 stop 之后执行。
   * 
   * @protected
   */
  protected abstract _onDispose(): void;

  // ───────── 可选钩子（派生类按需覆写）─────────

  /**
   * 暂停钩子（可选覆写）
   * 
   * @description
   * 派生类可覆写此方法以实现暂停逻辑，
   * 例如停止动画循环或隐藏粒子系统。
   * 
   * @protected
   */
  protected _onPause(): void {
    // 默认无操作
  }

  /**
   * 恢复钩子（可选覆写）
   * 
   * @description
   * 派生类可覆写此方法以实现恢复逻辑，
   * 例如重新启动动画循环或显示粒子系统。
   * 
   * @protected
   */
  protected _onResume(): void {
    // 默认无操作
  }

  /**
   * 配置更新钩子（可选覆写）
   * 
   * @description
   * 派生类可覆写此方法以响应配置变更。
   * 例如根据新的 `intensity` 值调整粒子发射率。
   * 
   * @param {string[]} _changedKeys - 发生变更的配置字段名称
   * 
   * @protected
   */
  protected _onConfigUpdate(_changedKeys: string[]): void {
    // 默认无操作
  }

  // ───────── 内部方法 ─────────

  /**
   * 执行状态转换并通知所有监听器
   * 
   * @internal
   */
  private _transitionTo(nextState: WeatherState): void {
    const previousState = this._state;
    this._state = nextState;
    this._notifyStateListeners(previousState, nextState);
  }

  /**
   * 通知所有状态变更监听器
   * 
   * @internal
   */
  private _notifyStateListeners(previousState: WeatherState, currentState: WeatherState): void {
    for (const listener of this._stateListeners) {
      try {
        listener(previousState, currentState);
      } catch {
        // 静默吞掉监听器异常，避免影响状态机流程
      }
    }
  }

  /**
   * 通知所有配置变更监听器
   * 
   * @internal
   */
  private _notifyConfigListeners(changedKeys: string[]): void {
    for (const listener of this._configListeners) {
      try {
        listener(changedKeys);
      } catch {
        // 静默吞掉监听器异常
      }
    }
  }
}

/**
 * 天气效果管理器接口
 * 
 * @description
 * 定义管理多个天气效果的统一接口，负责天气效果的：
 * - **叠加**：同时激活多种天气效果（如雨 + 雾）
 * - **切换**：在不同天气效果之间平滑过渡
 * - **生命周期编排**：批量启动、停止、销毁
 * 
 * 实现类可以在此基础上提供渐变过渡、优先级调度等高级特性。
 * 
 * @example
 * ```typescript
 * const manager: WeatherManager = new WeatherEffectManagerImpl();
 * 
 * // 叠加：同时启用雨和雾
 * await manager.apply([rainEffect, fogEffect]);
 * 
 * // 切换：从雨切换到雪
 * await manager.transition(rainEffect, snowEffect, { duration: 2000 });
 * ```
 */
export interface WeatherManager {
  /**
   * 激活一组天气效果（叠加模式）
   *
   * @description
   * 同时启动多个天气效果，实现叠加渲染。
   * 如果某个效果已在运行中，则跳过。
   *
   * @param {WeatherEffect<WeatherBaseConfig>[]} effects - 要激活的天气效果数组
   * @returns {Promise<void>}
   */
  apply(effects: WeatherEffect<WeatherBaseConfig>[]): Promise<void>;

  /**
   * 停用一组天气效果
   *
   * @description
   * 停止指定的一组天气效果，但不释放资源。
   *
   * @param {WeatherEffect<WeatherBaseConfig>[]} effects - 要停用的天气效果数组
   */
  dismiss(effects: WeatherEffect<WeatherBaseConfig>[]): void;

  /**
   * 天气效果切换
   *
   * @description
   * 从当前天气效果平滑过渡到目标天气效果。
   * 过渡期间两个效果可能同时存在，具体行为由实现类决定。
   *
   * @param {WeatherEffect<WeatherBaseConfig>} from - 要退出的天气效果（可以为 null，表示无当前效果）
   * @param {WeatherEffect<WeatherBaseConfig>} to - 要进入的天气效果
   * @param {WeatherTransitionOptions} [options] - 过渡选项
   * @returns {Promise<void>}
   */
  transition(
    from: WeatherEffect<WeatherBaseConfig> | null,
    to: WeatherEffect<WeatherBaseConfig>,
    options?: WeatherTransitionOptions,
  ): Promise<void>;

  /**
   * 获取当前处于运行状态的所有天气效果
   *
   * @returns {WeatherEffect<WeatherBaseConfig>[]} 运行中的天气效果数组
   */
  getActiveEffects(): WeatherEffect<WeatherBaseConfig>[];

  /**
   * 停止并销毁所有天气效果
   */
  disposeAll(): void;
}

/**
 * 天气效果管理器接口（扩展 WeatherManager）
 *
 * @description
 * 在 `WeatherManager` 基础上增加：
 * - 按类型查询/操作效果
 * - 添加/移除单个效果实例
 * - 启用/禁用单个效果
 * - 从配置数组批量初始化
 *
 * @example
 * ```typescript
 * const manager: WeatherEffectManager = handle.weatherEffectManager;
 *
 * // 从配置初始化
 * await manager.initFromConfigs([
 *   { type: WeatherType.Rain, intensity: 0.8 },
 *   { type: WeatherType.Fog, density: 0.0003 },
 * ]);
 *
 * // 按类型操作
 * manager.enableEffect(WeatherType.Rain);
 * manager.disableEffect(WeatherType.Fog);
 *
 * // 查询
 * const rainEffect = manager.getEffectByType(WeatherType.Rain);
 * const allActive = manager.getActiveEffects();
 * ```
 */
export interface WeatherEffectManager extends WeatherManager {
  /**
   * 从配置数组批量创建并注册天气效果实例
   *
   * @param configs - 天气效果配置数组（可以是配置对象或已实例化的 WeatherEffect）
   */
  initFromConfigs(configs: WeatherEffectConfig[]): Promise<void>;

  /**
   * 添加一个天气效果实例到管理器
   *
   * @param effect - 天气效果实例
   */
  addEffect(effect: WeatherEffect<WeatherBaseConfig>): void;

  /**
   * 移除并销毁指定的天气效果实例
   *
   * @param effect - 要移除的天气效果实例
   */
  removeEffect(effect: WeatherEffect<WeatherBaseConfig>): void;

  /**
   * 启用指定类型的天气效果（启动渲染）
   *
   * @param type - 天气效果类型
   * @returns 是否成功启用（如果该类型不存在则返回 false）
   */
  enableEffect(type: WeatherType): Promise<boolean>;

  /**
   * 禁用指定类型的天气效果（停止渲染但保留资源）
   *
   * @param type - 天气效果类型
   * @returns 是否成功禁用
   */
  disableEffect(type: WeatherType): boolean;

  /**
   * 按类型获取天气效果实例
   *
   * @param type - 天气效果类型
   * @returns 对应类型的天气效果实例，不存在则返回 undefined
   */
  getEffectByType(type: WeatherType): WeatherEffect<WeatherBaseConfig> | undefined;

  /**
   * 获取所有已注册的天气效果实例（包括未激活的）
   */
  getAllEffects(): WeatherEffect<WeatherBaseConfig>[];
}

/**
 * 天气效果切换选项接口
 * 
 * @description
 * 定义天气效果切换过程中的可选参数。
 * 
 * @property {number} [duration=1000] - 过渡动画持续时间（毫秒）
 * @property {boolean} [keepBase=false] - 是否保留原效果的基础资源以避免重新加载
 */
export interface WeatherTransitionOptions {
  /** 过渡动画持续时间（毫秒） */
  duration?: number;
  /** 是否保留原效果的基础资源 */
  keepBase?: boolean;
}