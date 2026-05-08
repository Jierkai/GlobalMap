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
  model?: (Record<string, unknown> & {
    renderMode?: ModelRenderMode;
  });
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

export interface EngineAdapter {
  readonly kind?: string;
  initialize?(container: string | HTMLElement): Promise<void> | void;
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
