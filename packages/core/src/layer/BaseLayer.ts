import type { Viewer } from 'cesium'
import type { EventBus } from '../event'
import type { Disposable, BaseLayerOptions } from '../type'
import { generateId } from '@globalmap/shared'

/**
 * 图层基类（设计文档 §5.6）。
 *
 * - **晚期绑定**：构造只收纯数据 options 对象，不接触 map 内部；
 *   `viewer` / `eventBus` 在 `map.addLayer()` 时由框架经 `_bind()` 注入；
 * - `id` 缺省经 `generateId()` 随机生成；`show` 可在 options 声明初始可见性；
 * - `show` setter 去重 -> `_updateShow` -> emit `layer:showChanged`；
 * - `destroy()` 幂等，调用 `removeFromMap`。
 */
export abstract class BaseLayer implements Disposable {
  abstract readonly type: string
  readonly id: string
  protected _show: boolean
  protected _destroyed = false
  protected _viewer?: Viewer
  protected _eventBus?: EventBus

  constructor(options: BaseLayerOptions) {
    this.id = options.id ?? generateId('layer')
    this._show = options.show ?? true
  }

  get show(): boolean {
    return this._show
  }

  set show(value: boolean) {
    if (value === this._show) return
    if (!this._eventBus) {
      throw new Error('[BaseLayer] 未绑定到 map，请先 addLayer 后再操作 show（依赖 eventBus）')
    }
    this._show = value
    this._updateShow(value)
    this._eventBus.emit('layer:showChanged', { layerId: this.id, show: value })
  }

  get destroyed(): boolean {
    return this._destroyed
  }

  /**
   * 内部晚期绑定：addLayer 时由 LayerManager 调用，不暴露给用户。
   * 已绑定到另一 viewer 时抛错；同 viewer 同 eventBus 幂等。
   * options/style 的 show 初始值在 bind 时同步一次。
   */
  _bind(viewer: Viewer, eventBus: EventBus): void {
    if (this._viewer && this._viewer !== viewer) {
      throw new Error(`[BaseLayer] 图层 "${this.id}" 已绑定到另一个 map，不可重复绑定`)
    }
    this._viewer = viewer
    this._eventBus = eventBus
    // 同步初始 show（options 声明与实际可见性一致性）
    this._updateShow(this._show)
  }

  abstract addToMap(): void
  abstract removeFromMap(): void
  protected abstract _updateShow(show: boolean): void

  destroy(): void {
    if (this._destroyed) return
    this._destroyed = true
    this.removeFromMap()
  }
}
