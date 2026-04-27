import { createBaseLayer, type Layer } from './types.js';

export interface VectorLayerOptions<F> {
  id?: string;
  data?: any;
  visible?: boolean;
  opacity?: number;
  zIndex?: number;
}

export interface VectorLayer<F> extends Layer {
  readonly type: 'vector';
  readonly data: any;
}

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
