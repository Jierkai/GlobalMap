# Draw Polygon

Interactive polygon drawing with constraints.

```ts
import { createPolygonSketcher } from '@cgx/sketch';
import { orthoConstraint, snapToEndpoint } from '@cgx/core';

const sketcher = createPolygonSketcher({
  constraints: [
    snapToEndpoint({ target: 'endpoint', radius: 10 }),
    orthoConstraint(),
  ],
  minVertices: 3,
});

// Start drawing
sketcher.start();

// Add vertices (constraints are applied automatically)
sketcher.addVertex({ x: 116.4, y: 39.9 });
sketcher.addVertex({ x: 116.5, y: 39.9 });
sketcher.addVertex({ x: 116.5, y: 40.0 });

// Complete
const vertices = sketcher.complete();

// Listen to events
sketcher.on('vertex-added', ({ vertex, index }) => {
  console.log(`Vertex ${index}:`, vertex);
});

sketcher.on('completed', ({ vertices }) => {
  console.log('Polygon completed:', vertices);
});
```

## Available Sketchers

| Function | Kind | Min Vertices |
|----------|------|-------------|
| `createPointSketcher()` | point | 1 |
| `createPolylineSketcher()` | polyline | 2 |
| `createPolygonSketcher()` | polygon | 3 |
| `createRectangleSketcher()` | rectangle | 2 |
| `createCircleSketcher()` | circle | 2 |
| `createFreehandSketcher()` | freehand | 2 |
