import { signal } from '@cgx/reactive';
import type { ImageryProvider } from './ImageryProvider.js';

export interface SingleTileProviderOptions {
  url: string;
  rectangle?: [number, number, number, number];
}

export function createSingleTileProvider(opts: SingleTileProviderOptions): ImageryProvider {
  const ready = signal(true);
  return {
    ready,
    toRenderSpec() {
      return { type: 'singleTile', ...opts };
    }
  };
}
