import { createBaseLayer, type Layer } from './types.js';
import type { ImageryProvider } from '../provider/ImageryProvider.js';
import { effect } from '@cgx/reactive';
import type { EngineAdapter, LayerRenderSpec, Updatable } from '@cgx/core';

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
 * 影像图层接口
 */
export interface ImageryLayer extends Layer {
  readonly type: 'imagery';
  /** 影像提供者 */
  readonly provider: Promise<ImageryProvider> | ImageryProvider;
}

/**
 * 创建影像图层
 *
 * @description
 * 创建一个影像图层领域对象。实际渲染由 EngineAdapter 消费 RenderSpec 完成。
 *
 * @param opts - 影像图层配置选项
 * @returns ImageryLayer 实例
 */
export function createImageryLayer(opts: ImageryLayerOptions): ImageryLayer {
  const base = createBaseLayer(opts.id || crypto.randomUUID(), 'imagery');
  if (opts.visible !== undefined) base.visible(opts.visible);
  if (opts.opacity !== undefined) base.opacity(opts.opacity);
  if (opts.zIndex !== undefined) base.zIndex(opts.zIndex);

  let resolvedProvider: ImageryProvider | null = null;
  let mountHandle: Updatable<LayerRenderSpec> | void;
  let effectDisposer: (() => void) | null = null;

  const buildSpec = (): LayerRenderSpec => ({
    id: base.id,
    kind: 'imagery',
    visible: base.visible(),
    opacity: base.opacity(),
    zIndex: base.zIndex(),
    provider: resolvedProvider?.toRenderSpec() ?? null,
  });

  const layer = {
    ...base,
    type: 'imagery',
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
  };

  return layer as ImageryLayer;
}
