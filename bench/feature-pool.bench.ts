import '../packages/adapter-cesium/test/setup';

import { bench, describe } from 'vitest';
import { getViewerRuntime, metricsBus } from '../packages/core/src';
import { __test__, createCgxViewer } from '../packages/adapter-cesium/src';

const FEATURE_COUNT = 10_000;
const WARM_REUSE_CYCLES = 5;

describe('feature dispose - 10k point', () => {
  bench(
    'baseline: dispose 10k point features',
    async () => {
      __test__.resetMetrics();
      __test__.resetPools();
      metricsBus.reset();

      const viewer = createCgxViewer({ container: document.createElement('div') });
      await viewer.ready();

      const adapter = getViewerRuntime(viewer);
      const mountStart = performance.now();
      const handles = Array.from({ length: FEATURE_COUNT }, (_, i) =>
        adapter.mountFeature({
          id: `point-${i}`,
          kind: 'point',
          position: { lng: i * 1e-4, lat: 0 },
        }),
      );
      const mountElapsed = performance.now() - mountStart;

      const start = performance.now();
      for (const handle of handles) handle.dispose();
      const elapsed = performance.now() - start;
      let warmMountElapsed = 0;
      let warmDisposeElapsed = 0;
      for (let cycle = 0; cycle < WARM_REUSE_CYCLES; cycle++) {
        const warmMountStart = performance.now();
        const warmHandles = Array.from({ length: FEATURE_COUNT }, (_, i) =>
          adapter.mountFeature({
            id: `warm-point-${cycle}-${i}`,
            kind: 'point',
            position: { lng: i * 1e-4, lat: cycle * 1e-4 },
          }),
        );
        warmMountElapsed += performance.now() - warmMountStart;

        const warmDisposeStart = performance.now();
        for (const handle of warmHandles) handle.dispose();
        warmDisposeElapsed += performance.now() - warmDisposeStart;
      }
      const metrics = __test__.getMetricsSnapshot();
      const poolHitRate = metricsBus.snapshot().poolHitRate ?? 0;

      // jsdom/Cesium mocks estimate adapter CPU cost only; browser/WebGL timing must
      // be compared separately if native renderer cost is part of the acceptance bar.
      console.log(
        `mount elapsed: ${mountElapsed.toFixed(1)} ms; dispose elapsed: ${elapsed.toFixed(1)} ms; ` +
          `warmMountAvg=${(warmMountElapsed / WARM_REUSE_CYCLES).toFixed(1)} ms; ` +
          `warmDisposeAvg=${(warmDisposeElapsed / WARM_REUSE_CYCLES).toFixed(1)} ms; ` +
          `poolHitRate=${Math.round(poolHitRate * 100)}%; ` +
          `patches=${metrics.framePatchCount}, nativeWrites=${metrics.frameNativeWriteCount}`,
      );

      await viewer.dispose();
    },
    { iterations: 1, warmupIterations: 0, warmupTime: 0, time: 1 },
  );
});
