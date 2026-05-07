import { WeatherEffect } from './base.js';
import { WeatherType, type RainConfig } from './types.js';

const DEFAULT_CONFIG: RainConfig = {
  intensity: 0.5,
  speed: 1.0,
  opacity: 0.6,
  dropColor: 'rgba(174,194,224,0.6)',
  windSpeed: 0,
};

export class RainWeatherEffect extends WeatherEffect<RainConfig> {
  readonly type = WeatherType.Rain;

  constructor(config: RainConfig = {}) {
    super({ ...DEFAULT_CONFIG, ...config });
  }

  protected createUniforms(config: RainConfig): Record<string, unknown> {
    return {
      intensity: config.intensity ?? DEFAULT_CONFIG.intensity,
      speed: config.speed ?? DEFAULT_CONFIG.speed,
      opacity: config.opacity ?? DEFAULT_CONFIG.opacity,
      dropColor: config.dropColor ?? DEFAULT_CONFIG.dropColor,
      windSpeed: config.windSpeed ?? DEFAULT_CONFIG.windSpeed,
      dropSize: config.dropSize,
      windDirection: config.windDirection,
    };
  }
}
