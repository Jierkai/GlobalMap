import { WeatherEffect } from './base.js';
import { WeatherType, type LightningConfig } from './types.js';

const DEFAULT_CONFIG: LightningConfig = {
  intensity: 0.7,
  opacity: 1.0,
  interval: 3,
  flashDuration: 0.3,
  flashColor: 'rgba(255,255,255,1)',
  branchCount: 3,
};

export class LightningWeatherEffect extends WeatherEffect<LightningConfig> {
  readonly type = WeatherType.Lightning;

  constructor(config: LightningConfig = {}) {
    super({ ...DEFAULT_CONFIG, ...config });
  }

  protected createUniforms(config: LightningConfig): Record<string, unknown> {
    return {
      intensity: config.intensity ?? DEFAULT_CONFIG.intensity,
      opacity: config.opacity ?? DEFAULT_CONFIG.opacity,
      interval: config.interval ?? DEFAULT_CONFIG.interval,
      flashDuration: config.flashDuration ?? DEFAULT_CONFIG.flashDuration,
      flashColor: config.flashColor ?? DEFAULT_CONFIG.flashColor,
      branchCount: config.branchCount ?? DEFAULT_CONFIG.branchCount,
    };
  }
}
