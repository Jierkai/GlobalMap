import { signal } from 'alien-signals';
import type { ImageryProvider } from '@cgx/layer';

export interface GaodeProviderOptions {
  style?: 'vec' | 'img' | 'road';
}

export function createGaodeProvider(opts: GaodeProviderOptions = {}): ImageryProvider {
  const ready = signal(true);
  return {
    ready,
    toCesium() {
      return { type: 'gaode', ...opts };
    }
  };
}
