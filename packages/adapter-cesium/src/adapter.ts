/**
 * @fileoverview Cesium 引擎适配器模块
 * 提供将 Cesium Viewer 封装为统一 EngineAdapter 接口的实现
 *
 * @module adapter
 * @description
 * 该模块是 Cesium 适配器的核心实现，负责：
 * - 将通用的图层/要素渲染规格转换为 Cesium 原生对象
 * - 管理 Entity 和 Primitive 的生命周期
 * - 处理坐标转换和位置计算
 * - 提供拾取（Picking）功能的桥接
 */

import * as Cesium from 'cesium';
import type {
  BasemapSpec,
  BingBasemapSpec,
  PresetBasemapSpec,
  DataLayerRenderSpec,
  EngineAdapter,
  FeatureRenderSpec,
  GraphicLayerRenderSpec,
  GraphicRenderMode,
  LabelRenderSpec,
  LngLat,
  LayerRenderSpec,
  ModelFeatureRenderSpec,
  ScreenPoint,
  CgxViewerRuntimeOptions as CoreViewerOptions,
  TerrainOptions as CoreTerrainOptions,
  SceneOptions as CoreSceneOptions,
  CesiumRuntime,
} from './types';
import { toCartesian3 } from './coord';
import { LayerBridge } from './layer';
import { resolveProvider } from './handles/_provider';
import {
  createImageryLayerHandle,
  createTerrainLayerHandle,
  createTilesetLayerHandle,
  createDataSourceLayerHandle,
  createGraphicLayerHandle,
  createEntityFeatureHandle,
  createPrimitiveFeatureHandle,
  createBatchedPrimitiveFeatureHandle,
  createWeatherEffectHandle,
} from './handles';
import { PickingBridge } from './picking';
import type { CesiumViewerHandle, CesiumViewerOptions } from './types';
import type { LayerHandle, FeatureHandle } from '@cgx/core';
import { createViewer, _getInternalViewer } from './viewer';

// Re-export internal classes (moved to handles/_internal-classes in Task 8b).
// Kept here so handles/feature-entity, handles/feature-primitive, handles/layer can keep importing from '../adapter'.
// stage 3 boundary lockdown 会把这些 re-export 收回到 internal-only 入口。
export {
  FeatureEntity,
  ModelPrimitive,
  PrimitiveFeatureBatch,
  GraphicLayerMount,
} from './handles/_internal-classes';

type MountedLayerEntry = {
  spec: LayerRenderSpec;
  handle: LayerHandle;
};

function isPresetBasemapSpec(value: BasemapSpec): value is PresetBasemapSpec {
  return !('kind' in value);
}

function gaodeStyleToUrl(style: string | undefined): string {
  const code = style === 'img'
    ? 6
    : style === 'road'
      ? 8
      : 7;
  return `https://webrd0{s}.is.autonavi.com/appmaptile?style=${code}&x={x}&y={y}&z={z}`;
}

function baiduStyleToUrl(style: string | undefined): string {
  const custom = style === 'dark' ? 'dark' : style === 'custom' ? 'custom' : 'normal';
  return `https://maponline{s}.bdimg.com/tile/?qt=tile&x={x}&y={y}&z={z}&styles=${custom}`;
}

function tiandituTypeToLayer(type: string | undefined): string {
  if (type === 'img') return 'img';
  if (type === 'ter') return 'ter';
  return 'vec';
}

function withImageryLayerBase(spec: PresetBasemapSpec): Omit<Extract<LayerRenderSpec, { kind: 'imagery' }>, 'provider'> {
  const base: Omit<Extract<LayerRenderSpec, { kind: 'imagery' }>, 'provider'> = {
    id: spec.id,
    kind: 'imagery',
  };
  if (spec.visible !== undefined) base.visible = spec.visible;
  if (spec.opacity !== undefined) base.opacity = spec.opacity;
  if (spec.zIndex !== undefined) base.zIndex = spec.zIndex;
  return base;
}

