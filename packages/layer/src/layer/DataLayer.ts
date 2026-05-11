import { effect } from '@cgx/reactive';
import type { DataLayerRenderSpec, EngineAdapter, LayerRenderSpec, Updatable } from '@cgx/core';
import { BaseLayer } from './types.js';

/**
 * 通用数据图层配置选项
 */
export interface DataLayerOptions {
  /** 图层唯一标识 */
  id?: string;
  /** 数据源类型标识 */
  sourceType: string;
  /** 数据载荷 */
  payload?: unknown;
  /** 附加选项 */
  options?: Record<string, unknown>;
  /** 是否可见 */
  visible?: boolean;
  /** 透明度 (0.0 - 1.0) */
  opacity?: number;
  /** 层级顺序 */
  zIndex?: number;
}

/**
 * 通用数据图层领域类
 *
 * @description
 * 用于承载任意类型的数据源（GeoJSON、Tileset、PointCloud 等），
 * 将数据源类型标识、载荷和选项统一输出为 DataLayerRenderSpec。
 *
 * @example
 * ```ts
 * const layer = new DataLayer({
 *   sourceType: 'custom',
 *   payload: { url: '/data.bin' },
 *   options: { retry: 2 },
 * });
 * ```
 */
export class DataLayer extends BaseLayer {
  /** 数据源类型标识 */
  readonly sourceType: string;

  /** 数据载荷 */
  readonly payload: unknown;

  /** 附加选项 */
  readonly options: Record<string, unknown> | undefined;

  /** @internal 挂载句柄 */
  private _mountHandle: Updatable<LayerRenderSpec> | void = undefined;

  /** @internal 响应式副作用清理函数 */
  private _effectDisposer: (() => void) | null = null;

  constructor(opts: DataLayerOptions) {
    super(opts.id, 'data');
    this.sourceType = opts.sourceType;
    this.payload = opts.payload;
    this.options = opts.options;

    if (opts.visible !== undefined) this.visible(opts.visible);
    if (opts.opacity !== undefined) this.opacity(opts.opacity);
    if (opts.zIndex !== undefined) this.zIndex(opts.zIndex);
  }

  protected buildSpec(): DataLayerRenderSpec {
    const spec: DataLayerRenderSpec = {
      id: this.id,
      kind: 'data',
      visible: this.visible(),
      opacity: this.opacity(),
      zIndex: this.zIndex(),
      sourceType: this.sourceType,
    };

    if (this.payload !== undefined) spec.payload = this.payload;
    if (this.options !== undefined) spec.options = this.options;

    return spec;
  }

  protected mount(adapter: EngineAdapter): void {
    this._mountHandle = adapter.mountLayer?.(this.buildSpec());
    this._effectDisposer = effect(() => {
      this._mountHandle?.update?.(this.buildSpec());
    });
  }

  protected async unmount(adapter: EngineAdapter): Promise<void> {
    if (this._effectDisposer) {
      this._effectDisposer();
      this._effectDisposer = null;
    }
    await adapter.unmountLayer?.(this._mountHandle);
    this._mountHandle?.dispose?.();
    this._mountHandle = undefined;
  }

  raw(): unknown {
    return this._mountHandle ?? null;
  }
}
