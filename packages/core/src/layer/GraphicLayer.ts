import type { BaseGraphic } from '../graphic'
import { BaseLayer } from './BaseLayer'

/**
 * 图元图层（设计文档 §5.8）。
 *
 * 归属模型——图元不游离于全局，而是归属某个图层。
 * GraphicLayer 归属 layer 域，本质是一种"装图元的图层"。
 *
 * - extends BaseLayer，内部持有 Map<string, BaseGraphic>；
 * - addGraphic/removeGraphic/getGraphic/hasGraphic/getAllGraphics 链式，
 *   addGraphic 时对 graphic 做 _bind(viewer, eventBus, this.id) 注入 layerId；
 * - show 级联组内图元 _updateShow；destroy 级联销毁组内图元；
 * - 发 graphic:* 事件，负载带 layerId（与 layer:* 事件同构，§5.4）。
 *
 * 注：GraphicLayer 自身无 Cesium 图层实体（不像 TileLayer 持有 ImageryLayer），
 * addToMap 为 noop——图元在 addGraphic 时各自 addToMap。
 */
export class GraphicLayer extends BaseLayer {
  readonly type = 'graphic'
  private _graphics = new Map<string, BaseGraphic>()

  /** 能否设置透明度：GraphicLayer 无 ImageryLayer，返回 false */
  get hasOpacity(): boolean {
    return false
  }

  /** 能否设置 zIndex：GraphicLayer 无 ImageryLayer，返回 false */
  get hasZIndex(): boolean {
    return false
  }

  /** GraphicLayer 自身无 Cesium 图层实体，addToMap 为 noop（图元在 addGraphic 时各自 addToMap） */
  addToMap(): void {
    // noop
  }

  /** 从 map 移除：级联移除全部未销毁图元 */
  removeFromMap(): void {
    for (const graphic of this._graphics.values()) {
      if (!graphic.destroyed) graphic._removeFromMap()
    }
  }

  protected _updateShow(show: boolean): void {
    // 级联组内图元可见性：直接调 _updateShow，不经过 show setter，
    // 避免逐个 emit graphic:showChanged（图层 show 变化已 emit layer:showChanged）
    for (const graphic of this._graphics.values()) {
      graphic._updateShow(show)
    }
  }

  addGraphic(graphic: BaseGraphic): this {
    if (!this._viewer || !this._eventBus) {
      throw new Error('[GraphicLayer] 图层未绑定到 map，请先 addLayer 后再 addGraphic')
    }
    if (this._graphics.has(graphic.id)) {
      throw new Error(`[GraphicLayer] graphic id 重复: "${graphic.id}"`)
    }
    this._graphics.set(graphic.id, graphic)
    // 晚期绑定：注入 viewer/eventBus/layerId（设计 §5.6/§5.8）
    graphic._bind(this._viewer, this._eventBus, this.id, this)
    graphic._addToMap()
    this._eventBus.emit('graphic:added', { layerId: this.id, graphic })
    return this
  }

  removeGraphic(id: string): this {
    const graphic = this._graphics.get(id)
    if (!graphic) return this
    this._graphics.delete(id)
    graphic.destroy()
    this._eventBus!.emit('graphic:removed', { layerId: this.id, graphicId: id })
    return this
  }

  getGraphic(id: string): BaseGraphic | undefined {
    return this._graphics.get(id)
  }

  hasGraphic(id: string): boolean {
    return this._graphics.has(id)
  }

  getAllGraphics(): BaseGraphic[] {
    return [...this._graphics.values()]
  }

  destroy(): void {
    if (this.destroyed) return
    // 级联销毁组内图元（graphic.destroy 自身会调 removeFromMap）
    for (const graphic of this._graphics.values()) {
      graphic.destroy()
    }
    this._graphics.clear()
    super.destroy()
  }
}
