import { effect, signal, type Signal } from '@cgx/reactive';
import type { EngineAdapter, GraphicLayerRenderSpec, LayerRenderSpec } from '@cgx/core';
import {
  createModelFeature,
  createPointFeature,
  createPolygonFeature,
  createPolylineFeature,
  type Feature,
  type FeatureKind,
  type ModelFeatureOptions,
  type MountableFeature,
  type PointFeatureOptions,
  type PolygonFeatureOptions,
  type PolylineFeatureOptions,
} from '@cgx/feature';
import { createBaseLayer, type Layer } from './types.js';

export interface GraphicLayerClustering {
  enabled: boolean;
  pixelRange?: number;
  minimumClusterSize?: number;
  [key: string]: unknown;
}

export type Graphic<K extends FeatureKind = FeatureKind> = Feature<K> & MountableFeature;

export interface GraphicLayerOptions {
  id?: string;
  visible?: boolean;
  opacity?: number;
  zIndex?: number;
  clustering?: GraphicLayerClustering;
}

export interface GraphicLayer extends Layer {
  readonly type: 'graphic';
  readonly clustering: Signal<GraphicLayerClustering | undefined>;
  remove(): void;
  add<T extends Graphic>(graphic: T): T;
  addPoint(opts: PointFeatureOptions): Graphic<'point'>;
  addPolyline(opts: PolylineFeatureOptions): Graphic<'polyline'>;
  addPolygon(opts: PolygonFeatureOptions): Graphic<'polygon'>;
  addModel(opts: ModelFeatureOptions): Graphic<'model'>;
  removeGraphic(graphicOrId: Graphic | string): boolean;
  clear(): void;
  getById<T extends Graphic = Graphic>(id: string): T | undefined;
  find<T extends Graphic = Graphic>(predicate: (graphic: Graphic) => boolean): T | undefined;
  list(): Graphic[];
  update<T extends Graphic = Graphic>(graphicOrId: T | string, updater: (graphic: T) => void): T | undefined;
}

export function createGraphicLayer(opts: GraphicLayerOptions = {}): GraphicLayer {
  const base = createBaseLayer(opts.id || crypto.randomUUID(), 'graphic');
  if (opts.visible !== undefined) base.visible(opts.visible);
  if (opts.opacity !== undefined) base.opacity(opts.opacity);
  if (opts.zIndex !== undefined) base.zIndex(opts.zIndex);

  const clustering = signal<GraphicLayerClustering | undefined>(opts.clustering);
  const graphics = new Map<string, Graphic>();
  const mountedGraphicIds = new Set<string>();
  let adapterRef: EngineAdapter | null = null;
  let visibilityDisposer: (() => void) | null = null;

  const buildSpec = (): GraphicLayerRenderSpec => {
    const spec: GraphicLayerRenderSpec = {
      id: base.id,
      kind: 'graphic',
      visible: base.visible(),
      opacity: base.opacity(),
      zIndex: base.zIndex(),
      graphics: Array.from(graphics.values()).map((graphic) => graphic.toRenderSpec()),
    };

    const clusteringValue = clustering();
    if (clusteringValue !== undefined) spec.clustering = clusteringValue;

    return spec;
  };

  const mountGraphic = (graphic: Graphic) => {
    if (!adapterRef || mountedGraphicIds.has(graphic.id) || !base.visible()) return;
    graphic._mount(adapterRef);
    mountedGraphicIds.add(graphic.id);
  };

  const unmountGraphic = (graphic: Graphic) => {
    if (!adapterRef || !mountedGraphicIds.has(graphic.id)) return;
    graphic._unmount(adapterRef);
    mountedGraphicIds.delete(graphic.id);
  };

  const syncMountedGraphics = () => {
    if (!adapterRef) return;

    if (!base.visible()) {
      for (const id of [...mountedGraphicIds]) {
        const graphic = graphics.get(id);
        if (graphic) {
          unmountGraphic(graphic);
        } else {
          mountedGraphicIds.delete(id);
        }
      }
      return;
    }

    for (const graphic of graphics.values()) {
      mountGraphic(graphic);
    }
  };

  const addGraphic = <T extends Graphic>(graphic: T): T => {
    const prev = graphics.get(graphic.id);
    if (prev) {
      unmountGraphic(prev);
    }
    graphics.set(graphic.id, graphic);
    mountGraphic(graphic);
    return graphic;
  };

  const getGraphic = <T extends Graphic = Graphic>(graphicOrId: T | string): T | undefined => {
    const id = typeof graphicOrId === 'string' ? graphicOrId : graphicOrId.id;
    return graphics.get(id) as T | undefined;
  };

  return {
    ...base,
    type: 'graphic',
    clustering,
    remove() {
      base.remove();
    },
    add: addGraphic,
    addPoint(opts: PointFeatureOptions) {
      return addGraphic(createPointFeature(opts));
    },
    addPolyline(opts: PolylineFeatureOptions) {
      return addGraphic(createPolylineFeature(opts));
    },
    addPolygon(opts: PolygonFeatureOptions) {
      return addGraphic(createPolygonFeature(opts));
    },
    addModel(opts: ModelFeatureOptions) {
      return addGraphic(createModelFeature(opts));
    },
    removeGraphic(graphicOrId: Graphic | string) {
      const graphic = getGraphic(graphicOrId);
      if (!graphic) return false;
      unmountGraphic(graphic);
      return graphics.delete(graphic.id);
    },
    clear() {
      for (const graphic of graphics.values()) {
        unmountGraphic(graphic);
      }
      graphics.clear();
      mountedGraphicIds.clear();
    },
    getById(id: string) {
      return getGraphic(id);
    },
    find(predicate: (graphic: Graphic) => boolean) {
      return Array.from(graphics.values()).find(predicate);
    },
    list() {
      return Array.from(graphics.values());
    },
    update<T extends Graphic = Graphic>(graphicOrId: T | string, updater: (graphic: T) => void) {
      const graphic = getGraphic<T>(graphicOrId);
      if (!graphic) return undefined;
      updater(graphic);
      return graphic;
    },
    _mount(adapter: EngineAdapter) {
      adapterRef = adapter;
      syncMountedGraphics();
      visibilityDisposer = effect(() => {
        base.visible();
        syncMountedGraphics();
      });
    },
    _unmount(adapter: EngineAdapter) {
      if (visibilityDisposer) {
        visibilityDisposer();
        visibilityDisposer = null;
      }
      for (const graphic of graphics.values()) {
        if (mountedGraphicIds.has(graphic.id)) {
          graphic._unmount(adapter);
        }
      }
      mountedGraphicIds.clear();
      adapterRef = null;
    },
    toRenderSpec(): LayerRenderSpec {
      return buildSpec();
    },
    raw() {
      return Array.from(graphics.values()).map((graphic) => graphic.raw());
    }
  } as GraphicLayer;
}
