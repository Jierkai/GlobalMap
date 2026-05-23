import type { ImageryLayerRenderSpec, LayerRenderSpec } from './spec/layer.js';
import type { LngLat } from './spec/primitive.js';

export type SceneCenter = LngLat & {
  heading?: number;
  pitch?: number;
  roll?: number;
};

export interface SkyboxSources {
  positiveX: string;
  negativeX: string;
  positiveY: string;
  negativeY: string;
  positiveZ: string;
  negativeZ: string;
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

export interface ViewerOptions {
  scene?: SceneOptions;
  terrain?: TerrainOptions;
  basemaps?: BasemapSpec[];
  layers?: LayerRenderSpec[];
}
