import { createDataLayer, type DataLayer } from './DataLayer.js';

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
export interface TilesetLayer extends DataLayer {
  readonly type: 'data';
  readonly sourceType: 'tileset';
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
  const layer = createDataLayer({
    sourceType: 'tileset',
    payload: { url: opts.url },
    ...(opts.id !== undefined ? { id: opts.id } : {}),
    ...(opts.visible !== undefined ? { visible: opts.visible } : {}),
    ...(opts.opacity !== undefined ? { opacity: opts.opacity } : {}),
    ...(opts.zIndex !== undefined ? { zIndex: opts.zIndex } : {}),
  });

  return {
    ...layer,
    type: 'data',
    sourceType: 'tileset',
    url: opts.url,
  } as TilesetLayer;
}
