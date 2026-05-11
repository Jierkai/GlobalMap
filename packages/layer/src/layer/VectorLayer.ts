import { GeoJsonLayer, type GeoJsonLayerOptions } from './GeoJsonLayer.js';

/**
 * 矢量图层配置选项
 *
 * @typeParam F - 要素数据类型
 */
export interface VectorLayerOptions<F> {
  /** 图层唯一标识 */
  id?: string;
  /** 矢量数据 */
  data?: F;
  /** 是否可见 */
  visible?: boolean;
  /** 透明度 (0.0 - 1.0) */
  opacity?: number;
  /** 层级顺序 */
  zIndex?: number;
}

/**
 * 矢量图层领域类（Legacy 兼容）
 *
 * @description
 * 继承自 {@link GeoJsonLayer}，以 `geojson` 作为固定数据源类型，
 * 保留 `legacyType: 'vector'` 标识以兼容旧代码。
 *
 * 新的数据加载语义请使用 {@link GeoJsonLayer}，
 * 图元管理语义请使用 {@link GraphicLayer}。
 *
 * @typeParam F - 要素数据类型
 *
 * @example
 * ```ts
 * const layer = new VectorLayer({
 *   data: { type: 'FeatureCollection', features: [] },
 * });
 * ```
 */
export class VectorLayer<F = unknown> extends GeoJsonLayer {
  /** Legacy 兼容类型标识 */
  readonly legacyType: 'vector' = 'vector';

  /** 矢量数据 */
  readonly data: F | undefined;

  constructor(opts: VectorLayerOptions<F> = {}) {
    const geoOpts: GeoJsonLayerOptions = {
      data: opts.data,
    };
    if (opts.id !== undefined) geoOpts.id = opts.id;
    if (opts.visible !== undefined) geoOpts.visible = opts.visible;
    if (opts.opacity !== undefined) geoOpts.opacity = opts.opacity;
    if (opts.zIndex !== undefined) geoOpts.zIndex = opts.zIndex;

    super(geoOpts);
    this.data = opts.data;
  }
}