function normalizeBasemapSpec(spec: BasemapSpec): LayerRenderSpec {
  if (!isPresetBasemapSpec(spec)) return spec;

  const base = withImageryLayerBase(spec);

  if (spec.provider === 'gaode') {
    return {
      ...base,
      provider: {
        type: 'xyz',
        url: gaodeStyleToUrl(spec.style),
        subdomains: ['1', '2', '3', '4'],
      },
    };
  }

  if (spec.provider === 'baidu') {
    return {
      ...base,
      provider: {
        type: 'xyz',
        url: baiduStyleToUrl(spec.style),
        subdomains: ['0', '1', '2', '3'],
      },
    };
  }

  if (spec.provider === 'tianditu') {
    return {
      ...base,
      provider: {
        type: 'xyz',
        url: `https://t{s}.tianditu.gov.cn/${tiandituTypeToLayer(spec.type)}_w/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=${tiandituTypeToLayer(spec.type)}&STYLE=default&TILEMATRIXSET=w&FORMAT=tiles&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&tk=${spec.token}`,
        subdomains: ['0', '1', '2', '3', '4', '5', '6', '7'],
      },
    };
  }

  return {
    ...base,
    provider: spec,
  };
}

function isSkyboxSources(value: unknown): value is Record<string, string> {
  if (!value || typeof value !== 'object') return false;
  const required = ['positiveX', 'negativeX', 'positiveY', 'negativeY', 'positiveZ', 'negativeZ'] as const;
  return required.every((key) => typeof (value as Record<string, unknown>)[key] === 'string');
}

function applySceneOptions(viewer: Cesium.Viewer, scene: CoreSceneOptions | undefined): void {
  if (!scene) return;

  if (scene.resolutionScale !== undefined) {
    viewer.resolutionScale = scene.resolutionScale;
  }

  if (scene.center && typeof viewer.camera.setView === 'function') {
    const destination = toCartesian3(scene.center) as unknown as Cesium.Cartesian3;
    const orientation = scene.center.heading !== undefined
      || scene.center.pitch !== undefined
      || scene.center.roll !== undefined
      ? {
        heading: Cesium.Math.toRadians(scene.center.heading ?? 0),
        pitch: Cesium.Math.toRadians(scene.center.pitch ?? -90),
        roll: Cesium.Math.toRadians(scene.center.roll ?? 0),
      }
      : undefined;
    if (orientation) {
      viewer.camera.setView({
        destination,
        orientation,
      });
    } else {
      viewer.camera.setView({ destination });
    }
  }

  const bgType = scene.bgType ?? 'skybox';
  if (bgType === 'color' && scene.bgColor) {
    viewer.scene.backgroundColor = Cesium.Color.fromCssColorString(scene.bgColor);
    viewer.scene.skyBox = undefined;
    return;
  }

  if (bgType === 'image' && scene.bgImage) {
    if (typeof scene.bgImage === 'string') {
      viewer.scene.skyBox = new Cesium.SkyBox({
        sources: {
          positiveX: scene.bgImage,
          negativeX: scene.bgImage,
          positiveY: scene.bgImage,
          negativeY: scene.bgImage,
          positiveZ: scene.bgImage,
          negativeZ: scene.bgImage,
        },
      });
      return;
    }
    if (isSkyboxSources(scene.bgImage)) {
      viewer.scene.skyBox = new Cesium.SkyBox({
        sources: scene.bgImage,
      });
      return;
    }
  }

  if (scene.bgImage && isSkyboxSources(scene.bgImage)) {
    viewer.scene.skyBox = new Cesium.SkyBox({
      sources: scene.bgImage,
    });
  }
}

