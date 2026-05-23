import type { FeatureHandle, FeatureRenderSpec, FlyToOptions } from '@cgx/core';
import type { CesiumViewerHandle } from '../types';
import { _getInternalViewer } from '../viewer';
import { FeatureEntity } from '../adapter';

export function createEntityFeatureHandle(
  viewerHandle: CesiumViewerHandle,
  spec: FeatureRenderSpec,
): FeatureHandle {
  const entity = new FeatureEntity(viewerHandle, spec);
  void entity.init();

  return {
    id: spec.id,
    update(patch) {
      entity.updateSpec({ ...spec, ...patch } as FeatureRenderSpec);
    },
    async flyTo(opts?: FlyToOptions) {
      const viewer = _getInternalViewer(viewerHandle);
      if (!viewer || !entity.entity) return;
      await viewer.flyTo(entity.entity, opts as any);
    },
    unsafeNative: () => entity.entity ?? null,
    dispose() {
      entity.dispose();
    },
  };
}
