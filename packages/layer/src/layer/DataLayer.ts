import { createBaseLayer, type Layer } from './types.js';
import { effect } from '@cgx/reactive';
import type { DataLayerRenderSpec, EngineAdapter, LayerRenderSpec, Updatable } from '@cgx/core';

export interface DataLayerOptions {
  id?: string;
  sourceType: string;
  payload?: unknown;
  options?: Record<string, unknown>;
  visible?: boolean;
  opacity?: number;
  zIndex?: number;
}

export interface DataLayer extends Layer {
  readonly type: 'data';
  readonly sourceType: string;
  readonly payload: unknown;
  readonly options: Record<string, unknown> | undefined;
}

function buildDataLayerSpec(
  base: Pick<Layer, 'id' | 'visible' | 'opacity' | 'zIndex'>,
  opts: Pick<DataLayerOptions, 'sourceType' | 'payload' | 'options'>,
): DataLayerRenderSpec {
  const spec: DataLayerRenderSpec = {
    id: base.id,
    kind: 'data',
    visible: base.visible(),
    opacity: base.opacity(),
    zIndex: base.zIndex(),
    sourceType: opts.sourceType,
  };

  if (opts.payload !== undefined) spec.payload = opts.payload;
  if (opts.options !== undefined) spec.options = opts.options;

  return spec;
}

export function createDataLayer(opts: DataLayerOptions): DataLayer {
  const base = createBaseLayer(opts.id || crypto.randomUUID(), 'data');
  if (opts.visible !== undefined) base.visible(opts.visible);
  if (opts.opacity !== undefined) base.opacity(opts.opacity);
  if (opts.zIndex !== undefined) base.zIndex(opts.zIndex);

  let mountHandle: Updatable<LayerRenderSpec> | void;
  let effectDisposer: (() => void) | null = null;

  const buildSpec = (): DataLayerRenderSpec => buildDataLayerSpec(base, opts);

  return {
    ...base,
    type: 'data',
    sourceType: opts.sourceType,
    payload: opts.payload,
    options: opts.options,
    _mount(adapter: EngineAdapter) {
      mountHandle = adapter.mountLayer?.(buildSpec());
      effectDisposer = effect(() => {
        mountHandle?.update?.(buildSpec());
      });
    },
    async _unmount(adapter: EngineAdapter) {
      if (effectDisposer) {
        effectDisposer();
        effectDisposer = null;
      }
      await adapter.unmountLayer?.(mountHandle);
      mountHandle?.dispose?.();
      mountHandle = undefined;
    },
    toRenderSpec(): LayerRenderSpec {
      return buildSpec();
    },
    raw() {
      return mountHandle ?? null;
    }
  } as DataLayer;
}
