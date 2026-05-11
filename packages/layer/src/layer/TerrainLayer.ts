import { effect } from '@cgx/reactive';
import type { EngineAdapter, LayerRenderSpec, Updatable } from '@cgx/core';
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
 * viewer.layers.add(layer);
 * ```
 */
export class TerrainLayer extends BaseLayer {
  /** 地形提供者 */
  readonly provider: unknown;

  /** @internal 已解析的提供者 */
  private _resolvedProvider: unknown = undefined;

  /** @internal 挂载句柄 */
  private _mountHandle: Updatable<LayerRenderSpec> | void = undefined;

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
