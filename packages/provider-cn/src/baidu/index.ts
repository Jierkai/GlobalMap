import { signal } from 'alien-signals';
import type { ImageryProvider } from '@cgx/layer';

export interface BaiduProviderOptions {
  style?: 'normal' | 'dark' | 'custom';
}

export function createBaiduProvider(opts: BaiduProviderOptions = {}): ImageryProvider {
  const ready = signal(true);
  return {
    ready,
    toCesium() {
      return { type: 'baidu', ...opts };
    }
  };
}
