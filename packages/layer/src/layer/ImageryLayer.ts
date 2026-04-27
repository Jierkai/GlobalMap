import { createBaseLayer, type Layer } from './types.js';
import type { ImageryProvider } from '../provider/ImageryProvider.js';
import { LayerBridge } from '@cgx/adapter-cesium';
import { effect } from 'alien-signals';

export interface ImageryLayerOptions {
  id?: string;
  provider: Promise<ImageryProvider> | ImageryProvider;
  visible?: boolean;
  opacity?: number;
  zIndex?: number;
}

export interface ImageryLayer extends Layer {
  readonly type: 'imagery';
  readonly provider: Promise<ImageryProvider> | ImageryProvider;
}

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
