import type { GraphicRenderMode, LayerRenderSpec, GraphicLayerRenderSpec } from './layer.js';

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
  model?: Record<string, unknown> & { renderMode?: ModelRenderMode };
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

// Strict alias: tightens GraphicLayerRenderSpec.graphics from unknown[] to FeatureRenderSpec[]
export type GraphicLayerRenderSpecStrict = Omit<GraphicLayerRenderSpec, 'graphics'> & {
  graphics?: FeatureRenderSpec[];
};

export type LayerRenderSpecStrict =
  | Exclude<LayerRenderSpec, GraphicLayerRenderSpec>
  | GraphicLayerRenderSpecStrict;
