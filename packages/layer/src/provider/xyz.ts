import { signal } from '@cgx/reactive';
import type { ImageryProvider } from './ImageryProvider.js';

export interface XyzProviderOptions {
  url: string;
}

export function createXyzProvider(opts: XyzProviderOptions): ImageryProvider {
  const ready = signal(true);
  return {
    ready,
    toRenderSpec() {
      return { type: 'xyz', url: opts.url };
    }
  };
}
