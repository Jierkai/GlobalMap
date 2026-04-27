import { createBaseLayer, type Layer } from './types.js';
import { LayerBridge } from '@cgx/adapter-cesium';
import { effect } from 'alien-signals';

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
 * 创建一个 3D Tileset 图层实例，支持挂载到 Cesium Viewer。
 * 挂载时会通过 LayerBridge 异步加载并添加 Cesium3DTileset，
 * 并通过 effect 将可见性属性响应式同步到原生图层。
 *
 * @param opts - Tileset 图层配置选项
 * @returns TilesetLayer 实例
 */
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
