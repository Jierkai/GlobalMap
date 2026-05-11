# Imagery Layer

Add XYZ, WMS, WMTS, or ArcGIS imagery layers.

```ts
import { createViewer } from '@cgx/core';
import { ImageryLayer } from '@cgx/layer';
import { createXyzProvider } from '@cgx/layer/provider/xyz';

const viewer = createViewer('#app');

// XYZ tile layer
const xyzLayer = new ImageryLayer({
  provider: createXyzProvider({
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
  }),
});

// Reactive properties
xyzLayer.visible(true);
xyzLayer.opacity(0.8);

viewer.layers.add(xyzLayer);
```

## WMS Layer

```ts
import { ImageryLayer } from '@cgx/layer';
import { createWmsProvider } from '@cgx/layer/provider/wms';

const wmsLayer = new ImageryLayer({
  provider: createWmsProvider({
    url: 'https://example.com/wms',
    layers: 'temperature',
    parameters: { format: 'image/png', transparent: 'true' },
  }),
});
```

## Chinese Providers

```ts
import { createBaiduImagery } from '@cgx/provider-cn';

const baiduLayer = createBaiduImagery({
  style: 'normal', // or 'satellite'
});
```
