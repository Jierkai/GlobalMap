import { signal } from '@cgx/reactive';
import type { CgxViewer, Capability } from '@cgx/core';
import type { EngineAdapter } from '@cgx/core';
import type { Layer } from '../layer/types.js';

/**
 * 图层管理器 (Layer Manager) API 接口。
 * 提供向视图中添加、移除和重排图层的能力。
 */
export interface LayerManagerApi {
  /** 向管理器中添加一个新图层。 */
  add(layer: Layer): void;
  /** 根据引用或 ID 移除一个图层。 */
  remove(layer: Layer | string): void;
  /** 将一个图层移动到指定的 z-index 层级。 */
  moveTo(layer: Layer | string, index: number): void;
  /** 返回一个持有已管理的图层列表的响应式信号。 */
  list(): { (): Layer[]; (v: Layer[]): void };
}

interface InternalLayer extends Layer {
  _setManager?(m: LayerManagerApi | null): void;
  _mount?(adapter: EngineAdapter): void | Promise<void>;
  _unmount?(adapter: EngineAdapter): void | Promise<void>;
  _emitMounted?(): void;
  _emitRemoved?(): void;
}

/**
 * 图层 (Layers) 能力插件。
 * 可以被安装到 CgxViewer 中以提供图层管理功能。
 */
export const Layers: Capability<LayerManagerApi> = {
  id: 'layers',
  install(viewer: CgxViewer) {
    const layersSignal = signal<Layer[]>([]);

    const api: LayerManagerApi = {
      add(layer: Layer) {
        const current = layersSignal();
        if (!current.find(l => l.id === layer.id)) {
           layersSignal([...current, layer]);
           (layer as InternalLayer)._setManager?.(api);
           (layer as InternalLayer)._mount?.(viewer.adapter);
           (layer as InternalLayer)._emitMounted?.();
        }
      },
      remove(layerOrId: Layer | string) {
        const id = typeof layerOrId === 'string' ? layerOrId : layerOrId.id;
        const current = layersSignal();
        const layer = current.find(l => l.id === id);
        if (layer) {
           layersSignal(current.filter(l => l.id !== id));
           (layer as InternalLayer)._setManager?.(null);
           (layer as InternalLayer)._unmount?.(viewer.adapter);
           (layer as InternalLayer)._emitRemoved?.();
        }
      },
      moveTo(layerOrId: Layer | string, index: number) {
        const id = typeof layerOrId === 'string' ? layerOrId : layerOrId.id;
        const current = [...layersSignal()];
        const oldIndex = current.findIndex(l => l.id === id);
        if (oldIndex > -1) {
           const [layer] = current.splice(oldIndex, 1);
           if (layer) {
             current.splice(index, 0, layer);
             layersSignal(current);
           }
        }
      },
      list() {
        return layersSignal;
      }
    };
    return api;
  }
};
