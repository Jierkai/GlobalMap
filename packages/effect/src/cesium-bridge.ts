type CesiumNamespace = typeof import('cesium');

export const Cesium = (globalThis as typeof globalThis & {
  Cesium?: CesiumNamespace;
}).Cesium as CesiumNamespace;
