# @cgx/adapter-cesium

This is the **L1 Adapter Layer** for Cgx.
It serves as the **only** package in the entire Cgx monorepo that is allowed to directly import and use the native `cesium` API at runtime.

## Core Rules

1. **Isolation**: Do NOT leak Cesium native types into the return types of L1 APIs. Uses opaque types (like `NativeScene`) to hide Cesium internals from L2/L3.
2. **Escape Hatch**: Use `unsafeGetCesium` or `unsafeGetNativeViewer` when you absolutely must access native Cesium capabilities in higher layers or apps. Ensure users understand the coupling consequences.

## Example

```ts
import { createViewer, unsafeGetCesium } from '@cgx/adapter-cesium';

// Type-safe interaction without exposing 'cesium'
const viewerHandle = createViewer(document.body);
viewerHandle.destroy();

// Escape hatch
const Cesium = unsafeGetCesium();
```