export type { WeatherEffectSpec } from '@cgx/core';

export {
  WeatherState,
  WeatherType,
  type CloudConfig,
  type FogConfig,
  type LightningConfig,
  type RainConfig,
  type SnowConfig,
  type WeatherBaseConfig,
  type WeatherConfigListener,
  type WeatherEffectConfig,
  type WeatherEffectInput,
  type WeatherEffectLike,
  type WeatherEffectManager,
  type WeatherStateListener,
  type WeatherTransitionOptions,
} from './types.js';

export { WeatherEffect } from './base.js';
export {
  WeatherEffectManagerImpl,
  createWeatherEffectManager,
  initWeatherEffects,
} from './manager.js';

export { RainWeatherEffect } from './rain.js';
export { SnowWeatherEffect } from './snow.js';
export { FogWeatherEffect } from './fog.js';
export { CloudWeatherEffect } from './cloud.js';
export { LightningWeatherEffect } from './lightning.js';

export { AnimationLoop } from './utils/animator.js';

export { RAIN_FRAGMENT_SHADER } from './shaders/rain.js';
export { SNOW_FRAGMENT_SHADER } from './shaders/snow.js';
export { FOG_FRAGMENT_SHADER } from './shaders/fog.js';
export { CLOUD_FRAGMENT_SHADER } from './shaders/cloud.js';
export { LIGHTNING_FRAGMENT_SHADER } from './shaders/lightning.js';
