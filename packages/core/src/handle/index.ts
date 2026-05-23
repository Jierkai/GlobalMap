import type { LayerRenderSpec, FeatureRenderSpec, WeatherEffectSpec, LngLat } from '../spec/index.js';

export interface Handle {
  readonly id: string;
  dispose(): void;
}

export interface UpdatableHandle<TPatch> extends Handle {
  update(patch: TPatch): void;
}

export interface FlyToOptions {
  duration?: number;
  offset?: { heading?: number; pitch?: number; range?: number };
}

export interface PickResult {
  id: string;
  position?: LngLat;
  raw?: unknown;
}

export interface LayerHandle extends UpdatableHandle<Partial<LayerRenderSpec>> {
  setVisible(v: boolean): void;
  setOpacity(o: number): void;
  setZIndex(z: number): void;
  unsafeNative?(): unknown;
}

export interface FeatureHandle extends UpdatableHandle<Partial<FeatureRenderSpec>> {
  flyTo(opts?: FlyToOptions): Promise<void>;
  unsafeNative?(): unknown;
}

export interface EffectHandle extends UpdatableHandle<Partial<WeatherEffectSpec>> {}

export interface EventHandle extends Handle {}
