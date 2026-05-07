import { WeatherEffect } from './base.js';
import { WeatherType, type SnowConfig } from './types.js';

const DEFAULT_CONFIG: SnowConfig = {
  intensity: 0.5,
  speed: 1.0,
  opacity: 0.8,
  flakeSize: 0.02,
  windSpeed: 0,
};

export class SnowWeatherEffect extends WeatherEffect<SnowConfig> {
  readonly type = WeatherType.Snow;

  constructor(config: SnowConfig = {}) {
    super({ ...DEFAULT_CONFIG, ...config });
  }

  protected createUniforms(config: SnowConfig): Record<string, unknown> {
    return {
      intensity: config.intensity ?? DEFAULT_CONFIG.intensity,
      speed: config.speed ?? DEFAULT_CONFIG.speed,
      opacity: config.opacity ?? DEFAULT_CONFIG.opacity,
      flakeSize: config.flakeSize ?? DEFAULT_CONFIG.flakeSize,
      flakeTexture: config.flakeTexture,
      accumulation: config.accumulation,
      windSpeed: config.windSpeed ?? DEFAULT_CONFIG.windSpeed,
      windDirection: config.windDirection,
    };
  }
}
