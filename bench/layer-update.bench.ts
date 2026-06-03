import '../packages/adapter-cesium/test/setup';

import { bench, describe } from 'vitest';
import { getViewerRuntime } from '../packages/core/src';
import { __test__, createCgxViewer } from '../packages/adapter-cesium/src';

const FEATURE_COUNT = 10_000;
const FRAME_COUNT = 60;

async function runPolylineColorUpdates(updatesPerHandlePerFrame: number): Promise<{
  elapsed: number;
  frameMs: number;
  patches: number;
  nativeWrites: number;
}> {
  __test__.resetMetrics();

  const viewer = createCgxViewer({ container: document.createElement('div') });
  await viewer.ready();

  const adapter = getViewerRuntime(viewer);
  const handles = Array.from({ length: FEATURE_COUNT }, (_, i) =>
    adapter.mountFeature({
      id: `polyline-${updatesPerHandlePerFrame}-${i}`,
      kind: 'polyline',
      positions: [
        { lng: i * 1e-4, lat: 0 },
        { lng: i * 1e-4, lat: 1 },
      ],
      polyline: { material: { rgba: [255, 0, 0, 255] } },
    }),
  );

  const start = performance.now();
  for (let frame = 0; frame < FRAME_COUNT; frame++) {
    for (let burst = 0; burst < updatesPerHandlePerFrame; burst++) {
      const r = ((frame * updatesPerHandlePerFrame + burst) * 4) & 0xff;
      for (const handle of handles) {
        handle.update({ polyline: { material: { rgba: [r, 0, 0, 255] } } });
      }
    }
    // jsdom has no real Cesium render loop, so explicitly flush the adapter batcher
    // to measure current public API scheduling plus native-write work per frame.
    __test__.flushUpdates();
  }
  const elapsed = performance.now() - start;
  const metrics = __test__.getMetricsSnapshot();

  for (const handle of handles) handle.dispose();
  await viewer.dispose();

  return {
    elapsed,
    frameMs: elapsed / FRAME_COUNT,
    patches: metrics.framePatchCount,
    nativeWrites: metrics.frameNativeWriteCount,
  };
}

describe('layer update - 10k polyline color', () => {
  bench(
    'baseline: update 10k polylines across 60 flushed frames',
    async () => {
      const result = await runPolylineColorUpdates(1);

      console.log(
        `60-frame elapsed: ${result.elapsed.toFixed(1)} ms (${result.frameMs.toFixed(2)} ms/frame); ` +
          `patches=${result.patches}, nativeWrites=${result.nativeWrites}`,
      );
    },
    { iterations: 1, warmupIterations: 0, warmupTime: 0, time: 1 },
  );

  bench(
    'coalescing: 4 color patches per polyline per flushed frame',
    async () => {
      const result = await runPolylineColorUpdates(4);
      const writeRatio = result.nativeWrites / result.patches;

      console.log(
        `4x coalesced elapsed: ${result.elapsed.toFixed(1)} ms (${result.frameMs.toFixed(2)} ms/frame); ` +
          `patches=${result.patches}, nativeWrites=${result.nativeWrites}, writeRatio=${writeRatio.toFixed(2)}`,
      );
    },
    { iterations: 1, warmupIterations: 0, warmupTime: 0, time: 1 },
  );
});
