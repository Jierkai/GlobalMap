import { DataLayer, type DataLayerOptions } from './DataLayer.js';

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
 * 3D Tileset 图层领域类
 *
 * @description
 * 继承自 {@link DataLayer}，以 `tileset` 作为固定数据源类型，
 * 专门用于承载 3D Tiles 格式的数据（如 tileset.json）。
 *
 * @example
 * ```ts
 * const layer = new TilesetLayer({
 *   url: 'https://example.com/tileset.json',
 * });
 * ```
 */
export class TilesetLayer extends DataLayer {
  /** Tileset 资源 URL */
  readonly url: string;

  constructor(opts: TilesetLayerOptions) {
    const dataOpts: DataLayerOptions = {
      sourceType: 'tileset',
      payload: { url: opts.url },
    };
    if (opts.id !== undefined) dataOpts.id = opts.id;
    if (opts.visible !== undefined) dataOpts.visible = opts.visible;
    if (opts.opacity !== undefined) dataOpts.opacity = opts.opacity;
    if (opts.zIndex !== undefined) dataOpts.zIndex = opts.zIndex;

    super(dataOpts);
    this.url = opts.url;
  }
}