function resolveTerrainProvider(terrain: CoreTerrainOptions | undefined): unknown {
  if (!terrain) return undefined;
  if (terrain.provider !== undefined) return resolveProvider(terrain.provider);
  if (terrain.url) {
    const options: Record<string, unknown> = {
      ...(terrain.options ?? {}),
    };
    if (terrain.requestVertexNormals !== undefined) options.requestVertexNormals = terrain.requestVertexNormals;
    if (terrain.requestWaterMask !== undefined) options.requestWaterMask = terrain.requestWaterMask;
    return Cesium.CesiumTerrainProvider.fromUrl(terrain.url, options);
  }
  return undefined;
}

/**
 * 类型守卫：判断值是否为经纬度坐标对象
 *
 * @param value - 待检测的值
 * @returns {boolean} 如果值包含 lng 和 lat 属性则返回 true
 */
function isLngLat(value: unknown): value is { lng: number; lat: number; alt?: number } {
  return !!value && typeof value === 'object' && 'lng' in value && 'lat' in value;
}

/**
 * 将通用位置值转换为 Cesium 笛卡尔3坐标
 *
 * @description
 * 支持以下输入格式：
 * - 数组 [lng, lat, alt?]
 * - LngLat 对象 { lng, lat, alt? }
 * - 已经是 Cesium 坐标的值（直接返回）
 *
 * @param value - 待转换的位置值
 * @returns {unknown} Cesium 笛卡尔3坐标或原始值
 */
export function toCesiumPosition(value: unknown): unknown {
  if (Array.isArray(value)) {
    const [lng, lat, alt] = value;
    if (typeof lng === 'number' && typeof lat === 'number') {
      return toCartesian3({ lng, lat, alt: typeof alt === 'number' ? alt : 0 });
    }
  }

  if (isLngLat(value)) {
    return toCartesian3(value);
  }

  return value;
}

/**
 * 批量将位置数组转换为 Cesium 笛卡尔3坐标
 *
 * @param values - 位置值数组，可以为 undefined
 * @returns {unknown[] | undefined} 转换后的坐标数组，输入为 undefined 时返回 undefined
 */
export function toCesiumPositions(values: unknown[] | undefined): unknown[] | undefined {
  return values?.map((value) => toCesiumPosition(value));
}

/**
 * 类型守卫：判断值是否为数字元组 [number, number, number?]
 *
 * @param value - 待检测的值
 * @returns {boolean} 如果值是数组且前两个元素为数字则返回 true
 */
function isNumberTuple(value: unknown): value is [number, number, number?] {
  return Array.isArray(value) && typeof value[0] === 'number' && typeof value[1] === 'number';
}

/**
 * 将通用位置值转换为坐标元组 [lng, lat, alt]
 *
 * @param value - 待转换的位置值，支持数组或 LngLat 对象
 * @returns {[number, number, number] | undefined} 坐标元组，无法转换时返回 undefined
 */
function toCoordinateTuple(value: unknown): [number, number, number] | undefined {
  if (isNumberTuple(value)) {
    return [value[0], value[1], typeof value[2] === 'number' ? value[2] : 0];
  }

  if (isLngLat(value)) {
    return [value.lng, value.lat, value.alt ?? 0];
  }

  return undefined;
}

/**
 * 计算多个位置的平均坐标
 *
 * @description
 * 用于计算多边形等面状要素的中心点位置。
 * 将所有有效坐标求平均值，如果没有有效坐标则返回第一个原始值。
 *
 * @param values - 位置值数组
 * @returns {unknown | undefined} 平均位置坐标，数组为空时返回 undefined
 */
function averagePositions(values: unknown[]): unknown | undefined {
  const coords = values.map(toCoordinateTuple).filter((coord): coord is [number, number, number] => !!coord);
  if (coords.length === 0) return values[0];

  const sum = coords.reduce<[number, number, number]>((acc, coord) => {
    acc[0] += coord[0];
    acc[1] += coord[1];
    acc[2] += coord[2];
    return acc;
  }, [0, 0, 0]);

  return [sum[0] / coords.length, sum[1] / coords.length, sum[2] / coords.length];
}

