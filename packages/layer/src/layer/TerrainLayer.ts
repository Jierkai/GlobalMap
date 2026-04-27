import { createBaseLayer, type Layer } from './types.js';
import { LayerBridge } from '@cgx/adapter-cesium';
import { effect } from 'alien-signals';

/**
 * 地形图层配置选项
 */
export interface TerrainLayerOptions {
  /** 图层唯一标识 */
  id?: string;
  /** 地形提供者 */
  provider: any;
  /** 是否可见 */
  visible?: boolean;
}

/**
 * 地形图层接口
 */
export interface TerrainLayer extends Layer {
  readonly type: 'terrain';
  /** 地形提供者 */
  readonly provider: any;
}

/**
 * 创建地形图层
 *
 * @description
 * 创建一个地形图层实例，支持挂载到 Cesium Viewer。
 * 挂载时会通过 LayerBridge 设置地形提供者，并通过 effect 
 * 实现可见性切换：可见时设置地形，不可见时恢复默认椭球地形。
 *
 * @param opts - 地形图层配置选项
 * @returns TerrainLayer 实例
 */
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
