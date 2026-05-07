import { describe, expect, it } from 'vitest';
import { createWeatherEffectManager, RainWeatherEffect, WeatherType } from '../src/index.js';

describe('effect package', () => {
  it('builds a rain weather spec', () => {
    const rain = new RainWeatherEffect({ opacity: 0.5, windSpeed: 2 });
    const spec = rain.toSpec();

    expect(spec.kind).toBe(WeatherType.Rain);
    expect(spec.opacity).toBe(0.5);
    expect(spec.enabled).toBe(false);
    expect(spec.uniforms).toMatchObject({
      opacity: 0.5,
      windSpeed: 2,
    });
  });

  it('initializes weather effects from configs', async () => {
    const manager = createWeatherEffectManager();
    await manager.initFromConfigs([
      { type: WeatherType.Rain, opacity: 0.4 },
    ]);

    expect(manager.getEffectByType(WeatherType.Rain)).toBeDefined();
    expect(manager.getActiveEffects()).toHaveLength(1);
  });
});
