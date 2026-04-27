import { createBaseLayer, type Layer } from './types.js';
import type { ImageryProvider } from '../provider/ImageryProvider.js';
import { LayerBridge } from '@cgx/adapter-cesium';
import { effect } from 'alien-signals';

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
 * 创建一个影像图层实例，支持挂载到 Cesium Viewer。
 * 挂载时会通过 LayerBridge 创建原生影像图层，并通过 effect 
 * 将可见性和透明度属性响应式同步到原生图层。
 *
 * @param opts - 影像图层配置选项
 * @returns ImageryLayer 实例
 */
export function createImageryLayer(opts: ImageryLayerOptions): ImageryLayer {
  const base = createBaseLayer(opts.id || crypto.randomUUID(), 'imagery');
  if (opts.visible !== undefined) base.visible(opts.visible);
  if (opts.opacity !== undefined) base.opacity(opts.opacity);
  if (opts.zIndex !== undefined) base.zIndex(opts.zIndex);

  let nativeLayer: any = null;
  let effectDisposer: (() => void) | null = null;

  return {
    ...base,
    type: 'imagery',
    provider: opts.provider,
    async _mount(adapter: any) {
      if (!adapter) return;
      const provider = await opts.provider;
      nativeLayer = LayerBridge.addImageryLayer(adapter, provider as any);
      
      if (nativeLayer) {
        effectDisposer = effect(() => {
          nativeLayer.show = base.visible();
          nativeLayer.alpha = base.opacity();
        });
      }
    },
    _unmount(adapter: any) {
      if (effectDisposer) {
        effectDisposer();
        effectDisposer = null;
      }
      if (nativeLayer && adapter) {
        LayerBridge.removeImageryLayer(adapter, nativeLayer);
        nativeLayer = null;
      }
    }
  } as any;
}
