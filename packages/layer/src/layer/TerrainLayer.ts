import { effect } from '@cgx/reactive';
import type { EngineAdapter, LayerHandle, LayerRenderSpec } from '@cgx/core';
import { BaseLayer } from './types.js';

/**
 * 地形图层配置选项
 */
export interface TerrainLayerOptions {
  /** 图层唯一标识 */
  id?: string;
  /** 地形提供者 */
  provider: unknown;
  /** 是否可见 */
  visible?: boolean;
}

/**
 * 地形图层领域类
 *
 * @description
 * 负责管理地形图层的配置、响应式状态和生命周期。
 * 实际渲染由 EngineAdapter 消费 RenderSpec 完成。
 *
 * @example
 * ```ts
 * const layer = new TerrainLayer({
 *   provider: someTerrainProvider,
 * });
 * const layers = viewer.use(Layers);
 * layers.add(layer);
 * ```
 */
export class TerrainLayer extends BaseLayer {
  /** 地形提供者 */
  readonly provider: unknown;

  /** @internal 已解析的提供者 */
  private _resolvedProvider: unknown = undefined;

  /** @internal 响应式副作用清理函数 */
  private _effectDisposer: (() => void) | null = null;

  constructor(opts: TerrainLayerOptions) {
    super(opts.id, 'terrain');
    this.provider = opts.provider;

    if (opts.visible !== undefined) this.visible(opts.visible);
  }

  protected buildSpec(): LayerRenderSpec {
    return {
      id: this.id,
      kind: 'terrain',
      visible: this.visible(),
      opacity: this.opacity(),
      zIndex: this.zIndex(),
      provider: this._resolvedProvider ?? this.provider,
    };
  }

  protected async mount(adapter: EngineAdapter): Promise<LayerHandle | undefined> {
    if (!adapter) return;
    this._resolvedProvider = await this.provider;
    this._handle = adapter.mountLayer?.(this.buildSpec());
    this._effectDisposer = effect(() => {
      this._handle?.update?.(this.buildSpec());
    });
    return this._handle;
  }

  protected async unmount(adapter: EngineAdapter): Promise<void> {
    if (this._effectDisposer) {
      this._effectDisposer();
      this._effectDisposer = null;
    }
    const handle = this._handle;
    this._handle = undefined;
    await adapter.unmountLayer?.(handle);
    handle?.dispose?.();
  }
}
