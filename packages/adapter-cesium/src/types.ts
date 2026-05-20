import type * as Cesium from 'cesium';

declare const __opaqueTag: unique symbol;

export type Opaque<K extends string> = { readonly [__opaqueTag]: K };

export type NativeScene = Opaque<'Scene'>;
export type NativeCamera = Opaque<'Camera'>;
export type NativeClock = Opaque<'Clock'>;
export type NativeImageryLayerCollection = Opaque<'ImageryLayerCollection'>;
export type NativeTerrainProvider = Opaque<'TerrainProvider'>;
export type NativeCartesian3 = Opaque<'Cartesian3'>;

export interface Disposable {
  dispose(): void;
}

export interface Updatable<TSpec = unknown> extends Disposable {
  update?(spec: TSpec): void;
}

export interface ScreenPoint {
  x: number;
  y: number;
}

export interface LngLat {
  lng: number;
  lat: number;
  alt?: number;
}

export interface CartesianPoint3D {
  x: number;
  y: number;
  z?: number;
}

export type CesiumViewerOptions = Cesium.Viewer.ConstructorOptions;
export type ViewerOptions = CesiumViewerOptions;

export interface CesiumViewerHandle {
  destroy(): void;
  readonly scene: NativeScene;
  readonly camera: NativeCamera;
  readonly clock: NativeClock;
  readonly imageryLayers: NativeImageryLayerCollection;
  readonly terrainProvider: NativeTerrainProvider;
}

export interface LayerRenderSpecBase {
  id: string;
  kind: string;
  visible?: boolean;
  opacity?: number;
  zIndex?: number;
}

export interface ImageryLayerRenderSpec extends LayerRenderSpecBase {
  kind: 'imagery';
  provider: unknown;
}

export interface TerrainLayerRenderSpec extends LayerRenderSpecBase {
  kind: 'terrain';
  provider: unknown;
}

export interface GraphicLayerRenderSpec extends LayerRenderSpecBase {
  kind: 'graphic';
  graphics?: FeatureRenderSpec[];
  clustering?: Record<string, unknown>;
  renderMode?: GraphicRenderMode;
}

export interface DataLayerRenderSpec extends LayerRenderSpecBase {
  kind: 'data';
  sourceType: string;
  payload?: unknown;
  options?: Record<string, unknown>;
}

export type LayerRenderSpec =
  | ImageryLayerRenderSpec
  | TerrainLayerRenderSpec
  | GraphicLayerRenderSpec
  | DataLayerRenderSpec;

export interface FeatureRenderSpecBase {
  id: string;
  kind: string;
  name?: string;
  properties?: Record<string, unknown>;
  position?: unknown;
  positions?: unknown[];
  renderMode?: GraphicRenderMode;
  label?: LabelRenderSpec;
}

export type GraphicRenderMode = 'entity' | 'primitive' | 'auto';

export interface LabelRenderSpec extends Record<string, unknown> {
  text?: string;
  font?: string;
  scale?: number;
  fillColor?: unknown;
  outlineColor?: unknown;
  outlineWidth?: number;
  pixelOffset?: unknown;
  eyeOffset?: unknown;
  showBackground?: boolean;
  backgroundColor?: unknown;
  position?: unknown;
}

export interface PointFeatureRenderSpec extends FeatureRenderSpecBase {
  kind: 'point';
  position?: unknown;
  point?: Record<string, unknown>;
}

export interface PolylineFeatureRenderSpec extends FeatureRenderSpecBase {
  kind: 'polyline';
  polyline?: Record<string, unknown>;
}

export interface PolygonFeatureRenderSpec extends FeatureRenderSpecBase {
  kind: 'polygon';
  polygon?: Record<string, unknown>;
}

export type ModelRenderMode = GraphicRenderMode;

export interface ModelFeatureRenderSpec extends FeatureRenderSpecBase {
  kind: 'model';
  position?: unknown;
  model?: Record<string, unknown> & {
    renderMode?: ModelRenderMode;
  };
}

export interface LabelFeatureRenderSpec extends FeatureRenderSpecBase {
  kind: 'label';
  position?: unknown;
  label?: LabelRenderSpec;
}

