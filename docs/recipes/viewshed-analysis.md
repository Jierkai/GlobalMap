# Viewshed Analysis

Calculate visibility from an observation point.

```ts
import { createAnalysisRunner } from '@cgx/analysis';

const runner = createAnalysisRunner();

const viewshed = await runner.run('viewshed', {
  observer: [116.4, 39.9, 100],  // lng, lat, alt (meters)
  heading: 0,                     // 0 = North
  fov: 90,                        // Field of view (degrees)
  maxDistance: 5000,               // Max observation distance (meters)
  cellSize: 100,                  // Grid cell size (meters)
  elevation: 50,                  // Ground elevation
});

// Result
console.log('Grid:', viewshed.grid);           // Uint8Array (0=hidden, 1=visible)
console.log('Size:', viewshed.width, 'x', viewshed.height);
console.log('Origin:', viewshed.origin);       // [lng, lat]
console.log('Cell size:', viewshed.cellSizeDeg); // degrees
```

## Full 360° Viewshed

```ts
const fullViewshed = await runner.run('viewshed', {
  observer: [116.4, 39.9, 200],
  heading: 0,
  fov: 360,           // Full circle
  maxDistance: 10000,
  cellSize: 200,
  elevation: 0,
});
```
