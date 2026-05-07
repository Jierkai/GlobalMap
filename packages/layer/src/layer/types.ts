import { signal, type Signal } from '@cgx/reactive';
import { TypedEmitter, type Off } from '@cgx/core';
import type { LayerRenderSpec } from '@cgx/core';

/** 描述地图图层的类别。 */
export type LayerType = 'imagery' | 'terrain' | 'vector' | 'tileset';

/** 
 * 表示一个通用的地图图层。
 * 采用基于组合的设计模式而非深度继承。
 */
export interface Layer {
  /** 图层的唯一标识符。 */
  readonly id: string;
  /** 图层的特定类别。 */
  readonly type: LayerType;
  /** 表示图层是否可见的响应式信号。 */
  readonly visible: Signal<boolean>;
  /** 表示图层不透明度的响应式信号 (0 到 1)。 */
  readonly opacity: Signal<number>;
  /** 表示图层渲染 z-index 层级的响应式信号。 */
  readonly zIndex: Signal<number>;
  /** 输出给底层引擎适配器的渲染描述。 */
  toRenderSpec(): LayerRenderSpec;
  /** 返回底层挂载句柄，未挂载时返回 null。 */
  raw(): unknown;
  /** 显示图层。 */
  show(): void;
  /** 隐藏图层。 */
  hide(): void;
  /** 将图层从其所在的管理器中移除。 */
  remove(): void;
  /** 订阅图层生命周期事件。 */
  on(event: 'mounted' | 'removed', cb: () => void): Off;
}

/**
 * 为图层创建基础功能和状态。
 * 由具体的图层工厂内部使用。
 * @param id 图层的唯一 ID。
 * @param type 图层的类别。
 * @returns 基础图层对象。
 */
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
    // 提供给管理器的内部 API
    _setManager(m: { remove(id: string): void } | null) { managerRef = m; },
    _emitMounted() { emitter.emit('mounted', {}); },
    _emitRemoved() { emitter.emit('removed', {}); }
  };
  return layer;
}