/**
 * 计算位置数组的中点坐标
 *
 * @description
 * 用于计算线状要素（如折线）的中点位置。
 * 对于偶数长度的数组，取中间两个位置的平均值。
 *
 * @param values - 位置值数组
 * @returns {unknown | undefined} 中点位置坐标，数组为空时返回 undefined
 */
function midpointPosition(values: unknown[]): unknown | undefined {
  if (values.length === 0) return undefined;
  if (values.length === 1) return values[0];

  const left = values[Math.floor((values.length - 1) / 2)];
  const right = values[Math.ceil((values.length - 1) / 2)];
  if (left === right) return left;

  const leftCoord = toCoordinateTuple(left);
  const rightCoord = toCoordinateTuple(right);
  if (!leftCoord || !rightCoord) return left;

  return [
    (leftCoord[0] + rightCoord[0]) / 2,
    (leftCoord[1] + rightCoord[1]) / 2,
    (leftCoord[2] + rightCoord[2]) / 2,
  ];
}

/**
 * 从要素渲染规格中提取位置数组
 *
 * @param spec - 要素渲染规格
 * @returns {unknown[]} 位置数组，不支持的要素类型返回空数组
 */
export function positionsFromSpec(spec: FeatureRenderSpec): unknown[] {
  if (spec.kind === 'polyline') {
    return spec.positions ?? (spec.polyline?.positions as unknown[] | undefined) ?? [];
  }
  if (spec.kind === 'polygon') {
    return spec.positions ?? (spec.polygon?.hierarchy as unknown[] | undefined) ?? [];
  }
  return [];
}

/**
 * 解析标签的显示位置
 *
 * @description
 * 根据要素类型和配置确定标签的最优显示位置：
 * - 优先使用 label.position 显式指定的位置
 * - 文本/标签类型使用要素自身的 position
 * - 折线类型使用中点位置
 * - 多边形类型使用中心点位置
 *
 * @param spec - 要素渲染规格
 * @returns {unknown | undefined} 标签位置，无法确定时返回 undefined
 */
export function resolveLabelPosition(spec: FeatureRenderSpec): unknown | undefined {
  if (spec.label?.position !== undefined) return spec.label.position;
  if (spec.kind === 'text' || spec.kind === 'label') return spec.position;
  if ('position' in spec && spec.position !== undefined) return spec.position;
  if (spec.kind === 'polyline') return midpointPosition(positionsFromSpec(spec));
  if (spec.kind === 'polygon') return averagePositions(positionsFromSpec(spec));
  return undefined;
}

function isCartesian2Like(value: unknown): value is { x: number; y: number } {
  return !!value
    && typeof value === 'object'
    && 'x' in value
    && 'y' in value
    && typeof value.x === 'number'
    && typeof value.y === 'number';
}

function isCartesian3Like(value: unknown): value is { x: number; y: number; z: number } {
  return isCartesian2Like(value)
    && 'z' in value
    && typeof value.z === 'number';
}

function toCesiumCartesian2(value: unknown): unknown {
  if (Array.isArray(value) && typeof value[0] === 'number' && typeof value[1] === 'number') {
    return new Cesium.Cartesian2(value[0], value[1]);
  }

  if (isCartesian2Like(value)) return value;

  return value;
}

function toCesiumCartesian3(value: unknown): unknown {
  if (
    Array.isArray(value)
    && typeof value[0] === 'number'
    && typeof value[1] === 'number'
    && typeof value[2] === 'number'
  ) {
    return new Cesium.Cartesian3(value[0], value[1], value[2]);
  }

  if (isCartesian3Like(value)) return value;

  return value;
}

/**
 * 将标签渲染规格转换为 Cesium 标签配置对象
 *
 * @description
 * 移除 position 属性（位置由 Entity 的 position 控制），
 * 返回其余标签样式配置。
 *
 * @param label - 标签渲染规格
 * @returns {Record<string, unknown> | undefined} Cesium 标签配置对象，输入为 undefined 时返回 undefined
 */
