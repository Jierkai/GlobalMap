import { createBaseLayer, type Layer } from './types.js';
import { effect } from '@cgx/reactive';
import type { EngineAdapter, LayerRenderSpec, Updatable } from '@cgx/core';

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
 * 地形图层接口
 */
export interface TerrainLayer extends Layer {
  readonly type: 'terrain';
  /** 地形提供者 */
  readonly provider: unknown;
}

/**
 * 创建地形图层
 *
 * @description
 * 创建一个地形图层领域对象。实际渲染由 EngineAdapter 消费 RenderSpec 完成。
 *
 * @param opts - 地形图层配置选项
 * @returns TerrainLayer 实例
 */
export function createTerrainLayer(opts: TerrainLayerOptions): TerrainLayer {
  const base = createBaseLayer(opts.id || crypto.randomUUID(), 'terrain');
  if (opts.visible !== undefined) base.visible(opts.visible);

  let resolvedProvider: unknown = undefined;
  let mountHandle: Updatable<LayerRenderSpec> | void;
  let effectDisposer: (() => void) | null = null;

  const buildSpec = (): LayerRenderSpec => ({
    id: base.id,
    kind: 'terrain',
    visible: base.visible(),
    opacity: base.opacity(),
    zIndex: base.zIndex(),
    provider: resolvedProvider ?? opts.provider,
  });

  return {
    ...base,
    type: 'terrain',
    provider: opts.provider,
    async _mount(adapter: EngineAdapter) {
      if (!adapter) return;
      resolvedProvider = await opts.provider;
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
