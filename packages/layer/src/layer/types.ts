import { signal, type Signal } from '@cgx/reactive';
import { TypedEmitter, type Off } from '@cgx/core';
import type { LayerRenderSpec } from '@cgx/core';

export type LayerType = 'imagery' | 'terrain' | 'graphic' | 'data' | 'vector' | 'tileset';

export interface Layer {
  readonly id: string;
  readonly type: LayerType;
  readonly visible: Signal<boolean>;
  readonly opacity: Signal<number>;
  readonly zIndex: Signal<number>;
  toRenderSpec(): LayerRenderSpec;
  raw(): unknown;
  show(): void;
  hide(): void;
  remove(): void;
  on(event: 'mounted' | 'removed', cb: () => void): Off;
}

export function createBaseLayer(id: string, type: LayerType) {
  const visible = signal(true);
  const opacity = signal(1);
  const zIndex = signal(0);
  const emitter = new TypedEmitter<{ mounted: unknown; removed: unknown }>();
  let managerRef: { remove(id: string): void } | null = null;

  const layer = {
    id,
    type,
    visible,
    opacity,
    zIndex,
    show() { visible(true); },
    hide() { visible(false); },
    remove() {
      if (managerRef) managerRef.remove(id);
    },
    on: emitter.on.bind(emitter) as (event: 'mounted' | 'removed', cb: () => void) => Off,
    toRenderSpec(): LayerRenderSpec {
      return {
        id,
        kind: type,
        visible: visible(),
        opacity: opacity(),
        zIndex: zIndex(),
      } as LayerRenderSpec;
    },
    raw() { return null; },
    _setManager(m: { remove(id: string): void } | null) { managerRef = m; },
    _emitMounted() { emitter.emit('mounted', {}); },
    _emitRemoved() { emitter.emit('removed', {}); }
  };
  return layer;
}
