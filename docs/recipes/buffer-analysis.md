# Buffer Analysis

Create spatial buffers around features.

```ts
import { createAnalysisRunner } from '@cgx/analysis';

const runner = createAnalysisRunner();

// Buffer a point
const pointBuffer = await runner.run('buffer', {
  geojson: { type: 'Point', coordinates: [116.4, 39.9] },
  distance: 1000, // meters
  steps: 32,
});

console.log(pointBuffer); // GeoJSON Polygon

// Buffer a line
const lineBuffer = await runner.run('buffer', {
  geojson: {
    type: 'LineString',
    coordinates: [[116.0, 39.0], [116.1, 39.1]],
  },
  distance: 500,
});

// Buffer a polygon
const polygonBuffer = await runner.run('buffer', {
  geojson: {
    type: 'Polygon',
    coordinates: [[[116.0, 39.0], [116.1, 39.0], [116.1, 39.1], [116.0, 39.1], [116.0, 39.0]]],
  },
  distance: 200,
});
```

## With AbortController

```ts
const ac = new AbortController();
setTimeout(() => ac.abort(), 5000);

try {
  const result = await runner.run('buffer', input, { signal: ac.signal });
} catch (err) {
  if (err instanceof DOMException && err.name === 'AbortError') {
    console.log('Analysis cancelled');
  }
}
```
