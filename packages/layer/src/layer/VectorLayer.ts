import { createGeoJsonLayer, type GeoJsonLayer } from './GeoJsonLayer.js';

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
 * 矢量图层接口
 *
 * @typeParam F - 要素数据类型
 */
export interface VectorLayer<F> extends GeoJsonLayer {
  readonly type: 'data';
  readonly sourceType: 'geojson';
  readonly legacyType: 'vector';
  /** 矢量数据 */
  readonly data: F | undefined;
}

/**
 * 创建矢量图层
 *
 * @description
 * Legacy 兼容入口。新的数据加载语义请使用 `createGeoJsonLayer()`，
 * 图元管理语义请使用 `createGraphicLayer()`。
 *
 * @param opts - 矢量图层配置选项
 * @returns VectorLayer 实例
 */
export function createVectorLayer<F>(opts: VectorLayerOptions<F> = {}): VectorLayer<F> {
  const layer = createGeoJsonLayer({
    data: opts.data,
    ...(opts.id !== undefined ? { id: opts.id } : {}),
    ...(opts.visible !== undefined ? { visible: opts.visible } : {}),
    ...(opts.opacity !== undefined ? { opacity: opts.opacity } : {}),
    ...(opts.zIndex !== undefined ? { zIndex: opts.zIndex } : {}),
  });

  return {
    ...layer,
    type: 'data',
    sourceType: 'geojson',
    legacyType: 'vector',
    data: opts.data,
  } as VectorLayer<F>;
}
