import { createBaseLayer, type Layer } from './types.js';
import { effect } from '@cgx/reactive';
import type { EngineAdapter, LayerRenderSpec, Updatable } from '@cgx/core';

/**
 * 3D Tileset 图层配置选项
 */
export interface TilesetLayerOptions {
  /** 图层唯一标识 */
  id?: string;
  /** Tileset 资源 URL */
  url: string;
  /** 是否可见 */
  visible?: boolean;
  /** 透明度 (0.0 - 1.0) */
  opacity?: number;
  /** 层级顺序 */
  zIndex?: number;
}

/**
 * 3D Tileset 图层接口
 */
export interface TilesetLayer extends Layer {
  readonly type: 'tileset';
  /** Tileset 资源 URL */
  readonly url: string;
}

/**
 * 创建 3D Tileset 图层
 *
 * @description
 * 创建一个 3D Tileset 图层领域对象。实际渲染由 EngineAdapter 消费 RenderSpec 完成。
 *
 * @param opts - Tileset 图层配置选项
 * @returns TilesetLayer 实例
 */
export function createTilesetLayer(opts: TilesetLayerOptions): TilesetLayer {
  const base = createBaseLayer(opts.id || crypto.randomUUID(), 'tileset');
  if (opts.visible !== undefined) base.visible(opts.visible);
  if (opts.opacity !== undefined) base.opacity(opts.opacity);
  if (opts.zIndex !== undefined) base.zIndex(opts.zIndex);

  let mountHandle: Updatable<LayerRenderSpec> | void;
  let effectDisposer: (() => void) | null = null;

  const buildSpec = (): LayerRenderSpec => ({
    id: base.id,
    kind: 'tileset',
    visible: base.visible(),
    opacity: base.opacity(),
    zIndex: base.zIndex(),
    url: opts.url,
  });

  return {
    ...base,
    type: 'tileset',
    url: opts.url,
    async _mount(adapter: EngineAdapter) {
      if (!adapter) return;
      mountHandle = adapter.mountLayer?.(buildSpec());
      effectDisposer = effect(() => {
        mountHandle?.update?.(buildSpec());
      });
    },
    async _unmount(adapter: EngineAdapter) {
      if (effectDisposer) {
        effectDisposer();
        effectDisposer = null;
      }
      await adapter.unmountLayer?.(mountHandle);
      mountHandle?.dispose?.();
      mountHandle = undefined;
    },
    toRenderSpec(): LayerRenderSpec {
      return buildSpec();
    },
    raw() {
      return mountHandle ?? null;
    }
  } as any;
}
