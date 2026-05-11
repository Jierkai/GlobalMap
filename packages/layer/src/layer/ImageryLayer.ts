import { effect } from '@cgx/reactive';
import type { EngineAdapter, LayerRenderSpec, Updatable } from '@cgx/core';
import type { ImageryProvider } from '../provider/ImageryProvider.js';
import { BaseLayer } from './types.js';

/**
 * 影像图层配置选项
 */
export interface ImageryLayerOptions {
  /** 图层唯一标识 */
  id?: string;
  /** 影像提供者，支持同步或异步 */
  provider: Promise<ImageryProvider> | ImageryProvider;
  /** 是否可见 */
  visible?: boolean;
  /** 透明度 (0.0 - 1.0) */
  opacity?: number;
  /** 层级顺序 */
  zIndex?: number;
}

/**
 * 影像图层领域类
 *
 * @description
 * 负责管理影像图层的配置、响应式状态和生命周期。
 * 实际渲染由 EngineAdapter 消费 RenderSpec 完成。
 *
 * @example
 * ```ts
 * const layer = new ImageryLayer({
 *   provider: createXyzProvider({ url: 'https://example.com/{z}/{x}/{y}.png' }),
 * });
 * viewer.layers.add(layer);
 * ```
 */
export class ImageryLayer extends BaseLayer {
  /** 影像提供者 */
  readonly provider: Promise<ImageryProvider> | ImageryProvider;

  /** @internal 已解析的提供者 */
  private _resolvedProvider: ImageryProvider | null = null;

  /** @internal 挂载句柄 */
  private _mountHandle: Updatable<LayerRenderSpec> | void = undefined;

  /** @internal 响应式副作用清理函数 */
  private _effectDisposer: (() => void) | null = null;

  constructor(opts: ImageryLayerOptions) {
    super(opts.id, 'imagery');
    this.provider = opts.provider;

    if (opts.visible !== undefined) this.visible(opts.visible);
    if (opts.opacity !== undefined) this.opacity(opts.opacity);
    if (opts.zIndex !== undefined) this.zIndex(opts.zIndex);
  }

  protected buildSpec(): LayerRenderSpec {
    return {
      id: this.id,
      kind: 'imagery',
      visible: this.visible(),
      opacity: this.opacity(),
      zIndex: this.zIndex(),
      provider: this._resolvedProvider?.toRenderSpec() ?? null,
    };
  }

  protected async mount(adapter: EngineAdapter): Promise<void> {
    if (!adapter) return;
    this._resolvedProvider = await this.provider;
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
