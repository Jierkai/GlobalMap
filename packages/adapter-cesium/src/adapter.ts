import * as Cesium from 'cesium';
import type {
  DataLayerRenderSpec,
  EngineAdapter,
  FeatureRenderSpec,
  GraphicLayerRenderSpec,
  LngLat,
  LayerRenderSpec,
  ModelFeatureRenderSpec,
  ScreenPoint,
  Updatable,
} from '@cgx/core';
import { toCartesian3 } from './coord';
import { EntityBase } from './entity';
import { LayerBridge } from './layer';
import { PrimitiveBase } from './primitive';
import type { CesiumViewerHandle, ViewerOptions } from './types';
import { createViewer, _getInternalViewer } from './viewer';

type LayerHandle = Updatable<LayerRenderSpec> & { raw?: unknown };

function isLngLat(value: unknown): value is { lng: number; lat: number; alt?: number } {
  return !!value && typeof value === 'object' && 'lng' in value && 'lat' in value;
}

function toCesiumPosition(value: unknown): unknown {
  if (Array.isArray(value)) {
    const [lng, lat, alt] = value;
    if (typeof lng === 'number' && typeof lat === 'number') {
      return toCartesian3({ lng, lat, alt: typeof alt === 'number' ? alt : 0 });
    }
  }

  if (isLngLat(value)) {
    return toCartesian3(value);
  }

  return value;
}

function toCesiumPositions(values: unknown[] | undefined): unknown[] | undefined {
  return values?.map((value) => toCesiumPosition(value));
}

function applyCommonVisibility(target: Record<string, unknown> | null | undefined, spec: { visible?: boolean; opacity?: number }): void {
  if (!target) return;
  if (spec.visible !== undefined) target.show = spec.visible;
  if (spec.opacity !== undefined) target.opacity = spec.opacity;
}

function buildEntityOptions(spec: FeatureRenderSpec): Cesium.Entity.ConstructorOptions {
  const options: Cesium.Entity.ConstructorOptions = {
    id: spec.id,
  };

  if (spec.name !== undefined) options.name = spec.name;
  if (spec.properties !== undefined) options.properties = spec.properties as any;

  if ('position' in spec) {
    options.position = toCesiumPosition(spec.position) as any;
  }

  if (spec.kind === 'point') {
    options.point = spec.point as any;
  } else if (spec.kind === 'polyline') {
    options.polyline = {
      ...(spec.polyline as Record<string, unknown> | undefined),
      positions: toCesiumPositions(spec.positions ?? (spec.polyline?.positions as unknown[] | undefined)),
    } as any;
  } else if (spec.kind === 'polygon') {
    options.polygon = {
      ...(spec.polygon as Record<string, unknown> | undefined),
      hierarchy: toCesiumPositions(spec.positions ?? (spec.polygon?.hierarchy as unknown[] | undefined)),
    } as any;
  } else if (spec.kind === 'model') {
    const { renderMode: _renderMode, ...model } = (spec.model ?? {}) as Record<string, unknown>;
    options.model = model as any;
  } else if (spec.kind === 'label') {
    options.label = spec.label as any;
  } else if (spec.kind === 'billboard') {
    options.billboard = spec.billboard as any;
  }

  return options;
}

class FeatureEntity extends EntityBase<Cesium.Entity.ConstructorOptions, Cesium.Entity> {
  private spec: FeatureRenderSpec;

  constructor(viewer: CesiumViewerHandle, spec: FeatureRenderSpec) {
    super(viewer);
    this.spec = spec;
  }

  updateSpec(spec: FeatureRenderSpec): void {
    this.spec = spec;
    this.update(buildEntityOptions(spec));
  }

  protected _createEntityOptions(): Cesium.Entity.ConstructorOptions {
    return buildEntityOptions(this.spec);
  }
}

class ModelPrimitive extends PrimitiveBase<Cesium.Primitive> {
  private spec: ModelFeatureRenderSpec;

