import { signal } from '@cgx/reactive';
import type { ImageryProvider } from '@cgx/layer';

export interface TiandituProviderOptions {
  token: string;
  type?: 'vec' | 'img' | 'ter';
}

export function createTiandituProvider(opts: TiandituProviderOptions): ImageryProvider {
  const ready = signal(true);
  return {
    ready,
    toRenderSpec() {
      return { type: 'tianditu', ...opts };
    }
  };
}
