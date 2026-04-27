import { createBaseLayer, type Layer } from './types.js';

/**
 * 矢量图层配置选项
 *
 * @typeParam F - 要素数据类型
 */
export interface VectorLayerOptions<F> {
  /** 图层唯一标识 */
  id?: string;
  /** 矢量数据 */
  data?: any;
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
export interface VectorLayer<F> extends Layer {
  readonly type: 'vector';
  /** 矢量数据 */
  readonly data: any;
}

/**
 * 创建矢量图层
 *
 * @description
 * 创建一个矢量图层实例。矢量图层是 Feature 的逻辑容器，
 * 具体的挂载逻辑（如将要素分组到 CustomDataSource）可在此实现。
 *
 * @param opts - 矢量图层配置选项
 * @returns VectorLayer 实例
 */
export function createVectorLayer<F>(opts: VectorLayerOptions<F> = {}): VectorLayer<F> {
  const base = createBaseLayer(opts.id || crypto.randomUUID(), 'vector');
  if (opts.visible !== undefined) base.visible(opts.visible);
  if (opts.opacity !== undefined) base.opacity(opts.opacity);
  if (opts.zIndex !== undefined) base.zIndex(opts.zIndex);

  return {
    ...base,
    type: 'vector',
    data: opts.data,
    _mount(adapter: any) {
       // Vector layers are logical containers for Features.
       // Specific mounting logic (like grouping features into a CustomDataSource)
       // can be implemented here if needed.
    },
    _unmount(adapter: any) {
       // Unmount logic for VectorLayer
    }
  } as any;
}
