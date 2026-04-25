import { signal } from 'alien-signals';
import type { ImageryProvider } from './ImageryProvider.js';

export interface WmsProviderOptions {
  url: string;
  layers: string;
  parameters?: Record<string, string>;
}

export function createWmsProvider(opts: WmsProviderOptions): ImageryProvider {
  const ready = signal(true);
  return {
    ready,
    toCesium() {
      return { type: 'wms', url: opts.url, layers: opts.layers, parameters: opts.parameters };
    }
  };
}
