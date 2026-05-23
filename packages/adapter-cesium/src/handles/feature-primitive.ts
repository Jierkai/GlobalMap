import type { FeatureHandle, FeatureRenderSpec, FlyToOptions, ModelFeatureRenderSpec } from '@cgx/core';
import type { CesiumViewerHandle } from '../types';
import { _getInternalViewer } from '../viewer';
import { ModelPrimitive, PrimitiveFeatureBatch } from '../adapter';

export function createPrimitiveFeatureHandle(
  viewerHandle: CesiumViewerHandle,
  spec: ModelFeatureRenderSpec,
): FeatureHandle {
  const primitive = new ModelPrimitive(viewerHandle, spec);
  void primitive.init();

  return {
    id: spec.id,
    update(patch) {
      const next = { ...spec, ...patch } as FeatureRenderSpec;
      if (next.kind === 'model') primitive.updateSpec(next as ModelFeatureRenderSpec);
    },
    async flyTo(opts?: FlyToOptions) {
      const viewer = _getInternalViewer(viewerHandle);
      const target = primitive.primitive;
      if (!viewer || !target) return;
      await viewer.flyTo(target as any, opts as any);
    },
    unsafeNative: () => primitive.primitive ?? null,
    dispose() {
      primitive.dispose();
    },
  };
}

export function createBatchedPrimitiveFeatureHandle(
  viewerHandle: CesiumViewerHandle,
  features: FeatureRenderSpec[],
): FeatureHandle {
  const id = features[0]?.id ?? `batch-${Math.random().toString(36).slice(2)}`;
  const batch = new PrimitiveFeatureBatch(viewerHandle, id);
  let current: FeatureRenderSpec[] = features;
  batch.updateFeatures(current);

  return {
    id,
    update(patch) {
      // batched handle 的 update 语义: 用 patch 替换第一个 feature 的字段
      // 复杂场景应直接调用 batch.updateFeatures(完整列表)
      current = current.map((f, i) => (i === 0 ? ({ ...f, ...patch } as FeatureRenderSpec) : f));
      batch.updateFeatures(current);
    },
    async flyTo(_opts?: FlyToOptions) {
      // 批量原语没有单一目标,本阶段不实现
    },
    unsafeNative: () => batch.raw(),
    dispose() {
      batch.dispose();
    },
  };
}
