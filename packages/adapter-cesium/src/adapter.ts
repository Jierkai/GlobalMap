import * as Cesium from 'cesium';
import type {
  DataLayerRenderSpec,
  EngineAdapter,
  FeatureRenderSpec,
  GraphicLayerRenderSpec,
  GraphicRenderMode,
  LabelRenderSpec,
  LngLat,
  LayerRenderSpec,
  ModelFeatureRenderSpec,
  ScreenPoint,
  Updatable,
} from '@cgx/core';
import { toCartesian3 } from './coord';
import { EntityBase } from './entity';
import { LayerBridge } from './layer';
import { PickingBridge } from './picking';
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

function isNumberTuple(value: unknown): value is [number, number, number?] {
  return Array.isArray(value) && typeof value[0] === 'number' && typeof value[1] === 'number';
}

function toCoordinateTuple(value: unknown): [number, number, number] | undefined {
  if (isNumberTuple(value)) {
    return [value[0], value[1], typeof value[2] === 'number' ? value[2] : 0];
  }

  if (isLngLat(value)) {
    return [value.lng, value.lat, value.alt ?? 0];
  }

  return undefined;
}

function averagePositions(values: unknown[]): unknown | undefined {
  const coords = values.map(toCoordinateTuple).filter((coord): coord is [number, number, number] => !!coord);
  if (coords.length === 0) return values[0];

  const sum = coords.reduce<[number, number, number]>((acc, coord) => {
    acc[0] += coord[0];
    acc[1] += coord[1];
    acc[2] += coord[2];
    return acc;
  }, [0, 0, 0]);

  return [sum[0] / coords.length, sum[1] / coords.length, sum[2] / coords.length];
}

function midpointPosition(values: unknown[]): unknown | undefined {
  if (values.length === 0) return undefined;
  if (values.length === 1) return values[0];

  const left = values[Math.floor((values.length - 1) / 2)];
  const right = values[Math.ceil((values.length - 1) / 2)];
  if (left === right) return left;

  const leftCoord = toCoordinateTuple(left);
  const rightCoord = toCoordinateTuple(right);
  if (!leftCoord || !rightCoord) return left;

  return [
    (leftCoord[0] + rightCoord[0]) / 2,
    (leftCoord[1] + rightCoord[1]) / 2,
    (leftCoord[2] + rightCoord[2]) / 2,
  ];
}

function positionsFromSpec(spec: FeatureRenderSpec): unknown[] {
  if (spec.kind === 'polyline') {
    return spec.positions ?? (spec.polyline?.positions as unknown[] | undefined) ?? [];
  }
  if (spec.kind === 'polygon') {
    return spec.positions ?? (spec.polygon?.hierarchy as unknown[] | undefined) ?? [];
  }
  return [];
}

function resolveLabelPosition(spec: FeatureRenderSpec): unknown | undefined {
  if (spec.label?.position !== undefined) return spec.label.position;
  if (spec.kind === 'text' || spec.kind === 'label') return spec.position;
  if ('position' in spec && spec.position !== undefined) return spec.position;
  if (spec.kind === 'polyline') return midpointPosition(positionsFromSpec(spec));
  if (spec.kind === 'polygon') return averagePositions(positionsFromSpec(spec));
  return undefined;
}

function toCesiumLabel(label: LabelRenderSpec | undefined): Record<string, unknown> | undefined {
  if (!label) return undefined;
  const { position: _position, ...rest } = label;
  return rest;
}

