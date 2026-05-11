import { effect, signal, type Signal } from '@cgx/reactive';
import type { EngineAdapter, GraphicLayerRenderSpec, GraphicRenderMode, LayerRenderSpec, Updatable } from '@cgx/core';
import {
  createBillboardFeature,
  createLabelFeature,
  createModelFeature,
  createPointFeature,
  createPolygonFeature,
  createPolylineFeature,
  createTextFeature,
  type BillboardFeatureOptions,
  type Feature,
  type FeatureKind,
  type LabelFeatureOptions,
  type ModelFeatureOptions,
  type MountableFeature,
  type PointFeatureOptions,
  type PolygonFeatureOptions,
  type PolylineFeatureOptions,
  type TextFeatureOptions,
} from '@cgx/feature';
import { BaseLayer } from './types.js';

/**
 * 聚合配置
 */
export interface GraphicLayerClustering {
  /** 是否启用聚合 */
  enabled: boolean;
  /** 聚合像素范围 */
  pixelRange?: number;
  /** 最小聚合数量 */
  minimumClusterSize?: number;
  /** 其他聚合参数 */
  [key: string]: unknown;
}

/**
 * Graphic 类型别名 — Feature 与 MountableFeature 的交集
 */
export type Graphic<K extends FeatureKind = FeatureKind> = Feature<K> & MountableFeature;

/**
 * 图形图层配置选项
 */
export interface GraphicLayerOptions {
  /** 图层唯一标识 */
  id?: string;
  /** 是否可见 */
  visible?: boolean;
  /** 透明度 (0.0 - 1.0) */
  opacity?: number;
  /** 层级顺序 */
  zIndex?: number;
  /** 聚合配置 */
  clustering?: GraphicLayerClustering;
  /** 渲染模式 */
  renderMode?: GraphicRenderMode;
}

/**
 * 图形图层领域类
 *
 * @description
 * 管理一组 Graphic（Feature & MountableFeature），支持聚合、
 * 渲染模式切换和逐要素的增删查改。
 *
 * 优先通过图层通道（`adapter.mountLayer`）挂载整个图层，
 * 当图层通道不可用时回退到逐要素挂载。
 *
 * @example
 * ```ts
 * const layer = new GraphicLayer({
 *   renderMode: 'primitive',
 *   clustering: { enabled: true, pixelRange: 24 },
 * });
 *
 * layer.addPoint({ id: 'p1', position: [120, 30] });
 * layer.addPolyline({ id: 'line-1', positions: [[120, 30], [121, 31]] });
 *
 * viewer.layers.add(layer);
 * ```
 */
export class GraphicLayer extends BaseLayer {
  /** 聚合配置信号 */
  readonly clustering: Signal<GraphicLayerClustering | undefined>;

  /** 渲染模式信号 */
  readonly renderMode: Signal<GraphicRenderMode>;

  /** @internal 图形集合 */
  private readonly _graphics = new Map<string, Graphic>();

  /** @internal 已挂载的图形 ID 集合 */
  private readonly _mountedGraphicIds = new Set<string>();

  /** @internal 引擎适配器引用 */
  private _adapterRef: EngineAdapter | null = null;

  /** @internal 图层挂载句柄 */
  private _layerMountHandle: Updatable<LayerRenderSpec> | void = undefined;

  /** @internal 图层通道响应式副作用清理函数 */
  private _layerEffectDisposer: (() => void) | null = null;

  /** @internal 可见性响应式副作用清理函数（逐要素挂载模式） */
  private _visibilityDisposer: (() => void) | null = null;

  constructor(opts: GraphicLayerOptions = {}) {
    super(opts.id, 'graphic');
    this.clustering = signal<GraphicLayerClustering | undefined>(opts.clustering);
    this.renderMode = signal<GraphicRenderMode>(opts.renderMode ?? 'entity');

    if (opts.visible !== undefined) this.visible(opts.visible);
    if (opts.opacity !== undefined) this.opacity(opts.opacity);
    if (opts.zIndex !== undefined) this.zIndex(opts.zIndex);
  }

