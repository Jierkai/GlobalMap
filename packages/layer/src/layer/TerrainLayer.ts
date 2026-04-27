import { createBaseLayer, type Layer } from './types.js';
import { LayerBridge } from '@cgx/adapter-cesium';
import { effect } from 'alien-signals';

export interface TerrainLayerOptions {
  id?: string;
  provider: any; // e.g. Promise<TerrainProvider> | TerrainProvider
  visible?: boolean;
}

export interface TerrainLayer extends Layer {
  readonly type: 'terrain';
  readonly provider: any;
}

export function createTerrainLayer(opts: TerrainLayerOptions): TerrainLayer {
  const base = createBaseLayer(opts.id || crypto.randomUUID(), 'terrain');
  if (opts.visible !== undefined) base.visible(opts.visible);

  let isMounted = false;
  let effectDisposer: (() => void) | null = null;
  let currentProvider: any = null;

  return {
    ...base,
    type: 'terrain',
    provider: opts.provider,
    async _mount(adapter: any) {
      if (!adapter) return;
      isMounted = true;
      currentProvider = await opts.provider;
      
      effectDisposer = effect(() => {
        if (!isMounted) return;
        if (base.visible()) {
          LayerBridge.setTerrainProvider(adapter, currentProvider);
        } else {
          LayerBridge.removeTerrainProvider(adapter);
        }
      });
    },
    _unmount(adapter: any) {
      isMounted = false;
      if (effectDisposer) {
        effectDisposer();
        effectDisposer = null;
      }
      if (adapter) {
        LayerBridge.removeTerrainProvider(adapter);
      }
    }
  } as any;
}
