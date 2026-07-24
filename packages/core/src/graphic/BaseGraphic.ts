import type { Viewer } from 'cesium'
import type { EventBus } from '../event'
import type { Disposable, GraphicStyle } from '../type'

/**
 * 业务图元基类（设计文档 §5.6 末条）。
 *
 * 与 BaseLayer 同模式，差异：泛型 `<TStyle extends GraphicStyle>`、
 * 构造参数含必填 `style`，`show` 变更 emit `graphic:showChanged`。
 */
export abstract class BaseGraphic<
  TStyle extends GraphicStyle = GraphicStyle,
> implements Disposable {
  abstract readonly type: string
  protected _show = true
  protected _destroyed = false

  constructor(
    public readonly id: string,
    protected viewer: Viewer,
    protected eventBus: EventBus,
    public readonly style: TStyle,
  ) {}

  get show(): boolean {
    return this._show
  }

  set show(value: boolean) {
    if (value === this._show) return
    this._show = value
    this._updateShow(value)
    this.eventBus.emit('graphic:showChanged', { graphicId: this.id, show: value })
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
