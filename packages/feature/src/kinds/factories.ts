import { effect } from '@cgx/reactive';
import type { EngineAdapter, FeatureRenderSpec, ModelRenderMode, Updatable } from '@cgx/core';
import { createFeature, type FeatureOptions, type Feature } from './Feature.js';

/**
 * 可挂载要素接口。
 */
export interface MountableFeature {
  _mount(adapter: EngineAdapter): void | Promise<void>;
  _unmount(adapter: EngineAdapter): void | Promise<void>;
}

/** 点要素配置选项 */
export type PointFeatureOptions = FeatureOptions<'point'> & { pixelSize?: number; color?: unknown };
/** 折线要素配置选项 */
export type PolylineFeatureOptions = FeatureOptions<'polyline'> & { width?: number; material?: unknown; clampToGround?: boolean };
/** 多边形要素配置选项 */
export type PolygonFeatureOptions = FeatureOptions<'polygon'> & { extrudedHeight?: number; material?: unknown };
/** 模型要素配置选项 */
export type ModelFeatureOptions = FeatureOptions<'model'> & {
  uri?: string;
  scale?: number;
  renderMode?: ModelRenderMode;
};
/** 标签要素配置选项 */
export type LabelFeatureOptions = FeatureOptions<'label'> & { text?: string; font?: string; scale?: number };

interface MountedFeatureHandle<T extends FeatureRenderSpec> {
  handle: Updatable<T> | void;
  dispose(): void;
}

function createMountedFeature<T extends FeatureRenderSpec>(
  adapter: EngineAdapter,
  buildSpec: () => T,
): MountedFeatureHandle<T> {
  const handle = adapter.mountFeature?.(buildSpec());
  const disposer = effect(() => {
    handle?.update?.(buildSpec());
  });

  return {
    handle,
    dispose() {
      disposer();
      handle?.dispose?.();
    }
  };
}

export function createPointFeature(opts: PointFeatureOptions): Feature<'point'> & MountableFeature {
  const feature = createFeature('point', opts);
  let mounted: MountedFeatureHandle<FeatureRenderSpec> | null = null;

  const buildSpec = (): FeatureRenderSpec => ({
    ...feature.toRenderSpec(),
    kind: 'point',
    point: {
      pixelSize: opts.pixelSize ?? 10,
      color: opts.color,
    },
  });

  return {
    ...feature,
    _mount(adapter: EngineAdapter) {
      mounted = createMountedFeature(adapter, buildSpec);
    },
    _unmount(adapter: EngineAdapter) {
      if (!mounted) return;
      adapter.unmountFeature?.(mounted.handle);
      mounted.dispose();
      mounted = null;
    },
    toRenderSpec: buildSpec,
    raw() {
      return mounted?.handle ?? undefined;
    },
  } as Feature<'point'> & MountableFeature;
}

export function createPolylineFeature(opts: PolylineFeatureOptions): Feature<'polyline'> & MountableFeature {
  const feature = createFeature('polyline', opts);
  let mounted: MountedFeatureHandle<FeatureRenderSpec> | null = null;

  const buildSpec = (): FeatureRenderSpec => ({
    ...feature.toRenderSpec(),
    kind: 'polyline',
    polyline: {
      positions: feature.positions?.(),
      width: opts.width ?? 2,
      material: opts.material,
      clampToGround: opts.clampToGround,
    },
  });

  return {
    ...feature,
    _mount(adapter: EngineAdapter) {
      mounted = createMountedFeature(adapter, buildSpec);
    },
    _unmount(adapter: EngineAdapter) {
      if (!mounted) return;
      adapter.unmountFeature?.(mounted.handle);
      mounted.dispose();
      mounted = null;
    },
    toRenderSpec: buildSpec,
    raw() {
      return mounted?.handle ?? undefined;
    },
  } as Feature<'polyline'> & MountableFeature;
}

export function createPolygonFeature(opts: PolygonFeatureOptions): Feature<'polygon'> & MountableFeature {
  const feature = createFeature('polygon', opts);
  let mounted: MountedFeatureHandle<FeatureRenderSpec> | null = null;

  const buildSpec = (): FeatureRenderSpec => ({
    ...feature.toRenderSpec(),
    kind: 'polygon',
    polygon: {
      hierarchy: feature.positions?.(),
      extrudedHeight: opts.extrudedHeight,
      material: opts.material,
    },
  });

  return {
    ...feature,
    _mount(adapter: EngineAdapter) {
      mounted = createMountedFeature(adapter, buildSpec);
    },
    _unmount(adapter: EngineAdapter) {
      if (!mounted) return;
      adapter.unmountFeature?.(mounted.handle);
      mounted.dispose();
      mounted = null;
    },
    toRenderSpec: buildSpec,
    raw() {
      return mounted?.handle ?? undefined;
    },
  } as Feature<'polygon'> & MountableFeature;
}

export function createModelFeature(opts: ModelFeatureOptions): Feature<'model'> & MountableFeature {
  const feature = createFeature('model', opts);
  let mounted: MountedFeatureHandle<FeatureRenderSpec> | null = null;

  const buildSpec = (): FeatureRenderSpec => ({
    ...feature.toRenderSpec(),
    kind: 'model',
    position: feature.position?.(),
    model: {
      uri: opts.uri,
      scale: opts.scale ?? 1.0,
      renderMode: opts.renderMode ?? 'auto',
    },
  });

  return {
    ...feature,
    _mount(adapter: EngineAdapter) {
      mounted = createMountedFeature(adapter, buildSpec);
    },
    _unmount(adapter: EngineAdapter) {
      if (!mounted) return;
      adapter.unmountFeature?.(mounted.handle);
      mounted.dispose();
      mounted = null;
    },
    toRenderSpec: buildSpec,
    raw() {
      return mounted?.handle ?? undefined;
    },
  } as Feature<'model'> & MountableFeature;
}

export function createLabelFeature(opts: LabelFeatureOptions): Feature<'label'> & MountableFeature {
  const feature = createFeature('label', opts);
  let mounted: MountedFeatureHandle<FeatureRenderSpec> | null = null;

  const buildSpec = (): FeatureRenderSpec => ({
    ...feature.toRenderSpec(),
    kind: 'label',
    position: feature.position?.(),
    label: {
      text: opts.text ?? '',
      font: opts.font,
      scale: opts.scale ?? 1.0,
    },
  });

  return {
    ...feature,
    _mount(adapter: EngineAdapter) {
      mounted = createMountedFeature(adapter, buildSpec);
    },
    _unmount(adapter: EngineAdapter) {
      if (!mounted) return;
      adapter.unmountFeature?.(mounted.handle);
      mounted.dispose();
      mounted = null;
    },
    toRenderSpec: buildSpec,
    raw() {
      return mounted?.handle ?? undefined;
    },
  } as Feature<'label'> & MountableFeature;
}
