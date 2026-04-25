import { signal } from 'alien-signals';
import type { ImageryProvider } from './ImageryProvider.js';

export interface XyzProviderOptions {
  url: string;
}

export function createXyzProvider(opts: XyzProviderOptions): ImageryProvider {
  const ready = signal(true);
  return {
    ready,
    toCesium() {
      return { type: 'xyz', url: opts.url };
    }
  };
}
