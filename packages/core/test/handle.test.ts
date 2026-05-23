import { describe, it, expectTypeOf } from 'vitest';
import type {
  Handle,
  UpdatableHandle,
  LayerHandle,
  FeatureHandle,
  EffectHandle,
  EventHandle,
  PickResult,
} from '../src/handle/index.js';
import type { LayerRenderSpec, FeatureRenderSpec, WeatherEffectSpec } from '../src/spec/index.js';

describe('@cgx/core handle module', () => {
  it('Handle has id and dispose only', () => {
    expectTypeOf<keyof Handle>().toEqualTypeOf<'id' | 'dispose'>();
  });

  it('UpdatableHandle adds update(patch)', () => {
    type X = UpdatableHandle<{ a: number }>;
    expectTypeOf<X>().toMatchTypeOf<{ id: string; dispose(): void; update(p: { a: number }): void }>();
  });

  it('LayerHandle accepts Partial<LayerRenderSpec>', () => {
    type Patch = Parameters<LayerHandle['update']>[0];
    expectTypeOf<Patch>().toEqualTypeOf<Partial<LayerRenderSpec>>();
  });

  it('FeatureHandle exposes flyTo and update<Partial<FeatureRenderSpec>>', () => {
    type Patch = Parameters<FeatureHandle['update']>[0];
    expectTypeOf<Patch>().toEqualTypeOf<Partial<FeatureRenderSpec>>();
    expectTypeOf<FeatureHandle['flyTo']>().toBeFunction();
  });

  it('EffectHandle / EventHandle / PickResult exist', () => {
    expectTypeOf<EffectHandle['update']>().toBeFunction();
    expectTypeOf<keyof EventHandle>().toEqualTypeOf<'id' | 'dispose'>();
    expectTypeOf<PickResult>().toMatchTypeOf<{ id: string }>();
  });
});