export function toCesiumLabel(label: LabelRenderSpec | undefined): Record<string, unknown> | undefined {
  if (!label) return undefined;
  const { position: _position, ...rest } = label;
  if (rest.pixelOffset !== undefined) {
    rest.pixelOffset = toCesiumCartesian2(rest.pixelOffset);
  }
  if (rest.eyeOffset !== undefined) {
    rest.eyeOffset = toCesiumCartesian3(rest.eyeOffset);
  }
  return rest;
}

/**
 * 解析要素的渲染模式
 *
 * @description
 * 确定要素应使用 Entity 还是 Primitive 模式渲染。
 * 优先级：要素自身的 renderMode > 模型配置的 renderMode > 图层默认模式
 * 'auto' 模式会被解析为 'entity'
 *
 * @param spec - 要素渲染规格
 * @param layerMode - 图层默认渲染模式，默认为 'entity'
 * @returns {GraphicRenderMode} 解析后的渲染模式
 */
export function resolveFeatureMode(spec: FeatureRenderSpec, layerMode: GraphicRenderMode = 'entity'): GraphicRenderMode {
  const mode = spec.kind === 'model'
    ? spec.model?.renderMode ?? spec.renderMode ?? layerMode
    : spec.renderMode ?? layerMode;

  return mode === 'auto' ? 'entity' : mode;
}

/**
 * 应用通用可见性配置到目标对象
 *
 * @param target - Cesium 对象（Entity、Primitive 等）
 * @param spec - 包含 visible 和 opacity 的配置对象
 */
export function applyCommonVisibility(target: Record<string, unknown> | null | undefined, spec: { visible?: boolean; opacity?: number }): void {
  if (!target) return;
  if (spec.visible !== undefined) target.show = spec.visible;
  if (spec.opacity !== undefined) target.opacity = spec.opacity;
}

/**
 * 根据要素渲染规格构建 Cesium Entity 构造选项
 *
 * @description
 * 将通用的 FeatureRenderSpec 转换为 Cesium Entity.ConstructorOptions，
 * 处理各种要素类型（点、线、面、模型、标签、广告牌）的配置映射。
 *
 * @param spec - 要素渲染规格
 * @returns {Cesium.Entity.ConstructorOptions} Cesium Entity 构造选项
 */
export function buildEntityOptions(spec: FeatureRenderSpec): Cesium.Entity.ConstructorOptions {
  const options: Cesium.Entity.ConstructorOptions = {
    id: spec.id,
  };

  if (spec.name !== undefined) options.name = spec.name;
  if (spec.properties !== undefined) options.properties = spec.properties as any;

  const labelPosition = resolveLabelPosition(spec);
  if ('position' in spec && spec.position !== undefined) {
    options.position = toCesiumPosition(spec.position) as any;
  } else if (spec.label && labelPosition !== undefined) {
    options.position = toCesiumPosition(labelPosition) as any;
  }

  if (spec.kind === 'point') {
    options.point = spec.point as any;
  } else if (spec.kind === 'polyline') {
    options.polyline = {
      ...(spec.polyline as Record<string, unknown> | undefined),
      positions: toCesiumPositions(spec.positions ?? (spec.polyline?.positions as unknown[] | undefined)),
    } as any;
  } else if (spec.kind === 'polygon') {
    options.polygon = {
      ...(spec.polygon as Record<string, unknown> | undefined),
      hierarchy: toCesiumPositions(spec.positions ?? (spec.polygon?.hierarchy as unknown[] | undefined)),
    } as any;
  } else if (spec.kind === 'model') {
    const { renderMode: _renderMode, ...model } = (spec.model ?? {}) as Record<string, unknown>;
    options.model = model as any;
  } else if (spec.kind === 'label' || spec.kind === 'text') {
    options.label = toCesiumLabel(spec.label) as any;
  } else if (spec.kind === 'billboard') {
    options.billboard = spec.billboard as any;
  }

  if (spec.kind !== 'label' && spec.kind !== 'text' && spec.label) {
    options.label = toCesiumLabel(spec.label) as any;
  }

  return options;
}


