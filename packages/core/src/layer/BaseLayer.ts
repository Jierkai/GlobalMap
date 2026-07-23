import type { Viewer } from 'cesium'
import type { EventBus } from '../event'
import type { Disposable } from '../type'

/**
 * 图层基类（设计文档 §5.6）。
 *
 * - `viewer` 构造注入，非方法参数；
 * - `show` setter 去重检查 → `_updateShow` 联动实际可见性 → emit `layer:showChanged`；
 * - `destroy()` 幂等，调用 `removeFromMap`。
 */
export abstract class BaseLayer implements Disposable {
  abstract readonly type: string
  protected _show = true
  protected _destroyed = false

  constructor(
    public readonly id: string,
    protected viewer: Viewer,
    protected eventBus: EventBus,
  ) {}

  get show(): boolean {
    return this._show
  }

  set show(value: boolean) {
    if (value === this._show) return
    this._show = value
    this._updateShow(value)
    this.eventBus.emit('layer:showChanged', { layerId: this.id, show: value })
  }

  get destroyed(): boolean {
    return this._destroyed
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
