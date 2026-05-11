import { DataLayer, type DataLayerOptions } from './DataLayer.js';

/**
 * GeoJSON 图层配置选项
 */
export interface GeoJsonLayerOptions {
  /** 图层唯一标识 */
  id?: string;
  /** GeoJSON 数据 */
  data: unknown;
  /** 附加选项 */
  options?: Record<string, unknown>;
  /** 是否可见 */
  visible?: boolean;
  /** 透明度 (0.0 - 1.0) */
  opacity?: number;
  /** 层级顺序 */
  zIndex?: number;
}

/**
 * GeoJSON 图层领域类
 *
 * @description
 * 继承自 {@link DataLayer}，以 `geojson` 作为固定数据源类型，
 * 专门用于承载 GeoJSON 格式的矢量数据。
 *
 * @example
 * ```ts
 * const layer = new GeoJsonLayer({
 *   data: { type: 'FeatureCollection', features: [] },
 * });
 * ```
 */
export class GeoJsonLayer extends DataLayer {
  /** GeoJSON 数据 */
  readonly data: unknown;

  constructor(opts: GeoJsonLayerOptions) {
    const dataOpts: DataLayerOptions = {
      sourceType: 'geojson',
      payload: opts.data,
    };
    if (opts.id !== undefined) dataOpts.id = opts.id;
    if (opts.options !== undefined) dataOpts.options = opts.options;
    if (opts.visible !== undefined) dataOpts.visible = opts.visible;
    if (opts.opacity !== undefined) dataOpts.opacity = opts.opacity;
    if (opts.zIndex !== undefined) dataOpts.zIndex = opts.zIndex;

    super(dataOpts);
    this.data = opts.data;
  }
}