/**
 * 将 payload 转换为 Record 对象
 *
 * @param payload - 原始 payload 数据
 * @returns {Record<string, unknown>} 转换后的 Record 对象，非对象类型返回空对象
 */
export function payloadRecord(payload: unknown): Record<string, unknown> {
  return payload && typeof payload === 'object' ? payload as Record<string, unknown> : {};
}

/**
 * 原语批量渲染的要素类型
 */
export type PrimitiveBatchKind = 'point' | 'billboard' | 'label' | 'polyline' | 'polygon';

/**
 * 原语批量集合接口
 *
 * @description
 * 描述一个原语批量集合的状态，包含类型、原语实例和已添加的项目 ID 列表。
 */
export interface PrimitiveBatchCollection {
  /** 集合类型 */
  kind: PrimitiveBatchKind;
  /** Cesium 原语集合实例 */
  primitive: any;
  /** 已添加到集合中的项目 ID 列表，用于清理时解绑拾取数据 */
  itemIds: Array<string | number | symbol | object>;
}

/**
 * 获取指定批量类型对应的 Cesium 集合构造函数名称
 *
 * @param kind - 原语批量类型
 * @returns {string} Cesium 集合构造函数名称
 */
export function collectionCtorName(kind: PrimitiveBatchKind): string {
  if (kind === 'point') return 'PointPrimitiveCollection';
  if (kind === 'billboard') return 'BillboardCollection';
  if (kind === 'label') return 'LabelCollection';
  if (kind === 'polyline') return 'PolylineCollection';
  return 'Primitive';
}

/**
 * 创建指定类型的 Cesium 原语集合
 *
 * @description
 * 根据批量类型创建对应的 Cesium 集合实例。
 * 对于 polygon 类型，由于 Cesium 没有原生的 PolygonCollection，
 * 使用通用的 Primitive 作为后备方案。
 *
 * @param kind - 原语批量类型
 * @param id - 集合的唯一标识
 * @returns {any} Cesium 集合实例
 */
export function createPrimitiveCollection(kind: PrimitiveBatchKind, id: string): any {
  const ctorName = collectionCtorName(kind);
  const Ctor = Object.prototype.hasOwnProperty.call(Cesium, ctorName)
    ? (Cesium as any)[ctorName]
    : undefined;
  if (typeof Ctor === 'function' && kind !== 'polygon') {
    return new Ctor({ id });
  }

  return new Cesium.Primitive({
    id,
    kind: `${kind}-batch`,
    items: [],
  } as any);
}



/**
 * Cesium 引擎适配器配置选项
 *
 * @description
 * 扩展自 ViewerOptions，可选择传入已创建的 Viewer 句柄。
 */
export interface CesiumEngineAdapterOptions extends CesiumViewerOptions {
  /** 已创建的 Cesium Viewer 句柄，不传则在 initialize 时创建 */
  viewer?: CesiumViewerHandle;
}

/**
 * 创建基于 Cesium Viewer 的引擎适配器
 *
 * @description
 * 工厂函数，创建一个符合 EngineAdapter 接口的 Cesium 适配器实例。
 * 适配器负责将通用的图层/要素渲染规格转换为 Cesium 原生对象，
 * 并管理它们的生命周期。
 *
 * @param options - 适配器配置选项
 * @returns {EngineAdapter} 引擎适配器实例
 *
 * @example
 * ```typescript
 * const adapter = createCesiumAdapter({ animation: true, shouldAnimate: true });
 * adapter.initialize('cesiumContainer');
 *
 * // 挂载图层
 * const layer = adapter.mountLayer({
 *   kind: 'imagery',
 *   provider: someProvider,
 *   visible: true,
 * });
 *
 * // 挂载要素
 * const feature = adapter.mountFeature({
 *   id: 'point-1',
 *   kind: 'point',
 *   position: { lng: 116.39, lat: 39.91 },
 *   point: { pixelSize: 10 },
 * });
 *
 * // 销毁
 * adapter.dispose();
 * ```
 */
