import { createBaseLayer, type Layer } from './types.js';
import type { ImageryProvider } from '../provider/ImageryProvider.js';

export interface ImageryLayerOptions {
  id?: string;
  provider: Promise<ImageryProvider> | ImageryProvider;
  visible?: boolean;
  opacity?: number;
  zIndex?: number;
}

export interface ImageryLayer extends Layer {
  readonly type: 'imagery';
  readonly provider: Promise<ImageryProvider> | ImageryProvider;
}

export function createImageryLayer(opts: ImageryLayerOptions): ImageryLayer {
  const base = createBaseLayer(opts.id || crypto.randomUUID(), 'imagery');
  if (opts.visible !== undefined) base.visible(opts.visible);
  if (opts.opacity !== undefined) base.opacity(opts.opacity);
  if (opts.zIndex !== undefined) base.zIndex(opts.zIndex);

  return {
    ...base,
    type: 'imagery',
    provider: opts.provider
  };
}
