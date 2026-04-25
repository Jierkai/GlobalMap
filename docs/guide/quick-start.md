# Quick Start

## Installation

```bash
# Core (required)
pnpm add @cgx/core @cgx/reactive

# Optional packages
pnpm add @cgx/layer @cgx/feature @cgx/sketch @cgx/edit @cgx/analysis
pnpm add @cgx/ui @cgx/material

# Framework adapters (optional)
pnpm add @cgx/adapter-vue   # Vue 3
```

## Hello World

```ts
import { createViewer } from '@cgx/core';

const viewer = createViewer('#app', {
  camera: { lng: 116.4, lat: 39.9, height: 1000000 },
});

console.log('Viewer ready:', viewer.cesium);
```

## Next Steps

- [Architecture](/guide/architecture) - Understand the L1-L4 layer design
- [Signals](/guide/signals) - Learn the reactive system
- [Recipes](/recipes/) - Practical examples
