import { getDefaultBatcher } from '../scheduler';
import { resetEntityPools } from '../handles/_entity-pool';

export function flushUpdates(): void {
  getDefaultBatcher().flush();
}

export function getMetricsSnapshot(): {
  framePatchCount: number;
  frameNativeWriteCount: number;
} {
  return getDefaultBatcher().snapshot();
}

export function resetMetrics(): void {
  getDefaultBatcher().resetMetrics();
}

export function resetPools(): void {
  resetEntityPools();
}