function resolveFeatureMode(spec: FeatureRenderSpec, layerMode: GraphicRenderMode = 'entity'): GraphicRenderMode {
  const mode = spec.kind === 'model'
    ? spec.model?.renderMode ?? spec.renderMode ?? layerMode
    : spec.renderMode ?? layerMode;

  return mode === 'auto' ? 'entity' : mode;
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

  const labelPosition = resolveLabelPosition(spec);
  if ('position' in spec && spec.position !== undefined) {
    options.position = toCesiumPosition(spec.position) as any;
  } else if (spec.label && labelPosition !== undefined) {
    options.position = toCesiumPosition(labelPosition) as any;
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
  } else if (spec.kind === 'label' || spec.kind === 'text') {
    options.label = toCesiumLabel(spec.label) as any;
  } else if (spec.kind === 'billboard') {
    options.billboard = spec.billboard as any;
  }

  if (spec.kind !== 'label' && spec.kind !== 'text' && spec.label) {
    options.label = toCesiumLabel(spec.label) as any;
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
    if (this.entity) PickingBridge.setFeature(this.entity, spec);
  }

  protected _createEntityOptions(): Cesium.Entity.ConstructorOptions {
    return buildEntityOptions(this.spec);
  }

  protected _onAttach(_viewer: Cesium.Viewer, entity: Cesium.Entity): void {
    PickingBridge.setFeature(entity, this.spec);
  }

  protected _onDetach(_viewer: Cesium.Viewer, entity: Cesium.Entity): void {
    PickingBridge.removeFeature(entity);
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
    PickingBridge.setFeature(primitive, spec);
  }

  protected _createPrimitive(): Cesium.Primitive {
    return new Cesium.Primitive({
      id: this.spec.id,
      position: toCesiumPosition(this.spec.position),
      model: this.spec.model,
    } as any);
  }

  protected _onAttach(_viewer: Cesium.Viewer, primitive: Cesium.Primitive): void {
    PickingBridge.setFeature(primitive, this.spec);
  }

  protected _onDetach(_viewer: Cesium.Viewer, primitive: Cesium.Primitive): void {
    PickingBridge.removeFeature(primitive);
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

type PrimitiveBatchKind = 'point' | 'billboard' | 'label' | 'polyline' | 'polygon';

interface PrimitiveBatchCollection {
  kind: PrimitiveBatchKind;
  primitive: any;
  itemIds: Array<string | number | symbol | object>;
}

function collectionCtorName(kind: PrimitiveBatchKind): string {
  if (kind === 'point') return 'PointPrimitiveCollection';
  if (kind === 'billboard') return 'BillboardCollection';
  if (kind === 'label') return 'LabelCollection';
  if (kind === 'polyline') return 'PolylineCollection';
  return 'Primitive';
}

function createPrimitiveCollection(kind: PrimitiveBatchKind, id: string): any {
  const ctorName = collectionCtorName(kind);
  const Ctor = Object.prototype.hasOwnProperty.call(Cesium, ctorName)
    ? (Cesium as any)[ctorName]
    : undefined;
  if (typeof Ctor === 'function' && kind !== 'polygon') {
    return new Ctor({ id });
  }

  return new Cesium.Primitive({
    id,
    kind: `${kind}-batch`,
    items: [],
  } as any);
}

class PrimitiveFeatureBatch {
  private readonly collections = new Map<PrimitiveBatchKind, PrimitiveBatchCollection>();
  private disposed = false;

  constructor(private readonly viewer: CesiumViewerHandle, private readonly id: string) {}

  updateFeatures(features: FeatureRenderSpec[]): void {
    if (this.disposed) return;
    for (const collection of this.collections.values()) {
      this.clearCollection(collection);
    }

    for (const feature of features) {
      if (feature.kind === 'point') {
        this.addPoint(feature);
      } else if (feature.kind === 'billboard') {
        this.addBillboard(feature);
      } else if (feature.kind === 'polyline') {
        this.addPolyline(feature);
      } else if (feature.kind === 'polygon') {
        this.addPolygon(feature);
      } else if (feature.kind === 'text' || feature.kind === 'label') {
        this.addLabel(feature, feature.label);
      }

      if (feature.kind !== 'text' && feature.kind !== 'label' && feature.label) {
        this.addLabel(feature, feature.label);
      }
    }
  }

  raw(): unknown[] {
    return Array.from(this.collections.values()).map((collection) => collection.primitive);
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    const viewer = _getInternalViewer(this.viewer);
    for (const collection of this.collections.values()) {
      this.clearCollection(collection);
      if (viewer?.scene.primitives.contains(collection.primitive)) {
        viewer.scene.primitives.remove(collection.primitive);
      }
      if (typeof collection.primitive.destroy === 'function' && !collection.primitive.isDestroyed?.()) {
        collection.primitive.destroy();
      }
    }
    this.collections.clear();
  }

  private ensureCollection(kind: PrimitiveBatchKind): PrimitiveBatchCollection {
    const existing = this.collections.get(kind);
    if (existing) return existing;

    const primitive = createPrimitiveCollection(kind, `${this.id}:${kind}`);
    const collection: PrimitiveBatchCollection = { kind, primitive, itemIds: [] };
    this.collections.set(kind, collection);

    const viewer = _getInternalViewer(this.viewer);
    if (viewer && !viewer.scene.primitives.contains(primitive)) {
      viewer.scene.primitives.add(primitive);
    }

    return collection;
  }

  private clearCollection(collection: PrimitiveBatchCollection): void {
    for (const itemId of collection.itemIds) {
      PickingBridge.removeFeature(itemId);
    }
    collection.itemIds = [];

    if (typeof collection.primitive.removeAll === 'function') {
      collection.primitive.removeAll();
      return;
    }

    if (Array.isArray(collection.primitive.items)) {
      collection.primitive.items.length = 0;
    } else {
      collection.primitive.items = [];
    }
  }

  private addItem(kind: PrimitiveBatchKind, spec: FeatureRenderSpec, options: Record<string, unknown>): void {
    const collection = this.ensureCollection(kind);
    const item = typeof collection.primitive.add === 'function'
      ? collection.primitive.add(options)
      : this.addFallbackItem(collection.primitive, options);

    PickingBridge.setFeature(spec.id, spec);
    collection.itemIds.push(spec.id);

    if (item && (typeof item === 'object' || typeof item === 'function')) {
      PickingBridge.setFeature(item, spec);
      collection.itemIds.push(item);
    }
  }

  private addFallbackItem(primitive: any, options: Record<string, unknown>): Record<string, unknown> {
    if (!Array.isArray(primitive.items)) primitive.items = [];
    primitive.items.push(options);
    return options;
  }

  private addPoint(spec: FeatureRenderSpec): void {
    if (spec.kind !== 'point') return;
    this.addItem('point', spec, {
      ...(spec.point ?? {}),
      id: spec.id,
      position: toCesiumPosition(spec.position),
    });
  }

  private addBillboard(spec: FeatureRenderSpec): void {
    if (spec.kind !== 'billboard') return;
    this.addItem('billboard', spec, {
      ...(spec.billboard ?? {}),
      id: spec.id,
      position: toCesiumPosition(spec.position),
    });
  }

  private addPolyline(spec: FeatureRenderSpec): void {
    if (spec.kind !== 'polyline') return;
    this.addItem('polyline', spec, {
      ...(spec.polyline ?? {}),
      id: spec.id,
      positions: toCesiumPositions(positionsFromSpec(spec)),
    });
  }

  private addPolygon(spec: FeatureRenderSpec): void {
    if (spec.kind !== 'polygon') return;
    this.addItem('polygon', spec, {
      ...(spec.polygon ?? {}),
      id: spec.id,
      hierarchy: toCesiumPositions(positionsFromSpec(spec)),
    });
  }

  private addLabel(spec: FeatureRenderSpec, label: LabelRenderSpec | undefined): void {
    const position = resolveLabelPosition(spec);
    if (!label || position === undefined) return;
    this.addItem('label', spec, {
      ...(toCesiumLabel(label) ?? {}),
      id: spec.id,
      position: toCesiumPosition(position),
    });
  }
}

class GraphicLayerMount implements Updatable<LayerRenderSpec> {
  private readonly entityHandles = new Map<string, Updatable<FeatureRenderSpec>>();
  private readonly primitiveBatch: PrimitiveFeatureBatch;
  private disposed = false;
  private current: GraphicLayerRenderSpec;

  constructor(
    private readonly viewer: CesiumViewerHandle,
    spec: GraphicLayerRenderSpec,
    private readonly mountFeature: (spec: FeatureRenderSpec) => Updatable<FeatureRenderSpec>,
  ) {
    this.current = spec;
    this.primitiveBatch = new PrimitiveFeatureBatch(viewer, spec.id);
    this.sync(spec);
  }

  update(next: LayerRenderSpec): void {
    if (next.kind !== 'graphic' || this.disposed) return;
    this.current = next as GraphicLayerRenderSpec;
    this.sync(this.current);
  }

  raw(): unknown {
    return {
      entities: Array.from(this.entityHandles.values()),
      primitives: this.primitiveBatch.raw(),
    };
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    for (const handle of this.entityHandles.values()) {
      handle.dispose();
    }
    this.entityHandles.clear();
    this.primitiveBatch.dispose();
  }

  private sync(spec: GraphicLayerRenderSpec): void {
    const layerMode = spec.renderMode ?? 'entity';
    const graphics = spec.visible === false ? [] : spec.graphics ?? [];
    const primitiveGraphics: FeatureRenderSpec[] = [];
    const entityGraphics: FeatureRenderSpec[] = [];

    for (const graphic of graphics) {
      const mode = resolveFeatureMode(graphic, layerMode);
      if (graphic.kind === 'model' || mode === 'entity') {
        entityGraphics.push(graphic);
      } else {
        primitiveGraphics.push(graphic);
      }
    }

    this.syncEntityGraphics(entityGraphics);
    this.primitiveBatch.updateFeatures(primitiveGraphics);
  }

  private syncEntityGraphics(graphics: FeatureRenderSpec[]): void {
    const nextIds = new Set(graphics.map((graphic) => graphic.id));
    for (const [id, handle] of this.entityHandles) {
      if (!nextIds.has(id)) {
        handle.dispose();
        this.entityHandles.delete(id);
      }
    }

    for (const graphic of graphics) {
      const existing = this.entityHandles.get(graphic.id);
      if (existing) {
        existing.update?.(graphic);
      } else {
        this.entityHandles.set(graphic.id, this.mountFeature(graphic));
      }
    }
  }
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
    const mode = resolveFeatureMode(spec);

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

    if (spec.kind !== 'model' && mode === 'primitive') {
      const batch = new PrimitiveFeatureBatch(viewerHandle, spec.id);
      batch.updateFeatures([spec]);
      return {
        update(next: FeatureRenderSpec) {
          batch.updateFeatures([next]);
        },
        dispose() {
          batch.dispose();
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
        return new GraphicLayerMount(viewerHandle, spec, mountFeatureSpec);
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
      return PickingBridge.pick(ensureHandle(), point as unknown as Cesium.Cartesian2);
    },
    project(position: LngLat) {
      return toCartesian3(position) as unknown as { x: number; y: number; z?: number };
    },
    unsafeNative() {
      return _getInternalViewer(ensureHandle());
    },
  };
}
