import type { Viewer } from 'cesium'
import type { EventBus } from '../event'
import type { Disposable, GraphicStyle, BaseGraphicOptions } from '../type'
import { generateId } from '@globalmap/shared'

/**
 * 业务图元基类（设计文档 §5.6 末条）。
 *
 * 与 BaseLayer 同模式（晚期绑定 + options 构造），差异：
 * - 泛型 `<TStyle extends GraphicStyle>`，options 内含必填 `style`；
 * - `_bind` 额外收 `layerId`（图元事件负载带 layerId，见 §5.4）；
 * - `show` 变更 emit `graphic:showChanged`（带 layerId + graphicId）。
 */
export abstract class BaseGraphic<
  TStyle extends GraphicStyle = GraphicStyle,
> implements Disposable {
  abstract readonly type: string
  readonly id: string
  readonly style: TStyle
  protected _show: boolean
  protected _destroyed = false
  protected _viewer?: Viewer
  protected _eventBus?: EventBus
  protected _layerId?: string

  constructor(options: BaseGraphicOptions<TStyle>) {
    this.id = options.id ?? generateId('graphic')
    this.style = options.style
    this._show = options.style.show ?? true
  }

  get show(): boolean {
    return this._show
  }

  set show(value: boolean) {
    if (value === this._show) return
    if (!this._eventBus || !this._layerId) {
      throw new Error('[BaseGraphic] 未绑定到 GraphicLayer，请先 addGraphic 后再操作 show')
    }
    this._show = value
    this._updateShow(value)
    this._eventBus.emit('graphic:showChanged', {
      layerId: this._layerId,
      graphicId: this.id,
      show: value,
    })
  }

  get destroyed(): boolean {
    return this._destroyed
  }

  /**
   * 内部晚期绑定：addGraphic 时由 GraphicLayer 调用，不暴露给用户。
   * 已绑定到另一 viewer 时抛错；同 viewer 同 eventBus 幂等。
   * style.show 初始值在 bind 时同步一次。
   */
  _bind(viewer: Viewer, eventBus: EventBus, layerId: string): void {
    if (this._viewer && this._viewer !== viewer) {
      throw new Error(`[BaseGraphic] 图元 "${this.id}" 已绑定到另一个图层，不可重复绑定`)
    }
    this._viewer = viewer
    this._eventBus = eventBus
    this._layerId = layerId
    // 同步初始 show
    this._updateShow(this._show)
  }

  abstract addToMap(): void
  abstract removeFromMap(): void
  /** 内部：同步实际可见性。供 GraphicLayer 级联调用（下划线约定 internal，跨类访问需 public）。 */
  abstract _updateShow(show: boolean): void

  destroy(): void {
    if (this._destroyed) return
    this._destroyed = true
    this.removeFromMap()
  }
}
