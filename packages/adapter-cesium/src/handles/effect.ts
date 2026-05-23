import type { EffectHandle, WeatherEffectSpec } from '@cgx/core';
import type { CesiumViewerHandle } from '../types';

export function createWeatherEffectHandle(
  _viewer: CesiumViewerHandle,
  spec: WeatherEffectSpec,
): EffectHandle {
  let current = spec;
  return {
    id: spec.id,
    update(patch) {
      current = { ...current, ...patch };
    },
    dispose() {
      // stub: 真实实现属阶段 6+ (天气/特效系统)
      void current;
    },
  };
}
