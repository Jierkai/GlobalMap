import type Cesium from 'cesium';

declare const __opaqueTag: unique symbol;

export type Opaque<K extends string> = { readonly [__opaqueTag]: K };

export type NativeScene = Opaque<'Scene'>;
export type NativeCamera = Opaque<'Camera'>;
export type NativeClock = Opaque<'Clock'>;
export type NativeImageryLayerCollection = Opaque<'ImageryLayerCollection'>;
export type NativeTerrainProvider = Opaque<'TerrainProvider'>;
export type NativeCartesian3 = Opaque<'Cartesian3'>;

export interface LngLat {
  lng: number;
  lat: number;
  alt?: number;
}

export interface ViewerOptions extends Cesium.Viewer.ConstructorOptions {
  layers?: Cesium.ImageryLayer[];
}

export interface CesiumViewerHandle {
  destroy(): void;
  readonly scene: NativeScene;
  readonly camera: NativeCamera;
  readonly clock: NativeClock;
  readonly imageryLayers: NativeImageryLayerCollection;
  readonly terrainProvider: NativeTerrainProvider;
}

export type TypedEvents = {
  click: { position: LngLat; windowPosition: { x: number; y: number } };
  dblclick: { position: LngLat; windowPosition: { x: number; y: number } };
  mousemove: {
    startPosition: LngLat;
    endPosition: LngLat;
    windowPosition: { x: number; y: number };
  };
  mousedown: { position: LngLat; windowPosition: { x: number; y: number } };
  mouseup: { position: LngLat; windowPosition: { x: number; y: number } };
  rightclick: { position: LngLat; windowPosition: { x: number; y: number } };
};

export type Off = () => void;
