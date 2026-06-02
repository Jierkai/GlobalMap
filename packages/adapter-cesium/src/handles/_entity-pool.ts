import * as Cesium from 'cesium';
import type { FeatureRenderSpec } from '@cgx/core';
import { toCartesian3Into } from '../coord';
import {
  buildEntityOptions,
  positionsFromSpec,
  resolveLabelPosition,
  toCesiumLabel,
} from '../adapter';
import { bindPickFeature, unbindPickFeature } from '../picking';
import { EntityPool, type PoolableKind } from '../pool/EntityPool';
import type { CesiumViewerHandle } from '../types';
import { _getInternalViewer } from '../viewer';

let pools = new WeakMap<CesiumViewerHandle, EntityPool<Cesium.Entity>>();
const registry = new Set<{ viewerHandle: CesiumViewerHandle; pool: EntityPool<Cesium.Entity> }>();
const pooledKinds: readonly PoolableKind[] = ['point', 'polyline', 'billboard'];
const VIEWER_ENTITY_POOL_CAPACITY = 10_000;

type MutableEntity = Cesium.Entity & Record<string, unknown>;
type RawEntity = Record<string, unknown>;
type PoolableFeatureRenderSpec = Extract<FeatureRenderSpec, { kind: PoolableKind }>;

export function isPoolableEntitySpec(spec: FeatureRenderSpec): spec is PoolableFeatureRenderSpec {
  return (pooledKinds as readonly string[]).includes(spec.kind);
}

export function getEntityPool(viewerHandle: CesiumViewerHandle): EntityPool<Cesium.Entity> {
  const existing = pools.get(viewerHandle);
  if (existing) return existing;

  const pool = new EntityPool<Cesium.Entity>({
    create: createPooledEntity,
    reset: resetPooledEntity,
    destroy: destroyPooledEntity,
    capacity: VIEWER_ENTITY_POOL_CAPACITY,
  });
  pools.set(viewerHandle, pool);
  registry.add({ viewerHandle, pool });
  return pool;
}

export function resetEntityPools(): void {
  for (const { pool } of registry) pool.flush();
  pools = new WeakMap<CesiumViewerHandle, EntityPool<Cesium.Entity>>();
  registry.clear();
}

export function flushEntityPools(viewerHandle: CesiumViewerHandle): void {
  const pool = pools.get(viewerHandle);
  if (!pool) return;

  pool.flush();
  pools.delete(viewerHandle);
  for (const entry of registry) {
    if (entry.viewerHandle === viewerHandle) {
      registry.delete(entry);
      break;
    }
  }
}

export function acquirePooledEntity(viewerHandle: CesiumViewerHandle, spec: FeatureRenderSpec): Cesium.Entity | null {
  if (!isPoolableEntitySpec(spec)) return null;
  const viewer = _getInternalViewer(viewerHandle);
  if (!viewer) return null;

  const entity = getEntityPool(viewerHandle).acquire(spec.kind, spec);
  setEntityVisible(entity, true);
  bindPickFeature(entity, spec);
  viewer.entities.add(entity);
  return entity;
}

export function releasePooledEntity(
  viewerHandle: CesiumViewerHandle,
  kind: PoolableKind,
  entity: Cesium.Entity,
): void {
  const viewer = _getInternalViewer(viewerHandle);
  unbindPickFeature(entity);
  setEntityVisible(entity, false);
  viewer?.entities.remove(entity);
  getEntityPool(viewerHandle).release(kind, entity);
}

export function updatePooledEntity(entity: Cesium.Entity, spec: FeatureRenderSpec): void {
  resetPooledEntity(entity, spec);
  setEntityVisible(entity, true);
  bindPickFeature(entity, spec);
}

function createPooledEntity(spec: FeatureRenderSpec): Cesium.Entity {
  return new Cesium.Entity(buildEntityOptions(spec));
}

function resetPooledEntity(entity: Cesium.Entity, spec: FeatureRenderSpec): void {
  const mutable = entity as MutableEntity;
  applyPoolableEntitySpec(mutable as RawEntity, spec);
}

function clearPooledState(entity: RawEntity): void {
  const raw = entity as RawEntity;
  raw.name = undefined;
  raw.position = undefined;
  raw.point = undefined;
  raw.polyline = undefined;
  raw.polygon = undefined;
  raw.model = undefined;
  raw.billboard = undefined;
  raw.label = undefined;
  raw.properties = undefined;
}

