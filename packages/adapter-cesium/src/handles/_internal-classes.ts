import * as Cesium from 'cesium';
import type {
  FeatureRenderSpec,
  ModelFeatureRenderSpec,
  GraphicLayerRenderSpec,
  GraphicRenderMode,
  LabelRenderSpec,
  LayerRenderSpec,
  FeatureHandle,
  UpdatableHandle,
} from '@cgx/core';
import { EntityBase } from '../entity';
import { PickingBridge } from '../picking';
import { PrimitiveBase } from '../primitive';
import type { CesiumViewerHandle } from '../types';
import { _getInternalViewer } from '../viewer';
import {
  buildEntityOptions,
  collectionCtorName,
  createPrimitiveCollection,
  positionsFromSpec,
  resolveFeatureMode,
  resolveLabelPosition,
  toCesiumLabel,
  toCesiumPosition,
  toCesiumPositions,
  type PrimitiveBatchKind,
  type PrimitiveBatchCollection,
} from '../adapter';

// ────────────────────────────────────────────────────────────────────────
// 以下 4 个 class 整体来自 adapter.ts(Task 8b 之前位于 537~1116 行),
// 逐字搬迁,不改逻辑、不改字段、不改注释。
// ────────────────────────────────────────────────────────────────────────

/**
 * 要素实体类
 *
 * @description
 * 继承自 EntityBase，将 FeatureRenderSpec 转换为 Cesium Entity。
 * 负责管理单个要素的 Entity 生命周期和拾取绑定。
 */
export class FeatureEntity extends EntityBase<Cesium.Entity.ConstructorOptions, Cesium.Entity> {
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
export class ModelPrimitive extends PrimitiveBase<Cesium.Primitive> {
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
 * 原语要素批量管理器
 *
 * @description
 * 管理同一图层内多个要素的批量渲染。
 * 按要素类型（点、广告牌、标签、线、面）分组到不同的 Cesium 集合中，
 * 提供高效的批量更新和清理能力。
 */
export class PrimitiveFeatureBatch {
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
export class GraphicLayerMount implements UpdatableHandle<Partial<LayerRenderSpec>> {
  readonly id: string;
  /** Entity 模式渲染的要素句柄映射 */
  private readonly entityHandles = new Map<string, FeatureHandle>();
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
    private readonly mountFeature: (spec: FeatureRenderSpec) => FeatureHandle,
  ) {
    this.id = spec.id;
    this.current = spec;
    this.primitiveBatch = new PrimitiveFeatureBatch(viewer, spec.id);
    this.sync(spec);
  }

  /**
   * 更新图层规格
   *
   * @param next - 新的图层渲染规格
   */
  update(next: Partial<LayerRenderSpec>): void {
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