  /**
   * 添加一个 Graphic 到图层
   *
   * @param graphic - 要添加的 Graphic 实例
   * @returns 添加的 Graphic 实例
   */
  add<T extends Graphic>(graphic: T): T {
    const prev = this._graphics.get(graphic.id);
    if (prev) {
      this._unmountGraphic(prev);
    }
    this._graphics.set(graphic.id, graphic);
    if (this._layerMountHandle) {
      this._layerMountHandle.update?.(this.buildSpec());
    } else {
      this._mountGraphic(graphic);
    }
    return graphic;
  }

  /**
   * 添加点要素
   *
   * @param opts - 点要素配置
   * @returns 创建的 Graphic 实例
   */
  addPoint(opts: PointFeatureOptions): Graphic<'point'> {
    return this.add(createPointFeature(opts));
  }

  /**
   * 添加广告牌要素
   *
   * @param opts - 广告牌要素配置
   * @returns 创建的 Graphic 实例
   */
  addBillboard(opts: BillboardFeatureOptions): Graphic<'billboard'> {
    return this.add(createBillboardFeature(opts));
  }

  /**
   * 添加折线要素
   *
   * @param opts - 折线要素配置
   * @returns 创建的 Graphic 实例
   */
  addPolyline(opts: PolylineFeatureOptions): Graphic<'polyline'> {
    return this.add(createPolylineFeature(opts));
  }

  /**
   * 添加多边形要素
   *
   * @param opts - 多边形要素配置
   * @returns 创建的 Graphic 实例
   */
  addPolygon(opts: PolygonFeatureOptions): Graphic<'polygon'> {
    return this.add(createPolygonFeature(opts));
  }

  /**
   * 添加模型要素
   *
   * @param opts - 模型要素配置
   * @returns 创建的 Graphic 实例
   */
  addModel(opts: ModelFeatureOptions): Graphic<'model'> {
    return this.add(createModelFeature(opts));
  }

  /**
   * 添加标签要素
   *
   * @param opts - 标签要素配置
   * @returns 创建的 Graphic 实例
   */
  addLabel(opts: LabelFeatureOptions): Graphic<'label'> {
    return this.add(createLabelFeature(opts));
  }

  /**
   * 添加文本要素
   *
   * @param opts - 文本要素配置
   * @returns 创建的 Graphic 实例
   */
  addText(opts: TextFeatureOptions): Graphic<'text'> {
    return this.add(createTextFeature(opts));
  }

  /**
   * 移除指定的 Graphic
   *
   * @param graphicOrId - Graphic 实例或其 ID
   * @returns 是否成功移除
   */
  removeGraphic(graphicOrId: Graphic | string): boolean {
    const graphic = this._getGraphic(graphicOrId);
    if (!graphic) return false;
    if (!this._layerMountHandle) this._unmountGraphic(graphic);
    const removed = this._graphics.delete(graphic.id);
    if (removed && this._layerMountHandle) this._layerMountHandle.update?.(this.buildSpec());
    return removed;
  }

  /**
   * 清除所有 Graphic
   */
  clear(): void {
    if (!this._layerMountHandle) {
      for (const graphic of this._graphics.values()) {
        this._unmountGraphic(graphic);
      }
    }
    this._graphics.clear();
    this._mountedGraphicIds.clear();
    this._layerMountHandle?.update?.(this.buildSpec());
  }

  /**
   * 根据 ID 获取 Graphic
   *
   * @param id - Graphic ID
   * @returns 匹配的 Graphic 或 undefined
   */
  getById<T extends Graphic = Graphic>(id: string): T | undefined {
    return this._getGraphic(id) as T | undefined;
  }

  /**
   * 查找满足条件的 Graphic
   *
   * @param predicate - 查找谓词
   * @returns 匹配的 Graphic 或 undefined
   */
  find<T extends Graphic = Graphic>(predicate: (graphic: Graphic) => boolean): T | undefined {
    return Array.from(this._graphics.values()).find(predicate) as T | undefined;
  }

  /**
   * 获取所有 Graphic 列表
   *
   * @returns Graphic 数组
   */
  list(): Graphic[] {
    return Array.from(this._graphics.values());
  }

