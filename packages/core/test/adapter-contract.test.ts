import { describe, it, expectTypeOf } from 'vitest';
import type { EngineAdapter, PickResult } from '../src/adapter/EngineAdapter.js';
import type {
  LayerRenderSpec,
  FeatureRenderSpec,
  WeatherEffectSpec,
  ScreenPoint,
  LngLat,
  CartesianPoint3D,
} from '../src/spec/index.js';
import type { LayerHandle, FeatureHandle, EffectHandle } from '../src/handle/index.js';
import type { ViewerOptions } from '../src/types.js';

describe('EngineAdapter contract', () => {
  it('declares required methods (non-optional)', () => {
    type Required = 'bootstrap' | 'mountLayer' | 'mountFeature' | 'mountWeatherEffect' | 'pickAt' | 'project' | 'unproject' | 'dispose';
    type Keys = keyof EngineAdapter;
    expectTypeOf<Required>().toMatchTypeOf<Keys>();
  });

  it('mountLayer takes LayerRenderSpec and returns LayerHandle', () => {
    type Fn = EngineAdapter['mountLayer'];
    expectTypeOf<Parameters<Fn>[0]>().toEqualTypeOf<LayerRenderSpec>();
    expectTypeOf<ReturnType<Fn>>().toEqualTypeOf<LayerHandle>();
  });

  it('mountFeature takes FeatureRenderSpec and returns FeatureHandle', () => {
    type Fn = EngineAdapter['mountFeature'];
    expectTypeOf<Parameters<Fn>[0]>().toEqualTypeOf<FeatureRenderSpec>();
    expectTypeOf<ReturnType<Fn>>().toEqualTypeOf<FeatureHandle>();
  });

  it('pickAt returns PickResult | null', () => {
    type Fn = EngineAdapter['pickAt'];
    expectTypeOf<Parameters<Fn>[0]>().toEqualTypeOf<ScreenPoint>();
    expectTypeOf<ReturnType<Fn>>().toEqualTypeOf<PickResult | null>();
  });

  it('project / unproject use neutral coord types', () => {
    expectTypeOf<EngineAdapter['project']>().parameter(0).toEqualTypeOf<LngLat>();
    expectTypeOf<EngineAdapter['project']>().returns.toEqualTypeOf<CartesianPoint3D>();
  });

  it('bootstrap and dispose return Promise<void>', () => {
    expectTypeOf<EngineAdapter['bootstrap']>().parameter(0).toEqualTypeOf<ViewerOptions>();
    expectTypeOf<EngineAdapter['bootstrap']>().returns.toEqualTypeOf<Promise<void>>();
    expectTypeOf<EngineAdapter['dispose']>().returns.toEqualTypeOf<Promise<void>>();
  });
});