function applyPoolableEntitySpec(entity: RawEntity, spec: FeatureRenderSpec): void {
  const previousPosition = entity.position;
  const previousPolyline = entity.polyline && typeof entity.polyline === 'object'
    ? entity.polyline as Record<string, unknown>
    : undefined;
  const previousPositions = Array.isArray(previousPolyline?.positions)
    ? previousPolyline.positions
    : undefined;

  clearPooledState(entity);
  setEntityId(entity, spec.id);
  if (spec.name !== undefined) entity.name = spec.name;
  if (spec.properties !== undefined) entity.properties = spec.properties;

  const labelPosition = resolveLabelPosition(spec);
  if ('position' in spec && spec.position !== undefined) {
    entity.position = toCesiumPositionInto(previousPosition, spec.position);
  } else if (spec.label && labelPosition !== undefined) {
    entity.position = toCesiumPositionInto(previousPosition, labelPosition);
  }

  if (spec.kind === 'point') {
    entity.point = spec.point;
  } else if (spec.kind === 'polyline') {
    entity.polyline = {
      ...(spec.polyline as Record<string, unknown> | undefined),
      positions: toCesiumPositionsInto(previousPositions, positionsFromSpec(spec)),
    };
  } else if (spec.kind === 'billboard') {
    entity.billboard = spec.billboard;
  }

  if (spec.kind !== 'label' && spec.kind !== 'text' && spec.label) {
    entity.label = toCesiumLabel(spec.label);
  }
}

function toCoordinateTuple(value: unknown): [number, number, number] | undefined {
  if (Array.isArray(value) && typeof value[0] === 'number' && typeof value[1] === 'number') {
    return [value[0], value[1], typeof value[2] === 'number' ? value[2] : 0];
  }
  if (
    value
    && typeof value === 'object'
    && 'lng' in value
    && 'lat' in value
    && typeof value.lng === 'number'
    && typeof value.lat === 'number'
  ) {
    return [
      value.lng,
      value.lat,
      'alt' in value && typeof value.alt === 'number' ? value.alt : 0,
    ];
  }
  return undefined;
}

function toCesiumPositionInto(previous: unknown, value: unknown): unknown {
  const tuple = toCoordinateTuple(value);
  if (!tuple) return value;

  const out = previous instanceof Cesium.Cartesian3 ? previous : new Cesium.Cartesian3();
  return toCartesian3Into(out, tuple[0], tuple[1], tuple[2]);
}

function toCesiumPositionsInto(previous: unknown[] | undefined, values: unknown[]): unknown[] | undefined {
  if (values.length === 0) return undefined;
  const out = previous ?? [];
  out.length = values.length;
  for (let i = 0; i < values.length; i++) {
    out[i] = toCesiumPositionInto(out[i], values[i]);
  }
  return out;
}

function applyEntityOptions(entity: RawEntity, options: Cesium.Entity.ConstructorOptions): void {
  if (options.id !== undefined) {
    setEntityId(entity, options.id);
  }
  if (options.name !== undefined) entity.name = options.name;
  if (options.position !== undefined) entity.position = options.position;
  if (options.point !== undefined) entity.point = options.point;
  if (options.polyline !== undefined) entity.polyline = options.polyline;
  if (options.polygon !== undefined) entity.polygon = options.polygon;
  if (options.model !== undefined) entity.model = options.model;
  if (options.billboard !== undefined) entity.billboard = options.billboard;
  if (options.label !== undefined) entity.label = options.label;
  if (options.properties !== undefined) entity.properties = options.properties;
}

function setEntityVisible(entity: Cesium.Entity, visible: boolean): void {
  (entity as MutableEntity).show = visible;
}

function setEntityId(entity: RawEntity, id: string): void {
  entity._id = id;
  const ownDescriptor = Object.getOwnPropertyDescriptor(entity, 'id');
  if (ownDescriptor?.writable || ownDescriptor?.set) {
    entity.id = id;
  }
}

function destroyPooledEntity(entity: Cesium.Entity): void {
  unbindPickFeature(entity);
  setEntityVisible(entity, false);
}
