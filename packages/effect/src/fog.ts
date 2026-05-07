import { WeatherEffect } from './base.js';
import { WeatherType, type FogConfig } from './types.js';

const DEFAULT_CONFIG: FogConfig = {
  intensity: 0.5,
  density: 0.0003,
  color: 'rgba(200,210,220,0.7)',
  minHeight: 0,
  maxHeight: 500,
  opacity: 1.0,
};

export class FogWeatherEffect extends WeatherEffect<FogConfig> {
  readonly type = WeatherType.Fog;

  constructor(config: FogConfig = {}) {
    super({ ...DEFAULT_CONFIG, ...config });
  }

  protected createUniforms(config: FogConfig): Record<string, unknown> {
    return {
      intensity: config.intensity ?? DEFAULT_CONFIG.intensity,
      density: config.density ?? DEFAULT_CONFIG.density,
      color: config.color ?? DEFAULT_CONFIG.color,
      minHeight: config.minHeight ?? DEFAULT_CONFIG.minHeight,
      maxHeight: config.maxHeight ?? DEFAULT_CONFIG.maxHeight,
      opacity: config.opacity ?? DEFAULT_CONFIG.opacity,
    };
  }
}
