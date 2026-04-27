import { createBaseLayer, type Layer } from './types.js';
import { LayerBridge } from '@cgx/adapter-cesium';
import { effect } from 'alien-signals';

export interface TilesetLayerOptions {
  id?: string;
  url: string;
  visible?: boolean;
  opacity?: number;
  zIndex?: number;
}

export interface TilesetLayer extends Layer {
  readonly type: 'tileset';
  readonly url: string;
}

export function createTilesetLayer(opts: TilesetLayerOptions): TilesetLayer {
  const base = createBaseLayer(opts.id || crypto.randomUUID(), 'tileset');
  if (opts.visible !== undefined) base.visible(opts.visible);
  if (opts.opacity !== undefined) base.opacity(opts.opacity);
  if (opts.zIndex !== undefined) base.zIndex(opts.zIndex);

  let nativeLayer: any = null;
  let effectDisposer: (() => void) | null = null;

  return {
    ...base,
    type: 'tileset',
    url: opts.url,
    async _mount(adapter: any) {
      if (!adapter) return;
      nativeLayer = await LayerBridge.add3DTileset(adapter, opts.url);
      
      if (nativeLayer) {
        effectDisposer = effect(() => {
          nativeLayer.show = base.visible();
          // Note: Cesium3DTileset doesn't have a simple alpha property, it depends on styling.
          // For now, we omit opacity or we could set it via style if needed.
        });
      }
    },
    _unmount(adapter: any) {
      if (effectDisposer) {
        effectDisposer();
        effectDisposer = null;
      }
      if (nativeLayer && adapter) {
        LayerBridge.remove3DTileset(adapter, nativeLayer);
        nativeLayer = null;
      }
    }
  } as any;
}
