import { describe, it, expectTypeOf } from 'vitest';
import type {
  LayerRenderSpec,
  FeatureRenderSpec,
  WeatherEffectSpec,
  LngLat,
  ScreenPoint,
} from '../src/spec/index.js';

describe('@cgx/core spec barrel', () => {
  it('LayerRenderSpec discriminated by kind', () => {
    const a: LayerRenderSpec = { id: 'a', kind: 'imagery', provider: {} };
    expectTypeOf(a.kind).toEqualTypeOf<'imagery' | 'terrain' | 'graphic' | 'data'>();
  });

  it('FeatureRenderSpec discriminated by kind', () => {
    const f: FeatureRenderSpec = { id: 'p', kind: 'point' };
    expectTypeOf(f.kind).toEqualTypeOf<
      'point' | 'polyline' | 'polygon' | 'model' | 'label' | 'text' | 'billboard'
    >();
  });

  it('WeatherEffectSpec / LngLat / ScreenPoint shapes', () => {
    const w: WeatherEffectSpec = { id: 'w', kind: 'rain' };
    const ll: LngLat = { lng: 1, lat: 2 };
    const sp: ScreenPoint = { x: 0, y: 0 };
    expectTypeOf(w.id).toEqualTypeOf<string>();
    expectTypeOf(ll.alt).toEqualTypeOf<number | undefined>();
    expectTypeOf(sp.x).toEqualTypeOf<number>();
  });
});
