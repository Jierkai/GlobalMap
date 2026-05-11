import { DataLayer, type DataLayerOptions } from './DataLayer.js';

/**
 * 点云图层配置选项
 */
export interface PointCloudLayerOptions {
  /** 图层唯一标识 */
  id?: string;
  /** 点云资源 URL */
  url: string;
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
 * 点云图层领域类
 *
 * @description
 * 继承自 {@link DataLayer}，以 `point-cloud` 作为固定数据源类型，
 * 专门用于承载点云格式（如 pnts）的数据。
 *
 * @example
 * ```ts
 * const layer = new PointCloudLayer({
 *   url: 'https://example.com/point-cloud.pnts',
 * });
 * ```
 */
export class PointCloudLayer extends DataLayer {
  /** 点云资源 URL */
  readonly url: string;

  constructor(opts: PointCloudLayerOptions) {
    const dataOpts: DataLayerOptions = {
      sourceType: 'point-cloud',
      payload: { url: opts.url },
    };
    if (opts.id !== undefined) dataOpts.id = opts.id;
    if (opts.options !== undefined) dataOpts.options = opts.options;
    if (opts.visible !== undefined) dataOpts.visible = opts.visible;
    if (opts.opacity !== undefined) dataOpts.opacity = opts.opacity;
    if (opts.zIndex !== undefined) dataOpts.zIndex = opts.zIndex;

    super(dataOpts);
    this.url = opts.url;
  }
}
