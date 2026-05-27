import type * as Cesium from 'cesium';
import type {
  EngineAdapter,
  ViewerOptions as CoreViewerOptions,
} from '@cgx/core';

export type {
  Disposable,
  ScreenPoint,
  LngLat,
  CartesianPoint3D,
  LayerRenderSpecBase,
  ImageryLayerRenderSpec,
  TerrainLayerRenderSpec,
  GraphicLayerRenderSpec,
  DataLayerRenderSpec,
  LayerRenderSpec,
  GraphicRenderMode,
  LabelRenderSpec,
  FeatureRenderSpecBase,
  PointFeatureRenderSpec,
  PolylineFeatureRenderSpec,
  PolygonFeatureRenderSpec,
  ModelRenderMode,
  ModelFeatureRenderSpec,
  LabelFeatureRenderSpec,
  TextFeatureRenderSpec,
  BillboardFeatureRenderSpec,
  FeatureRenderSpec,
  WeatherEffectKind,
  WeatherEffectSpec,
  SceneCenter,
  SkyboxSources,
  SceneBgType,
  SceneOptions,
  TerrainOptions,
  BasemapSpecBase,
  GaodeBasemapSpec,
  BaiduBasemapSpec,
  TiandituBasemapSpec,
  BingBasemapSpec,
  PresetBasemapSpec,
  BasemapSpec,
  EngineAdapter,
} from '@cgx/core';

declare const __opaqueTag: unique symbol;
export type Opaque<K extends string> = { readonly [__opaqueTag]: K };

export type NativeScene = Opaque<'Scene'>;
export type NativeCamera = Opaque<'Camera'>;
export type NativeClock = Opaque<'Clock'>;
export type NativeImageryLayerCollection = Opaque<'ImageryLayerCollection'>;
export type NativeTerrainProvider = Opaque<'TerrainProvider'>;
export type NativeCartesian3 = Opaque<'Cartesian3'>;

export type CesiumViewerOptions = Cesium.Viewer.ConstructorOptions;

export interface CesiumViewerHandle {
  destroy(): void;
  readonly scene: NativeScene;
  readonly camera: NativeCamera;
  readonly clock: NativeClock;
  readonly imageryLayers: NativeImageryLayerCollection;
  readonly terrainProvider: NativeTerrainProvider;
}

/** @deprecated Use ViewerOptions from @cgx/core. Alias kept for one release. */
export type CgxViewerRuntimeOptions = CoreViewerOptions;

export interface CesiumRuntime extends EngineAdapter {
  readonly kind?: string;
}

export type TypedEvents = {
  click: { position: import('@cgx/core').LngLat; windowPosition: { x: number; y: number } };
  dblclick: { position: import('@cgx/core').LngLat; windowPosition: { x: number; y: number } };
  mousemove: {
    startPosition: import('@cgx/core').LngLat;
    endPosition: import('@cgx/core').LngLat;
    windowPosition: { x: number; y: number };
  };
  mousedown: { position: import('@cgx/core').LngLat; windowPosition: { x: number; y: number } };
  mouseup: { position: import('@cgx/core').LngLat; windowPosition: { x: number; y: number } };
  rightclick: { position: import('@cgx/core').LngLat; windowPosition: { x: number; y: number } };
};

export type Off = () => void;
