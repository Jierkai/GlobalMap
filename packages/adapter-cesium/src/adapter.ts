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
  Updatable,
} from '@cgx/core';
import { toCartesian3 } from './coord';
import { EntityBase } from './entity';
import { LayerBridge } from './layer';
import { PickingBridge } from './picking';
import { PrimitiveBase } from './primitive';
import type { CesiumViewerHandle, ViewerOptions } from './types';
import { createViewer, _getInternalViewer } from './viewer';

/**
 * 图层句柄类型，扩展了 Updatable 接口并包含原始数据引用
 */
type LayerHandle = Updatable<LayerRenderSpec> & { raw?: unknown };

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
function toCesiumPosition(value: unknown): unknown {
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
function toCesiumPositions(values: unknown[] | undefined): unknown[] | undefined {
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
function positionsFromSpec(spec: FeatureRenderSpec): unknown[] {
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
function resolveLabelPosition(spec: FeatureRenderSpec): unknown | undefined {
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
function toCesiumLabel(label: LabelRenderSpec | undefined): Record<string, unknown> | undefined {
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
function resolveFeatureMode(spec: FeatureRenderSpec, layerMode: GraphicRenderMode = 'entity'): GraphicRenderMode {
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
function applyCommonVisibility(target: Record<string, unknown> | null | undefined, spec: { visible?: boolean; opacity?: number }): void {
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
function buildEntityOptions(spec: FeatureRenderSpec): Cesium.Entity.ConstructorOptions {
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
 * 要素实体类
 *
 * @description
 * 继承自 EntityBase，将 FeatureRenderSpec 转换为 Cesium Entity。
 * 负责管理单个要素的 Entity 生命周期和拾取绑定。
 */
class FeatureEntity extends EntityBase<Cesium.Entity.ConstructorOptions, Cesium.Entity> {
  /** 要素渲染规格 */
  private spec: FeatureRenderSpec;

  /**
   * 创建要素实体实例
   *
   * @param viewer - Cesium Viewer 句柄
   * @param spec - 要素渲染规格
   */
  constructor(viewer: CesiumViewerHandle, spec: FeatureRenderSpec) {
    super(viewer);
    this.spec = spec;
  }

  /**
   * 更新要素规格并同步到 Entity
   *
   * @param spec - 新的要素渲染规格
   */
  updateSpec(spec: FeatureRenderSpec): void {
    this.spec = spec;
    this.update(buildEntityOptions(spec));
    if (this.entity) PickingBridge.setFeature(this.entity, spec);
  }

  /**
   * 创建实体配置
   *
   * @returns {Cesium.Entity.ConstructorOptions} Cesium Entity 构造选项
   */
  protected _createEntityOptions(): Cesium.Entity.ConstructorOptions {
    return buildEntityOptions(this.spec);
  }

  /**
   * 挂载完成后的钩子，绑定拾取数据
   *
   * @param _viewer - Cesium Viewer 实例
   * @param entity - 挂载的 Entity 实例
   */
  protected _onAttach(_viewer: Cesium.Viewer, entity: Cesium.Entity): void {
    PickingBridge.setFeature(entity, this.spec);
  }

  /**
   * 卸载完成后的钩子，解绑拾取数据
   *
   * @param _viewer - Cesium Viewer 实例
   * @param entity - 卸载的 Entity 实例
   */
  protected _onDetach(_viewer: Cesium.Viewer, entity: Cesium.Entity): void {
    PickingBridge.removeFeature(entity);
  }
}

/**
 * 模型原语类
 *
 * @description
 * 继承自 PrimitiveBase，将 ModelFeatureRenderSpec 转换为 Cesium Primitive。
 * 用于以 Primitive 模式渲染 3D 模型要素。
 */
class ModelPrimitive extends PrimitiveBase<Cesium.Primitive> {
  /** 模型要素渲染规格 */
  private spec: ModelFeatureRenderSpec;

  /**
   * 创建模型原语实例
   *
   * @param viewer - Cesium Viewer 句柄
   * @param spec - 模型要素渲染规格
   */
  constructor(viewer: CesiumViewerHandle, spec: ModelFeatureRenderSpec) {
    super(viewer);
    this.spec = spec;
  }

  /**
   * 更新模型规格并同步到原语
   *
   * @param spec - 新的模型要素渲染规格
   */
  updateSpec(spec: ModelFeatureRenderSpec): void {
    this.spec = spec;
    const primitive = this.primitive as unknown as Record<string, unknown> | null;
    if (!primitive) return;
    primitive.position = toCesiumPosition(spec.position);
    primitive.model = spec.model;
    primitive.show = spec.model?.show ?? true;
    PickingBridge.setFeature(primitive, spec);
  }

  /**
   * 创建 Cesium 原语实例
   *
   * @returns {Cesium.Primitive} Cesium Primitive 实例
   */
  protected _createPrimitive(): Cesium.Primitive {
    return new Cesium.Primitive({
      id: this.spec.id,
      position: toCesiumPosition(this.spec.position),
      model: this.spec.model,
    } as any);
  }

  /**
   * 挂载完成后的钩子，绑定拾取数据
   *
   * @param _viewer - Cesium Viewer 实例
   * @param primitive - 挂载的 Primitive 实例
   */
  protected _onAttach(_viewer: Cesium.Viewer, primitive: Cesium.Primitive): void {
    PickingBridge.setFeature(primitive, this.spec);
  }

  /**
   * 卸载完成后的钩子，解绑拾取数据
   *
   * @param _viewer - Cesium Viewer 实例
   * @param primitive - 卸载的 Primitive 实例
   */
  protected _onDetach(_viewer: Cesium.Viewer, primitive: Cesium.Primitive): void {
    PickingBridge.removeFeature(primitive);
  }
}

/**
 * 解析提供者对象，提取原始提供者实例
 *
 * @description
 * 如果提供者对象包含 raw() 方法（如适配器包装对象），
 * 则调用 raw() 获取原始提供者实例。
 *
 * @param provider - 提供者对象或原始实例
 * @returns {unknown} 原始提供者实例
 */
function resolveProvider(provider: unknown): unknown {
  if (provider && typeof provider === 'object' && 'raw' in provider && typeof provider.raw === 'function') {
    return provider.raw();
  }

  return provider;
}

/**
 * 将 payload 转换为 Record 对象
 *
 * @param payload - 原始 payload 数据
 * @returns {Record<string, unknown>} 转换后的 Record 对象，非对象类型返回空对象
 */
function payloadRecord(payload: unknown): Record<string, unknown> {
  return payload && typeof payload === 'object' ? payload as Record<string, unknown> : {};
}

/**
 * 原语批量渲染的要素类型
 */
type PrimitiveBatchKind = 'point' | 'billboard' | 'label' | 'polyline' | 'polygon';

/**
 * 原语批量集合接口
 *
 * @description
 * 描述一个原语批量集合的状态，包含类型、原语实例和已添加的项目 ID 列表。
 */
interface PrimitiveBatchCollection {
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
function collectionCtorName(kind: PrimitiveBatchKind): string {
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
function createPrimitiveCollection(kind: PrimitiveBatchKind, id: string): any {
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
 * 原语要素批量管理器
 *
 * @description
 * 管理同一图层内多个要素的批量渲染。
 * 按要素类型（点、广告牌、标签、线、面）分组到不同的 Cesium 集合中，
 * 提供高效的批量更新和清理能力。
 */
class PrimitiveFeatureBatch {
  /** 按类型分组的原语集合映射 */
  private readonly collections = new Map<PrimitiveBatchKind, PrimitiveBatchCollection>();
  /** 是否已销毁 */
  private disposed = false;

  /**
   * 创建原语要素批量管理器
   *
   * @param viewer - Cesium Viewer 句柄
   * @param id - 批量管理器的唯一标识
   */
  constructor(private readonly viewer: CesiumViewerHandle, private readonly id: string) {}

  /**
   * 更新要素列表
   *
   * @description
   * 清空所有现有集合，然后根据新的要素列表重新添加。
   * 要素会按类型自动分组到对应的集合中。
   *
   * @param features - 要素渲染规格数组
   */
  updateFeatures(features: FeatureRenderSpec[]): void {
    if (this.disposed) return;
    for (const collection of this.collections.values()) {
      this.clearCollection(collection);
    }

    for (const feature of features) {
      if (feature.kind === 'point') {
        this.addPoint(feature);
      } else if (feature.kind === 'billboard') {
        this.addBillboard(feature);
      } else if (feature.kind === 'polyline') {
        this.addPolyline(feature);
      } else if (feature.kind === 'polygon') {
        this.addPolygon(feature);
      } else if (feature.kind === 'text' || feature.kind === 'label') {
        this.addLabel(feature, feature.label);
      }

      if (feature.kind !== 'text' && feature.kind !== 'label' && feature.label) {
        this.addLabel(feature, feature.label);
      }
    }
  }

  /**
   * 获取所有原语集合的原始实例
   *
   * @returns {unknown[]} 原语集合实例数组
   */
  raw(): unknown[] {
    return Array.from(this.collections.values()).map((collection) => collection.primitive);
  }

  /**
   * 销毁批量管理器并释放所有资源
   *
   * @description
   * 清空所有集合，从场景中移除原语，并销毁原语实例。
   */
  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    const viewer = _getInternalViewer(this.viewer);
    for (const collection of this.collections.values()) {
      this.clearCollection(collection);
      if (viewer?.scene.primitives.contains(collection.primitive)) {
        viewer.scene.primitives.remove(collection.primitive);
      }
      if (typeof collection.primitive.destroy === 'function' && !collection.primitive.isDestroyed?.()) {
        collection.primitive.destroy();
      }
    }
    this.collections.clear();
  }

  /**
   * 获取或创建指定类型的原语集合
   *
   * @param kind - 原语批量类型
   * @returns {PrimitiveBatchCollection} 原语集合实例
   */
  private ensureCollection(kind: PrimitiveBatchKind): PrimitiveBatchCollection {
    const existing = this.collections.get(kind);
    if (existing) return existing;

    const primitive = createPrimitiveCollection(kind, `${this.id}:${kind}`);
    const collection: PrimitiveBatchCollection = { kind, primitive, itemIds: [] };
    this.collections.set(kind, collection);

    const viewer = _getInternalViewer(this.viewer);
    if (viewer && !viewer.scene.primitives.contains(primitive)) {
      viewer.scene.primitives.add(primitive);
    }

    return collection;
  }

  /**
   * 清空指定集合中的所有项目
   *
   * @description
   * 解绑所有项目的拾取数据，并清空集合内容。
   * 优先使用 removeAll() 方法，否则手动清空 items 数组。
   *
   * @param collection - 要清空的原语集合
   */
  private clearCollection(collection: PrimitiveBatchCollection): void {
    for (const itemId of collection.itemIds) {
      PickingBridge.removeFeature(itemId);
    }
    collection.itemIds = [];

    if (typeof collection.primitive.removeAll === 'function') {
      collection.primitive.removeAll();
      return;
    }

    if (Array.isArray(collection.primitive.items)) {
      collection.primitive.items.length = 0;
    } else {
      collection.primitive.items = [];
    }
  }

  /**
   * 向指定类型的集合中添加项目
   *
   * @param kind - 原语批量类型
   * @param spec - 要素渲染规格
   * @param options - Cesium 集合项配置
   */
  private addItem(kind: PrimitiveBatchKind, spec: FeatureRenderSpec, options: Record<string, unknown>): void {
    const collection = this.ensureCollection(kind);
    const item = typeof collection.primitive.add === 'function'
      ? collection.primitive.add(options)
      : this.addFallbackItem(collection.primitive, options);

    PickingBridge.setFeature(spec.id, spec);
    collection.itemIds.push(spec.id);

    if (item && (typeof item === 'object' || typeof item === 'function')) {
      PickingBridge.setFeature(item, spec);
      collection.itemIds.push(item);
    }
  }

  /**
   * 后备方案：将项目添加到 primitive.items 数组中
   *
   * @param primitive - Cesium 原语实例
   * @param options - 项目配置
   * @returns {Record<string, unknown>} 添加的项目配置
   */
  private addFallbackItem(primitive: any, options: Record<string, unknown>): Record<string, unknown> {
    if (!Array.isArray(primitive.items)) primitive.items = [];
    primitive.items.push(options);
    return options;
  }

  /**
   * 添加点要素到集合
   *
   * @param spec - 点要素渲染规格
   */
  private addPoint(spec: FeatureRenderSpec): void {
    if (spec.kind !== 'point') return;
    this.addItem('point', spec, {
      ...(spec.point ?? {}),
      id: spec.id,
      position: toCesiumPosition(spec.position),
    });
  }

  /**
   * 添加广告牌要素到集合
   *
   * @param spec - 广告牌要素渲染规格
   */
  private addBillboard(spec: FeatureRenderSpec): void {
    if (spec.kind !== 'billboard') return;
    this.addItem('billboard', spec, {
      ...(spec.billboard ?? {}),
      id: spec.id,
      position: toCesiumPosition(spec.position),
    });
  }

  /**
   * 添加折线要素到集合
   *
   * @param spec - 折线要素渲染规格
   */
  private addPolyline(spec: FeatureRenderSpec): void {
    if (spec.kind !== 'polyline') return;
    this.addItem('polyline', spec, {
      ...(spec.polyline ?? {}),
      id: spec.id,
      positions: toCesiumPositions(positionsFromSpec(spec)),
    });
  }

  /**
   * 添加多边形要素到集合
   *
   * @param spec - 多边形要素渲染规格
   */
  private addPolygon(spec: FeatureRenderSpec): void {
    if (spec.kind !== 'polygon') return;
    this.addItem('polygon', spec, {
      ...(spec.polygon ?? {}),
      id: spec.id,
      hierarchy: toCesiumPositions(positionsFromSpec(spec)),
    });
  }

  /**
   * 添加标签要素到集合
   *
   * @param spec - 要素渲染规格
   * @param label - 标签渲染规格
   */
  private addLabel(spec: FeatureRenderSpec, label: LabelRenderSpec | undefined): void {
    const position = resolveLabelPosition(spec);
    if (!label || position === undefined) return;
    this.addItem('label', spec, {
      ...(toCesiumLabel(label) ?? {}),
      id: spec.id,
      position: toCesiumPosition(position),
    });
  }
}

/**
 * 图形图层挂载器
 *
 * @description
 * 管理图形图层（GraphicLayer）的生命周期，负责：
 * - 将图层内的要素按渲染模式分组（Entity 或 Primitive）
 * - 同步要素的增删改操作
 * - 管理 Entity 和 Primitive 批量管理器的生命周期
 */
class GraphicLayerMount implements Updatable<LayerRenderSpec> {
  /** Entity 模式渲染的要素句柄映射 */
  private readonly entityHandles = new Map<string, Updatable<FeatureRenderSpec>>();
  /** Primitive 模式渲染的批量管理器 */
  private readonly primitiveBatch: PrimitiveFeatureBatch;
  /** 是否已销毁 */
  private disposed = false;
  /** 当前图层渲染规格 */
  private current: GraphicLayerRenderSpec;

  /**
   * 创建图形图层挂载器
   *
   * @param viewer - Cesium Viewer 句柄
   * @param spec - 图形图层渲染规格
   * @param mountFeature - 要素挂载函数，用于创建要素句柄
   */
  constructor(
    private readonly viewer: CesiumViewerHandle,
    spec: GraphicLayerRenderSpec,
    private readonly mountFeature: (spec: FeatureRenderSpec) => Updatable<FeatureRenderSpec>,
  ) {
    this.current = spec;
    this.primitiveBatch = new PrimitiveFeatureBatch(viewer, spec.id);
    this.sync(spec);
  }

  /**
   * 更新图层规格
   *
   * @param next - 新的图层渲染规格
   */
  update(next: LayerRenderSpec): void {
    if (next.kind !== 'graphic' || this.disposed) return;
    this.current = next as GraphicLayerRenderSpec;
    this.sync(this.current);
  }

  /**
   * 获取原始数据引用
   *
   * @returns 包含 Entity 句柄和 Primitive 集合的对象
   */
  raw(): unknown {
    return {
      entities: Array.from(this.entityHandles.values()),
      primitives: this.primitiveBatch.raw(),
    };
  }

  /**
   * 销毁图层挂载器并释放所有资源
   */
  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    for (const handle of this.entityHandles.values()) {
      handle.dispose();
    }
    this.entityHandles.clear();
    this.primitiveBatch.dispose();
  }

  /**
   * 同步图层要素
   *
   * @description
   * 根据图层配置将要素分为 Entity 和 Primitive 两组，
   * 分别交由对应的管理器处理。
   *
   * @param spec - 图形图层渲染规格
   */
  private sync(spec: GraphicLayerRenderSpec): void {
    const layerMode = spec.renderMode ?? 'entity';
    const graphics = spec.visible === false ? [] : spec.graphics ?? [];
    const primitiveGraphics: FeatureRenderSpec[] = [];
    const entityGraphics: FeatureRenderSpec[] = [];

    for (const graphic of graphics) {
      const mode = resolveFeatureMode(graphic, layerMode);
      if (graphic.kind === 'model' || mode === 'entity') {
        entityGraphics.push(graphic);
      } else {
        primitiveGraphics.push(graphic);
      }
    }

    this.syncEntityGraphics(entityGraphics);
    this.primitiveBatch.updateFeatures(primitiveGraphics);
  }

  /**
   * 同步 Entity 模式的要素
   *
   * @description
   * 对比新旧要素列表，移除不再存在的要素，
   * 更新已存在的要素，添加新的要素。
   *
   * @param graphics - Entity 模式的要素渲染规格数组
   */
  private syncEntityGraphics(graphics: FeatureRenderSpec[]): void {
    const nextIds = new Set(graphics.map((graphic) => graphic.id));
    for (const [id, handle] of this.entityHandles) {
      if (!nextIds.has(id)) {
        handle.dispose();
        this.entityHandles.delete(id);
      }
    }

    for (const graphic of graphics) {
      const existing = this.entityHandles.get(graphic.id);
      if (existing) {
        existing.update?.(graphic);
      } else {
        this.entityHandles.set(graphic.id, this.mountFeature(graphic));
      }
    }
  }
}

/**
 * Cesium 引擎适配器配置选项
 *
 * @description
 * 扩展自 ViewerOptions，可选择传入已创建的 Viewer 句柄。
 */
export interface CesiumEngineAdapterOptions extends ViewerOptions {
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
 * const adapter = createCesiumAdapter({ shouldAnimate: true });
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
export function createCesiumAdapter(options: CesiumEngineAdapterOptions = {}): EngineAdapter {
  /** Viewer 句柄引用，可在初始化时传入或延迟创建 */
  let handle: CesiumViewerHandle | undefined = options.viewer;

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
  const mountFeatureSpec = (spec: FeatureRenderSpec): Updatable<FeatureRenderSpec> => {
    const viewerHandle = ensureHandle();
    const mode = resolveFeatureMode(spec);

    // 模型要素使用 Primitive 模式渲染
    if (spec.kind === 'model' && mode === 'primitive') {
      const primitive = new ModelPrimitive(viewerHandle, spec);
      void primitive.init();
      return {
        update(next: FeatureRenderSpec) {
          if (next.kind === 'model') primitive.updateSpec(next);
        },
        dispose() {
          primitive.dispose();
        },
      };
    }

    // 非模型要素使用 Primitive 批量模式渲染
    if (spec.kind !== 'model' && mode === 'primitive') {
      const batch = new PrimitiveFeatureBatch(viewerHandle, spec.id);
      batch.updateFeatures([spec]);
      return {
        update(next: FeatureRenderSpec) {
          batch.updateFeatures([next]);
        },
        dispose() {
          batch.dispose();
        },
      };
    }

    // 默认使用 Entity 模式渲染
    const entity = new FeatureEntity(viewerHandle, spec);
    void entity.init();
    return {
      update(next: FeatureRenderSpec) {
        entity.updateSpec(next);
      },
      dispose() {
        entity.dispose();
      },
    };
  };

  /**
   * 挂载数据图层到场景
   *
   * @description
   * 支持以下数据源类型：
   * - geojson: 使用 GeoJsonDataSource 加载
   * - tileset: 使用 Cesium3DTileset 加载
   * - point-cloud: 使用 Cesium3DTileset 加载点云数据
   *
   * 包含竞态保护机制，确保在快速切换图层时不会出现状态不一致。
   *
   * @param spec - 数据图层渲染规格
   * @returns {LayerHandle} 图层句柄，支持更新和销毁
   */
  const mountDataLayer = (spec: DataLayerRenderSpec): LayerHandle => {
    /** 是否已销毁 */
    let disposed = false;
    /** 当前加载的原始数据源对象 */
    let raw: unknown;
    /** 当前图层规格引用 */
    let current = spec;
    /** 加载版本号，用于竞态保护 */
    let loadVersion = 0;

    /**
     * 异步加载数据源并挂载到场景
     *
     * @param next - 数据图层渲染规格
     */
    const attach = async (next: DataLayerRenderSpec) => {
      const viewerHandle = ensureHandle();
      const payload = payloadRecord(next.payload);
      const version = ++loadVersion;

      // 加载 GeoJSON 数据源
      if (next.sourceType === 'geojson') {
        const load = (Cesium as any).GeoJsonDataSource?.load;
        if (typeof load !== 'function') return;
        const dataSource = await load(next.payload, next.options);
        if (disposed || current !== next) return;
        const mounted = await LayerBridge.addDataSource(viewerHandle, dataSource);
        if (disposed || current !== next || version !== loadVersion) {
          if (mounted) LayerBridge.removeDataSource(viewerHandle, mounted);
          return;
        }
        raw = mounted;
        applyCommonVisibility(raw as Record<string, unknown> | undefined, next);
        return;
      }

      // 加载 3D Tileset 或点云数据
      if (next.sourceType === 'tileset' || next.sourceType === 'point-cloud') {
        const url = payload.url;
        if (typeof url !== 'string') return;
        const mounted = await LayerBridge.add3DTileset(viewerHandle, url, next.options);
        if (disposed || current !== next || version !== loadVersion) {
          if (mounted) LayerBridge.remove3DTileset(viewerHandle, mounted);
          return;
        }
        raw = mounted;
        applyCommonVisibility(raw as Record<string, unknown> | undefined, next);
      }
    };

    void attach(spec);

    return {
      get raw() {
        return raw;
      },
      update(next: LayerRenderSpec) {
        current = next as DataLayerRenderSpec;
        applyCommonVisibility(raw as Record<string, unknown> | undefined, current);
      },
      dispose() {
        disposed = true;
        loadVersion += 1;
        const viewerHandle = handle;
        if (!viewerHandle || !raw) return;
        if (current.sourceType === 'geojson') {
          LayerBridge.removeDataSource(viewerHandle, raw as Cesium.DataSource);
        } else if (current.sourceType === 'tileset' || current.sourceType === 'point-cloud') {
          LayerBridge.remove3DTileset(viewerHandle, raw as Cesium.Cesium3DTileset);
        }
        raw = undefined;
      },
    };
  };

  return {
    /** 适配器类型标识 */
    kind: 'cesium',
    /**
     * 初始化适配器，创建 Cesium Viewer 实例
     *
     * @param container - Viewer 容器元素或元素 ID
     */
    initialize(container: string | HTMLElement) {
      if (!handle) handle = createViewer(container, options);
    },
    /**
     * 销毁适配器，释放 Viewer 资源
     */
    dispose() {
      handle?.destroy();
      handle = undefined;
    },
    /**
     * 挂载图层到场景
     *
     * @description
     * 根据图层类型分发到不同的挂载逻辑：
     * - imagery: 影像图层
     * - terrain: 地形图层
     * - data: 数据图层（GeoJSON、Tileset 等）
     * - graphic: 图形图层（包含多个要素）
     *
     * @param spec - 图层渲染规格
     * @returns {Updatable<LayerRenderSpec> | void} 图层句柄
     */
    mountLayer(spec: LayerRenderSpec): Updatable<LayerRenderSpec> | void {
      const viewerHandle = ensureHandle();

      // 挂载影像图层
      if (spec.kind === 'imagery') {
        const layer = LayerBridge.addImageryLayer(viewerHandle, resolveProvider(spec.provider) as Cesium.ImageryProvider);
        applyCommonVisibility(layer as unknown as Record<string, unknown> | undefined, spec);
        return {
          update(next: LayerRenderSpec) {
            applyCommonVisibility(layer as unknown as Record<string, unknown> | undefined, next);
          },
          dispose() {
            if (layer) LayerBridge.removeImageryLayer(viewerHandle, layer);
          },
        };
      }

      // 挂载地形图层
      if (spec.kind === 'terrain') {
        LayerBridge.setTerrainProvider(viewerHandle, resolveProvider(spec.provider) as Cesium.TerrainProvider);
        return {
          update() {},
          dispose() {
            LayerBridge.removeTerrainProvider(viewerHandle);
          },
        };
      }

      // 挂载数据图层
      if (spec.kind === 'data') {
        return mountDataLayer(spec);
      }

      // 挂载图形图层
      if (spec.kind === 'graphic') {
        return new GraphicLayerMount(viewerHandle, spec, mountFeatureSpec);
      }
    },
    /**
     * 卸载图层
     *
     * @param handleToUnmount - 要卸载的图层句柄
     */
    unmountLayer(handleToUnmount: Updatable<LayerRenderSpec> | void) {
      handleToUnmount?.dispose();
    },
    /**
     * 挂载单个要素到场景
     *
     * @param spec - 要素渲染规格
     * @returns {Updatable<FeatureRenderSpec> | void} 要素句柄
     */
    mountFeature(spec: FeatureRenderSpec): Updatable<FeatureRenderSpec> | void {
      return mountFeatureSpec(spec);
    },
    /**
     * 卸载要素
     *
     * @param handleToUnmount - 要卸载的要素句柄
     */
    unmountFeature(handleToUnmount: Updatable<FeatureRenderSpec> | void) {
      handleToUnmount?.dispose();
    },
    /**
     * 在指定屏幕位置拾取要素
     *
     * @param point - 屏幕坐标点
     * @returns 拾取到的要素数据，未拾取到返回 undefined
     */
    pick(point: ScreenPoint) {
      return PickingBridge.pick(ensureHandle(), point as unknown as Cesium.Cartesian2);
    },
    /**
     * 将经纬度坐标投影为三维坐标
     *
     * @param position - 经纬度坐标
     * @returns 投影后的三维坐标
     */
    project(position: LngLat) {
      return toCartesian3(position) as unknown as { x: number; y: number; z?: number };
    },
    /**
     * 获取底层 Cesium Viewer 实例（逃生舱口）
     *
     * @returns {Cesium.Viewer | undefined} 原生 Cesium Viewer 实例
     */
    unsafeNative() {
      return _getInternalViewer(ensureHandle());
    },
  };
}