export function createCesiumAdapter(options: CesiumEngineAdapterOptions = {}): CesiumRuntime {
  const { viewer: providedViewer, ...viewerCtorOptions } = options;
  /** Viewer 句柄引用，可在初始化时传入或延迟创建 */
  let handle: CesiumViewerHandle | undefined = providedViewer;
  let ownsHandle = false;
  let mountedTerrain: LayerHandle | undefined;
  let mountedBasemaps: MountedLayerEntry[] = [];
  let mountedLayers: MountedLayerEntry[] = [];

  /**
   * 确保 Viewer 句柄已初始化
   *
   * @returns {CesiumViewerHandle} 有效的 Viewer 句柄
   * @throws {Error} 如果适配器尚未初始化
   */
  const ensureHandle = (): CesiumViewerHandle => {
    if (!handle) {
      throw new Error('Cesium adapter has not been initialized');
    }
    return handle;
  };

  /**
   * 挂载单个要素到场景
   *
   * @description
   * 根据要素的渲染模式选择不同的挂载策略：
   * - 模型 + Primitive 模式：使用 ModelPrimitive
   * - 非模型 + Primitive 模式：使用 PrimitiveFeatureBatch
   * - Entity 模式（默认）：使用 FeatureEntity
   *
   * @param spec - 要素渲染规格
   * @returns {Updatable<FeatureRenderSpec>} 要素句柄，支持更新和销毁
   */
  const mountFeatureSpec = (spec: FeatureRenderSpec): FeatureHandle => {
    const viewerHandle = ensureHandle();
    const mode = resolveFeatureMode(spec);
    if (spec.kind === 'model' && mode === 'primitive') {
      return createPrimitiveFeatureHandle(viewerHandle, spec);
    }
    if (spec.kind !== 'model' && mode === 'primitive') {
      return createBatchedPrimitiveFeatureHandle(viewerHandle, [spec]);
    }
    return createEntityFeatureHandle(viewerHandle, spec);
  };

  const mountLayerSpec = (spec: LayerRenderSpec): LayerHandle | undefined => {
    const viewerHandle = ensureHandle();
    if (spec.kind === 'imagery') return createImageryLayerHandle(viewerHandle, spec);
    if (spec.kind === 'terrain') return createTerrainLayerHandle(viewerHandle, spec);
    if (spec.kind === 'data') {
      if (spec.sourceType === 'geojson') return createDataSourceLayerHandle(viewerHandle, spec);
      return createTilesetLayerHandle(viewerHandle, spec);
    }
    if (spec.kind === 'graphic') return createGraphicLayerHandle(viewerHandle, spec, mountFeatureSpec as any);
    return undefined;
  };

  const disposeMountedEntries = (entries: MountedLayerEntry[]): void => {
    for (const entry of entries) {
      entry.handle.dispose();
    }
    entries.length = 0;
  };

  const mountInitialCollection = (layers: LayerRenderSpec[] | undefined): MountedLayerEntry[] => {
    if (!layers || layers.length === 0) return [];
    const entries: MountedLayerEntry[] = [];
    for (const layer of layers) {
      const mounted = mountLayerSpec(layer);
      if (mounted) {
        entries.push({ spec: layer, handle: mounted });
      }
    }
    return entries;
  };

  const bootstrapFromCoreOptions = async (coreOptions: CoreViewerOptions | undefined): Promise<void> => {
    if (!coreOptions) return;
    const viewer = _getInternalViewer(ensureHandle());
    if (!viewer) return;

    applySceneOptions(viewer, coreOptions.scene);

    if (mountedTerrain) {
      mountedTerrain.dispose();
      mountedTerrain = undefined;
    }
    disposeMountedEntries(mountedBasemaps);
    disposeMountedEntries(mountedLayers);

    const terrainProvider = resolveTerrainProvider(coreOptions.terrain);
    if (terrainProvider !== undefined) {
      const provider = await Promise.resolve(terrainProvider);
      const terrainHandle = mountLayerSpec({
        id: '__cgx_bootstrap_terrain__',
        kind: 'terrain',
        provider,
      });
      if (terrainHandle) mountedTerrain = terrainHandle;
    }

    mountedBasemaps = mountInitialCollection(coreOptions.basemaps?.map(normalizeBasemapSpec));
    mountedLayers = mountInitialCollection(coreOptions.layers);
  };

  return {
    kind: 'cesium',
    async initialize(container: string | HTMLElement, coreOptions?: CoreViewerOptions) {
      if (!handle) {
        handle = createViewer(container, viewerCtorOptions);
        ownsHandle = true;
      }
      await bootstrapFromCoreOptions(coreOptions);
    },
    async bootstrap(opts: CoreViewerOptions) {
      if (!handle) {
        handle = createViewer('', viewerCtorOptions);
        ownsHandle = true;
      }
      await bootstrapFromCoreOptions(opts);
    },
    async dispose() {
      if (mountedTerrain) {
        mountedTerrain.dispose();
        mountedTerrain = undefined;
      }
      disposeMountedEntries(mountedBasemaps);
      disposeMountedEntries(mountedLayers);
      if (ownsHandle) handle?.destroy();
      handle = undefined;
      ownsHandle = false;
    },
    mountLayer(spec: LayerRenderSpec) {
      const handle = mountLayerSpec(spec);
      if (!handle) {
        throw new Error(`Unsupported layer kind: ${(spec as { kind?: string }).kind ?? 'unknown'}`);
      }
      return handle;
    },
    unmountLayer(handleToUnmount) {
      handleToUnmount?.dispose();
    },
    mountFeature(spec: FeatureRenderSpec) {
      return mountFeatureSpec(spec);
    },
    unmountFeature(handleToUnmount) {
      handleToUnmount?.dispose();
    },
    mountWeatherEffect(spec) {
      return createWeatherEffectHandle(ensureHandle(), spec);
    },
    unmountWeatherEffect(handleToUnmount) {
      handleToUnmount?.dispose();
    },
    pickAt(point: ScreenPoint) {
      return PickingBridge.pick(ensureHandle(), point as unknown as Cesium.Cartesian2) as any;
    },
    project(position: LngLat) {
      return toCartesian3(position) as unknown as { x: number; y: number; z?: number };
    },
    unproject(p) {
      return { lng: p.x, lat: p.y, alt: p.z } as any;
    },
    unsafeNative() {
      return _getInternalViewer(ensureHandle());
    },
  } as CesiumRuntime;
}

