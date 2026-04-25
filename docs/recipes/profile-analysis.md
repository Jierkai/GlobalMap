# Profile Analysis

Generate elevation profiles along a line.

```ts
import { createAnalysisRunner } from '@cgx/analysis';

const runner = createAnalysisRunner();

const profile = await runner.run('profile', {
  line: new Float64Array([
    116.0, 39.0,  // Start point
    116.1, 39.0,  // Intermediate point
    116.2, 39.1,  // End point
  ]),
  sampleDistance: 1000, // Sample every 1km
  elevation: 100,       // Fixed elevation (or Float64Array for DEM)
});

// Result
console.log('Points:', profile.points);       // Float64Array [lng0, lat0, lng1, lat1, ...]
console.log('Elevations:', profile.elevations); // Float64Array
console.log('Distances:', profile.distances);   // Float64Array (cumulative)
```

## With DEM Data

```ts
const dem = new Float64Array([100, 150, 200, 180, 120]);

const profile = await runner.run('profile', {
  line: new Float64Array([116.0, 39.0, 116.1, 39.0, 116.2, 39.1]),
  sampleDistance: 500,
  elevation: dem, // Per-vertex elevation
});
```