  constructor(viewer: CesiumViewerHandle, spec: ModelFeatureRenderSpec) {
    super(viewer);
    this.spec = spec;
  }

  updateSpec(spec: ModelFeatureRenderSpec): void {
    this.spec = spec;
    const primitive = this.primitive as unknown as Record<string, unknown> | null;
    if (!primitive) return;
    primitive.position = toCesiumPosition(spec.position);
    primitive.model = spec.model;
    primitive.show = spec.model?.show ?? true;
  }

  protected _createPrimitive(): Cesium.Primitive {
    return new Cesium.Primitive({
      id: this.spec.id,
      position: toCesiumPosition(this.spec.position),
      model: this.spec.model,
    } as any);
  }
}

function resolveProvider(provider: unknown): unknown {
  if (provider && typeof provider === 'object' && 'raw' in provider && typeof provider.raw === 'function') {
    return provider.raw();
  }

  return provider;
}

function payloadRecord(payload: unknown): Record<string, unknown> {
  return payload && typeof payload === 'object' ? payload as Record<string, unknown> : {};
}

export interface CesiumEngineAdapterOptions extends ViewerOptions {
  viewer?: CesiumViewerHandle;
}

/**
 * Creates an EngineAdapter backed by Cesium's Viewer handle.
 */
export function createCesiumAdapter(options: CesiumEngineAdapterOptions = {}): EngineAdapter {
  let handle: CesiumViewerHandle | undefined = options.viewer;

  const ensureHandle = (): CesiumViewerHandle => {
    if (!handle) {
      throw new Error('Cesium adapter has not been initialized');
    }
    return handle;
  };

  const mountFeatureSpec = (spec: FeatureRenderSpec): Updatable<FeatureRenderSpec> => {
    const viewerHandle = ensureHandle();
    const mode = spec.kind === 'model' ? spec.model?.renderMode ?? 'auto' : 'entity';

    if (spec.kind === 'model' && mode === 'primitive') {
      const primitive = new ModelPrimitive(viewerHandle, spec);
      void primitive.init();
      return {
        update(next: FeatureRenderSpec) {
          if (next.kind === 'model') primitive.updateSpec(next);
        },
        dispose() {
          primitive.dispose();
        },
      };
    }

    const entity = new FeatureEntity(viewerHandle, spec);
    void entity.init();
    return {
      update(next: FeatureRenderSpec) {
        entity.updateSpec(next);
      },
      dispose() {
        entity.dispose();
      },
    };
  };

  const mountDataLayer = (spec: DataLayerRenderSpec): LayerHandle => {
    let disposed = false;
    let raw: unknown;
    let current = spec;
    let loadVersion = 0;

    const attach = async (next: DataLayerRenderSpec) => {
      const viewerHandle = ensureHandle();
      const payload = payloadRecord(next.payload);
      const version = ++loadVersion;

      if (next.sourceType === 'geojson') {
        const load = (Cesium as any).GeoJsonDataSource?.load;
        if (typeof load !== 'function') return;
        const dataSource = await load(next.payload, next.options);
        if (disposed || current !== next) return;
        const mounted = await LayerBridge.addDataSource(viewerHandle, dataSource);
        if (disposed || current !== next || version !== loadVersion) {
          if (mounted) LayerBridge.removeDataSource(viewerHandle, mounted);
          return;
        }
        raw = mounted;
        applyCommonVisibility(raw as Record<string, unknown> | undefined, next);
        return;
      }

      if (next.sourceType === 'tileset' || next.sourceType === 'point-cloud') {
        const url = payload.url;
        if (typeof url !== 'string') return;
        const mounted = await LayerBridge.add3DTileset(viewerHandle, url, next.options);
        if (disposed || current !== next || version !== loadVersion) {
          if (mounted) LayerBridge.remove3DTileset(viewerHandle, mounted);
          return;
        }
        raw = mounted;
        applyCommonVisibility(raw as Record<string, unknown> | undefined, next);
      }
    };

    void attach(spec);

    return {
      get raw() {
        return raw;
      },
      update(next: LayerRenderSpec) {
        current = next as DataLayerRenderSpec;
        applyCommonVisibility(raw as Record<string, unknown> | undefined, current);
      },
      dispose() {
        disposed = true;
        loadVersion += 1;
        const viewerHandle = handle;
        if (!viewerHandle || !raw) return;
        if (current.sourceType === 'geojson') {
          LayerBridge.removeDataSource(viewerHandle, raw as Cesium.DataSource);
        } else if (current.sourceType === 'tileset' || current.sourceType === 'point-cloud') {
          LayerBridge.remove3DTileset(viewerHandle, raw as Cesium.Cesium3DTileset);
        }
        raw = undefined;
      },
    };
  };

  return {
    kind: 'cesium',
    initialize(container: string | HTMLElement) {
      if (!handle) handle = createViewer(container, options);
    },
    dispose() {
      handle?.destroy();
      handle = undefined;
    },
    mountLayer(spec: LayerRenderSpec): Updatable<LayerRenderSpec> | void {
      const viewerHandle = ensureHandle();

      if (spec.kind === 'imagery') {
        const layer = LayerBridge.addImageryLayer(viewerHandle, resolveProvider(spec.provider) as Cesium.ImageryProvider);
        applyCommonVisibility(layer as unknown as Record<string, unknown> | undefined, spec);
        return {
          update(next: LayerRenderSpec) {
            applyCommonVisibility(layer as unknown as Record<string, unknown> | undefined, next);
          },
          dispose() {
            if (layer) LayerBridge.removeImageryLayer(viewerHandle, layer);
          },
        };
      }

      if (spec.kind === 'terrain') {
        LayerBridge.setTerrainProvider(viewerHandle, resolveProvider(spec.provider) as Cesium.TerrainProvider);
        return {
          update() {},
          dispose() {
            LayerBridge.removeTerrainProvider(viewerHandle);
          },
        };
      }

      if (spec.kind === 'data') {
        return mountDataLayer(spec);
      }

      if (spec.kind === 'graphic') {
        const handles = new Map<string, Updatable<FeatureRenderSpec>>();
        for (const graphic of spec.graphics ?? []) {
          handles.set(graphic.id, mountFeatureSpec(graphic));
        }
        return {
          update(next: LayerRenderSpec) {
            if (next.kind !== 'graphic') return;
            const graphics = (next as GraphicLayerRenderSpec).graphics ?? [];
            const nextIds = new Set(graphics.map((graphic: FeatureRenderSpec) => graphic.id));
            for (const [id, mounted] of handles) {
              if (!nextIds.has(id)) {
                mounted.dispose();
                handles.delete(id);
              }
            }
            for (const graphic of graphics) {
              const existing = handles.get(graphic.id);
              if (existing) {
                existing.update?.(graphic);
              } else {
                handles.set(graphic.id, mountFeatureSpec(graphic));
              }
            }
          },
          dispose() {
            for (const mounted of handles.values()) mounted.dispose();
            handles.clear();
          },
        };
      }
    },
    unmountLayer(handleToUnmount: Updatable<LayerRenderSpec> | void) {
      handleToUnmount?.dispose();
    },
    mountFeature(spec: FeatureRenderSpec): Updatable<FeatureRenderSpec> | void {
      return mountFeatureSpec(spec);
    },
    unmountFeature(handleToUnmount: Updatable<FeatureRenderSpec> | void) {
      handleToUnmount?.dispose();
    },
    pick(point: ScreenPoint) {
      return _getInternalViewer(ensureHandle())?.scene.pick(point as unknown as Cesium.Cartesian2);
    },
    project(position: LngLat) {
      return toCartesian3(position) as unknown as { x: number; y: number; z?: number };
    },
    unsafeNative() {
      return _getInternalViewer(ensureHandle());
    },
  };
}
