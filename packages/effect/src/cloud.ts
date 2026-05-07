import { WeatherEffect } from './base.js';
import { WeatherType, type CloudConfig } from './types.js';

const DEFAULT_CONFIG: CloudConfig = {
  intensity: 0.5,
  coverage: 0.4,
  driftSpeed: 0.2,
  cloudColor: 'rgba(255,255,255,0.7)',
  opacity: 0.9,
};

export class CloudWeatherEffect extends WeatherEffect<CloudConfig> {
  readonly type = WeatherType.Cloud;

  constructor(config: CloudConfig = {}) {
    super({ ...DEFAULT_CONFIG, ...config });
  }

  protected createUniforms(config: CloudConfig): Record<string, unknown> {
    return {
      intensity: config.intensity ?? DEFAULT_CONFIG.intensity,
      coverage: config.coverage ?? DEFAULT_CONFIG.coverage,
      driftSpeed: config.driftSpeed ?? DEFAULT_CONFIG.driftSpeed,
      cloudColor: config.cloudColor ?? DEFAULT_CONFIG.cloudColor,
      opacity: config.opacity ?? DEFAULT_CONFIG.opacity,
    };
  }
}
