# Imagery Layer

Add XYZ, WMS, WMTS, or ArcGIS imagery layers.

```ts
import { createViewer } from '@cgx/core';
import { createImageryLayer } from '@cgx/layer';

const viewer = createViewer('#app');

// XYZ tile layer
const xyzLayer = createImageryLayer({
  type: 'xyz',
  url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
});

// Reactive properties
xyzLayer.visible.set(true);
xyzLayer.opacity.set(0.8);
```

## WMS Layer

```ts
const wmsLayer = createImageryLayer({
  type: 'wms',
  url: 'https://example.com/wms',
  layers: 'temperature',
  parameters: { format: 'image/png', transparent: true },
});
```

## Chinese Providers

```ts
import { createBaiduImagery } from '@cgx/provider-cn';

const baiduLayer = createBaiduImagery({
  style: 'normal', // or 'satellite'
});
```
