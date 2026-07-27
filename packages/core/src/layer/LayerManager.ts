import type { Map3D } from '../map'
import type { Manager } from '../type'
import type { BaseLayer } from './BaseLayer'

/**
 * 图层管理域（设计文档 §5.3）。
 *
 * - 构造函数只接收 `map3d` 与自身 `options`；
 * - 方法返回 `this` 支持链式调用；
 * - `destroy()` 同步清理全部图层。
 */
export class LayerManager implements Manager {
  private _layers = new Map<string, BaseLayer>()
  private _destroyed = false

  constructor(
    private map3d: Map3D,
    private options: Record<string, unknown> = {},
  ) {}

  get destroyed(): boolean {
    return this._destroyed
  }

  /** 建立跨域关联（骨架阶段为空实现，不暴露给用户） */
  init(): void {
    // 空实现
  }

  addLayer(layer: BaseLayer): this {
    if (this._layers.has(layer.id)) {
      throw new Error(`[LayerManager] layer id 重复: "${layer.id}"`)
    }
    this._layers.set(layer.id, layer)
    // 晚期绑定：注入 viewer/eventBus（设计 §5.6），随后才允许 addToMap
    layer._bind(this.map3d.viewer, this.map3d.eventBus)
    layer.addToMap()
    this.map3d.eventBus.emit('layer:added', { layer })
    return this
  }

  removeLayer(id: string): this {
    const layer = this._layers.get(id)
    if (!layer) return this
    this._layers.delete(id)
    layer.destroy()
    this.map3d.eventBus.emit('layer:removed', { layerId: id })
    return this
  }

  getLayer(id: string): BaseLayer | undefined {
    return this._layers.get(id)
  }

  hasLayer(id: string): boolean {
    return this._layers.has(id)
  }

  getAllLayers(): BaseLayer[] {
    return [...this._layers.values()]
  }

  destroy(): void {
    if (this._destroyed) return
    this._destroyed = true
    for (const layer of this._layers.values()) {
      layer.destroy()
    }
    this._layers.clear()
  }
}
