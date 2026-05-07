import { signal } from '@cgx/reactive';
import type { ImageryProvider } from './ImageryProvider.js';

export interface WmtsProviderOptions {
  url: string;
  layer: string;
  style: string;
  format?: string;
  tileMatrixSetID: string;
}

export function createWmtsProvider(opts: WmtsProviderOptions): ImageryProvider {
  const ready = signal(true);
  return {
    ready,
    toRenderSpec() {
      return { type: 'wmts', ...opts };
    }
  };
}
