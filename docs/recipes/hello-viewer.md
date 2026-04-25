# Hello Viewer

Create your first 3D globe with Cgx.

```ts
import { createViewer } from '@cgx/core';

const viewer = createViewer('#app', {
  camera: {
    lng: 116.404,
    lat: 39.915,
    height: 1000000,
    heading: 0,
    pitch: -45,
  },
});

// Access the underlying Cesium.Viewer
console.log(viewer.cesium);

// Enable performance HUD
viewer.enableVitals();
```

## What's happening

1. `createViewer` initializes a Cesium.Viewer inside the `#app` container
2. Camera is positioned over Beijing
3. `viewer.cesium` provides the escape hatch to the raw Cesium API
4. `enableVitals()` shows FPS/DrawCall/Tile/Memory overlay