export interface TextFeatureRenderSpec extends FeatureRenderSpecBase {
  kind: 'text';
  position?: unknown;
  label?: LabelRenderSpec;
}

export interface BillboardFeatureRenderSpec extends FeatureRenderSpecBase {
  kind: 'billboard';
  position?: unknown;
  billboard?: Record<string, unknown>;
}

export type FeatureRenderSpec =
  | PointFeatureRenderSpec
  | PolylineFeatureRenderSpec
  | PolygonFeatureRenderSpec
  | ModelFeatureRenderSpec
  | LabelFeatureRenderSpec
  | TextFeatureRenderSpec
  | BillboardFeatureRenderSpec;

export type WeatherEffectKind = 'rain' | 'snow' | 'fog' | 'cloud' | 'lightning' | string;

export interface WeatherEffectSpec {
  id: string;
  kind: WeatherEffectKind;
  enabled?: boolean;
  opacity?: number;
  uniforms?: Record<string, unknown>;
  config?: Record<string, unknown>;
}

export type SceneCenter = LngLat & {
  heading?: number;
  pitch?: number;
  roll?: number;
};

export interface SkyboxSources {
  positiveX: string;
  negativeX: string;
  positiveY: string;
  negativeZ: string;
  positiveZ: string;
  negativeY: string;
}

export type SceneBgType = 'skybox' | 'color' | 'image';

export interface SceneOptions {
  center?: SceneCenter;
  resolutionScale?: number;
  bgColor?: string;
  bgImage?: string | SkyboxSources;
  bgType?: SceneBgType;
}

export interface TerrainOptions {
  provider?: unknown;
  url?: string;
  requestVertexNormals?: boolean;
  requestWaterMask?: boolean;
  options?: Record<string, unknown>;
}

export interface BasemapSpecBase {
  id: string;
  visible?: boolean;
  opacity?: number;
  zIndex?: number;
}

export interface GaodeBasemapSpec extends BasemapSpecBase {
  provider: 'gaode';
  style?: 'vec' | 'img' | 'road';
}

export interface BaiduBasemapSpec extends BasemapSpecBase {
  provider: 'baidu';
  style?: 'normal' | 'dark' | 'custom';
}

export interface TiandituBasemapSpec extends BasemapSpecBase {
  provider: 'tianditu';
  token: string;
  type?: 'vec' | 'img' | 'ter';
}

export interface BingBasemapSpec extends BasemapSpecBase {
  provider: 'bing';
  key: string;
  style?: string;
  culture?: string;
  mapLayer?: string;
}

export type PresetBasemapSpec =
  | GaodeBasemapSpec
  | BaiduBasemapSpec
  | TiandituBasemapSpec
  | BingBasemapSpec;

export type BasemapSpec = ImageryLayerRenderSpec | PresetBasemapSpec;

export interface CgxViewerRuntimeOptions {
  scene?: SceneOptions;
  terrain?: TerrainOptions;
  basemaps?: BasemapSpec[];
  layers?: LayerRenderSpec[];
}

export interface CesiumRuntime {
  readonly kind?: string;
  bootstrap?(options?: CgxViewerRuntimeOptions): Promise<void> | void;
  dispose?(): Promise<void> | void;
  mountLayer?(spec: LayerRenderSpec): Updatable<LayerRenderSpec> | void;
  unmountLayer?(handle: Updatable<LayerRenderSpec> | void): void | Promise<void>;
  mountFeature?(spec: FeatureRenderSpec): Updatable<FeatureRenderSpec> | void;
  unmountFeature?(handle: Updatable<FeatureRenderSpec> | void): void | Promise<void>;
  mountWeatherEffect?(spec: WeatherEffectSpec): Updatable<WeatherEffectSpec> | void;
  unmountWeatherEffect?(handle: Updatable<WeatherEffectSpec> | void): void | Promise<void>;
  pick?(point: ScreenPoint): unknown;
  project?(position: LngLat): CartesianPoint3D;
  unproject?(point: CartesianPoint3D): LngLat;
  unsafeNative?(): unknown;
}

export interface EngineAdapter extends CesiumRuntime {
  initialize?(container: string | HTMLElement, options?: CgxViewerRuntimeOptions): Promise<void> | void;
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
