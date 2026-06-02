import type { FeatureHandle, FeatureRenderSpec, FlyToOptions } from '@cgx/core';
import type { CesiumViewerHandle } from '../types';
import { _getInternalViewer } from '../viewer';
import { FeatureEntity } from '../adapter';
import { createBatchKey, getDefaultBatcher } from '../scheduler';
import {
  acquirePooledEntity,
  isPoolableEntitySpec,
  releasePooledEntity,
  updatePooledEntity,
} from './_entity-pool';
import type { PoolableKind } from '../pool/EntityPool';

type PoolableFeatureRenderSpec = FeatureRenderSpec & { kind: PoolableKind };
type NonPoolableFeatureRenderSpec = Exclude<FeatureRenderSpec, PoolableFeatureRenderSpec>;

export function createEntityFeatureHandle(
  viewerHandle: CesiumViewerHandle,
  spec: FeatureRenderSpec,
): FeatureHandle {
  if (isPoolableEntitySpec(spec)) {
    return createPooledEntityFeatureHandle(viewerHandle, spec);
  }

  const entity = new FeatureEntity(viewerHandle, spec);
  void entity.init();
  const batcher = getDefaultBatcher();
  const batchId = createBatchKey('feature', spec.id);
  let currentSpec: NonPoolableFeatureRenderSpec = spec;
  let disposed = false;

  const apply = (patch: Partial<FeatureRenderSpec>): void => {
    if (disposed) return;
    currentSpec = { ...currentSpec, ...patch } as NonPoolableFeatureRenderSpec;
    entity.updateSpec(currentSpec);
  };

  return {
    id: spec.id,
    update(patch) {
      batcher.enqueue(batchId, patch, apply);
    },
    async flyTo(opts?: FlyToOptions) {
      const viewer = _getInternalViewer(viewerHandle);
      if (!viewer || !entity.entity) return;
      await viewer.flyTo(entity.entity, opts as any);
    },
    unsafeNative: () => entity.entity ?? null,
    dispose() {
      if (disposed) return;
      disposed = true;
      entity.dispose();
    },
  };
}

function createPooledEntityFeatureHandle(
  viewerHandle: CesiumViewerHandle,
  initialSpec: PoolableFeatureRenderSpec,
): FeatureHandle {
  let currentSpec: PoolableFeatureRenderSpec = initialSpec;
  let entity = acquirePooledEntity(viewerHandle, initialSpec);
  let disposed = false;
  const batcher = getDefaultBatcher();
  const batchId = createBatchKey('feature', initialSpec.id);

  const apply = (patch: Partial<FeatureRenderSpec>): void => {
    if (disposed || !entity) return;
    currentSpec = { ...currentSpec, ...patch, id: initialSpec.id, kind: initialSpec.kind } as PoolableFeatureRenderSpec;
    updatePooledEntity(entity, currentSpec);
  };

  return {
    id: initialSpec.id,
    update(patch) {
      batcher.enqueue(batchId, patch, apply);
    },
    async flyTo(opts?: FlyToOptions) {
      const viewer = _getInternalViewer(viewerHandle);
      if (!viewer || !entity) return;
      await viewer.flyTo(entity, opts as any);
    },
    unsafeNative: () => entity,
    dispose() {
      if (disposed || !entity) return;
      disposed = true;
      releasePooledEntity(viewerHandle, initialSpec.kind, entity);
      entity = null;
    },
  };
}
