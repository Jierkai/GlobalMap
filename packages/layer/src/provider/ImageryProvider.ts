import type { Signal } from '@cgx/reactive';

export interface ImageryProvider {
  readonly ready: Signal<boolean>;
  toRenderSpec(): unknown;
}
