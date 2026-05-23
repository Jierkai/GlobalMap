import type { FeatureRenderSpec } from './feature.js';

export type GraphicRenderMode = 'entity' | 'primitive' | 'auto';

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