export function createCesiumRuntime(handle: CesiumViewerHandle): CesiumRuntime {
  const runtime = createCesiumAdapter({ viewer: handle });
  return {
    kind: 'cesium',
    bootstrap(options: CoreViewerOptions) {
      return runtime.bootstrap(options);
    },
    dispose() {
      return runtime.dispose();
    },
    mountLayer(spec: LayerRenderSpec) {
      return runtime.mountLayer(spec);
    },
    unmountLayer(handleToUnmount) {
      return runtime.unmountLayer?.(handleToUnmount);
    },
    mountFeature(spec: FeatureRenderSpec) {
      return runtime.mountFeature(spec);
    },
    unmountFeature(handleToUnmount) {
      return runtime.unmountFeature?.(handleToUnmount);
    },
    mountWeatherEffect(spec) {
      return runtime.mountWeatherEffect(spec);
    },
    unmountWeatherEffect(handleToUnmount) {
      return runtime.unmountWeatherEffect?.(handleToUnmount);
    },
    pickAt(point: ScreenPoint) {
      return runtime.pickAt(point);
    },
    project(position: LngLat) {
      return runtime.project(position);
    },
    unproject(point) {
      return runtime.unproject(point);
    },
    unsafeNative() {
      return runtime.unsafeNative?.();
    },
  };
}