  /**
   * 更新指定的 Graphic
   *
   * @param graphicOrId - Graphic 实例或其 ID
   * @param updater - 更新函数
   * @returns 更新后的 Graphic 或 undefined
   */
  update<T extends Graphic = Graphic>(graphicOrId: T | string, updater: (graphic: T) => void): T | undefined {
    const graphic = this._getGraphic(graphicOrId) as T | undefined;
    if (!graphic) return undefined;
    updater(graphic);
    return graphic;
  }

  // ─── BaseLayer 实现 ───

  protected buildSpec(): GraphicLayerRenderSpec {
    const spec: GraphicLayerRenderSpec = {
      id: this.id,
      kind: 'graphic',
      visible: this.visible(),
      opacity: this.opacity(),
      zIndex: this.zIndex(),
      renderMode: this.renderMode(),
      graphics: Array.from(this._graphics.values()).map((g) => g.toRenderSpec()),
    };

    const clusteringValue = this.clustering();
    if (clusteringValue !== undefined) spec.clustering = clusteringValue;

    return spec;
  }

  protected mount(adapter: EngineAdapter): void {
    this._adapterRef = adapter;
    this._layerMountHandle = adapter.mountLayer?.(this.buildSpec());
    if (this._layerMountHandle) {
      this._layerEffectDisposer = effect(() => {
        this._layerMountHandle?.update?.(this.buildSpec());
      });
      return;
    }

    // 回退到逐要素挂载模式
    this._syncMountedGraphics();
    this._visibilityDisposer = effect(() => {
      this.visible();
      this._syncMountedGraphics();
    });
  }

  protected async unmount(adapter: EngineAdapter): Promise<void> {
    if (this._layerEffectDisposer) {
      this._layerEffectDisposer();
      this._layerEffectDisposer = null;
    }
    if (this._layerMountHandle) {
      adapter.unmountLayer?.(this._layerMountHandle);
      this._layerMountHandle.dispose?.();
      this._layerMountHandle = undefined;
    }
    if (this._visibilityDisposer) {
      this._visibilityDisposer();
      this._visibilityDisposer = null;
    }
    for (const graphic of this._graphics.values()) {
      if (this._mountedGraphicIds.has(graphic.id)) {
        graphic._unmount(adapter);
      }
    }
    this._mountedGraphicIds.clear();
    this._adapterRef = null;
  }

  raw(): unknown {
    return this._layerMountHandle ?? Array.from(this._graphics.values()).map((g) => g.raw());
  }

  // ─── 内部辅助方法 ───

  /**
   * @internal 根据引用或 ID 获取 Graphic
   */
  private _getGraphic(graphicOrId: Graphic | string): Graphic | undefined {
    const id = typeof graphicOrId === 'string' ? graphicOrId : graphicOrId.id;
    return this._graphics.get(id);
  }

  /**
   * @internal 挂载单个 Graphic
   */
  private _mountGraphic(graphic: Graphic): void {
    if (!this._adapterRef || this._mountedGraphicIds.has(graphic.id) || !this.visible()) return;
    graphic._mount(this._adapterRef);
    this._mountedGraphicIds.add(graphic.id);
  }

  /**
   * @internal 卸载单个 Graphic
   */
  private _unmountGraphic(graphic: Graphic): void {
    if (!this._adapterRef || !this._mountedGraphicIds.has(graphic.id)) return;
    graphic._unmount(this._adapterRef);
    this._mountedGraphicIds.delete(graphic.id);
  }

  /**
   * @internal 同步所有 Graphic 的挂载状态
   */
  private _syncMountedGraphics(): void {
    if (!this._adapterRef) return;

    if (!this.visible()) {
      for (const id of [...this._mountedGraphicIds]) {
        const graphic = this._graphics.get(id);
        if (graphic) {
          this._unmountGraphic(graphic);
        } else {
          this._mountedGraphicIds.delete(id);
        }
      }
      return;
    }

    for (const graphic of this._graphics.values()) {
      this._mountGraphic(graphic);
    }
  }
}
