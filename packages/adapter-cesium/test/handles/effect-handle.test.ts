import { describe, it, expect, vi } from 'vitest';
import type { EffectHandle } from '@cgx/core';
import { createWeatherEffectHandle } from '../../src/handles/effect';

const fakeViewer = { destroy: vi.fn() } as any;

describe('WeatherEffectHandle factory', () => {
  it('returns an EffectHandle shape', () => {
    const h: EffectHandle = createWeatherEffectHandle(fakeViewer, {
      id: 'rain1', kind: 'rain', intensity: 0.5,
    } as any);
    expect(h.id).toBe('rain1');
    expect(typeof h.dispose).toBe('function');
    expect(typeof h.update).toBe('function');
  });

  it('update does not throw and dispose is idempotent', () => {
    const h = createWeatherEffectHandle(fakeViewer, {
      id: 'snow1', kind: 'snow',
    } as any);
    expect(() => h.update({ intensity: 0.8 } as any)).not.toThrow();
    h.dispose();
    expect(() => h.dispose()).not.toThrow();
  });
});
