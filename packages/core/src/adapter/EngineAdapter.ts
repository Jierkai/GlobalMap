import type {
  LayerRenderSpec,
  FeatureRenderSpec,
  WeatherEffectSpec,
  ScreenPoint,
  LngLat,
  CartesianPoint3D,
} from '../spec/index.js';
import type { LayerHandle, FeatureHandle, EffectHandle } from '../handle/index.js';
import type { ViewerOptions } from '../types.js';

export interface PickResult {
  id: string;
  position?: LngLat;
  raw?: unknown;
}

export interface EngineAdapter {
  bootstrap(opts: ViewerOptions): Promise<void>;
  mountLayer(spec: LayerRenderSpec): LayerHandle;
  mountFeature(spec: FeatureRenderSpec): FeatureHandle;
  mountWeatherEffect(spec: WeatherEffectSpec): EffectHandle;
  pickAt(point: ScreenPoint): PickResult | null;
  project(p: LngLat): CartesianPoint3D;
  unproject(p: CartesianPoint3D): LngLat;
  unsafeNative?(): unknown;
  dispose(): Promise<void>;
}
