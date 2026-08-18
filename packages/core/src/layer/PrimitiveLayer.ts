import { PointPrimitiveCollection } from 'cesium'
import type { PointPrimitive as CesiumPointPrimitive } from 'cesium'
import type { BaseGraphic } from '../graphic'
import { BaseLayer } from './BaseLayer'

/**
 * 图元Layer（PrimitiveLayer，设计文档 §5.1 注② / §5.8 归属模型）。
 *
 * **Primitive 系图元的统一管理器**：底层图元（primitive/ 目录实现，extends BaseGraphic，
 * 基于 Cesium Primitive API 渲染，如 PointPrimitive / PolylinePrimitive / PolygonPrimitive）
 * 不游离于全局，也不得直接添加到 Map 实例--统一归属本图层：
 *
 * ```typescript
 * const layer = new PrimitiveLayer()
 * layer.addGraphic(new PointPrimitive({ position: [116.4, 39.9] })) // 图元先入图层（可离线组装）
 * map.layer.addLayer(layer) // 图层再入 map：挂载时统一 bind + 上屏
 * ```
 *
 * 与 GraphicLayer 同构（二者平级，均为"装图元的图层"），差异仅在承载的图元族：
 * - GraphicLayer：Entity 系业务图元（graphic/ 目录）；
 * - PrimitiveLayer：Primitive 系底层图元（primitive/ 目录，渲染性能更高）。
 *
 * **离线组装（缓存队列）**：图层未 bind（未 addLayer）时 addGraphic 仅登记缓存，
 * 不抛错；addLayer 挂载时统一对缓存图元 bind + _addToMap + emit graphic:added。
 * 已挂载后 addGraphic 则即时 bind + 上屏。两条路径收敛一致。
 *
 * **共享 collection（批量渲染）**：图层级按图元类型持有共享渲染容器--
 * 点：PointPrimitiveCollection（懒创建，同层全部点一个 draw call）；
 * 线/面暂各持独立 Primitive（面批量需 GeometryInstance 重打包，见 PolygonPrimitive 文档）。
 * 图元经 _acquirePointCollection/_releasePoint 向图层存取渲染资源，removeGraphic 只删自身句柄。
 *
 * - extends BaseLayer，内部持有 Map<string, BaseGraphic>；
 * - addGraphic/removeGraphic/getGraphic/hasGraphic/getAllGraphics 链式；
 * - show 级联组内图元 _updateShow；destroy 级联销毁组内图元与共享 collection；
 * - 发 graphic:* 事件，负载带 layerId（与 layer:* 事件同构，§5.4）。
 */
export class PrimitiveLayer extends BaseLayer {
  readonly type = 'primitive'
  private _graphics = new Map<string, BaseGraphic>()
  private _pointCollection?: PointPrimitiveCollection

  /** 能否设置透明度：PrimitiveLayer 无 ImageryLayer，返回 false */
  get hasOpacity(): boolean {
    return false
  }

  /** 能否设置 zIndex：PrimitiveLayer 无 ImageryLayer，返回 false */
  get hasZIndex(): boolean {
    return false
  }

  /** PrimitiveLayer 自身无 Cesium 图层实体，addToMap 为 noop（图元在 addGraphic 时各自上屏） */
  addToMap(): void {
    // 自身无 Cesium 图层实体；统一挂载离线组装的缓存图元，
    // 共享 collection 由图元 _addToMap 经 _acquirePointCollection 懒创建
    this._onMounted()
  }

  /** 从 map 移除：级联移除全部未销毁图元（共享 collection 随最后一个点释放后卸载） */
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

  /** 挂载后新增图元的公共路径：bind + 上屏 + emit graphic:added */
  private _mountGraphic(graphic: BaseGraphic): void {
    graphic._bind(this._viewer!, this._eventBus!, this.id, this)
    graphic._addToMap()
    this._eventBus!.emit('graphic:added', { layerId: this.id, graphic })
  }

  /**
   * 添加图元到本图层（图元入图层的唯一入口）。
   *
   * 图元不能直接添加到 Map 实例：请先 addGraphic 到图层，再经 map.layer.addLayer 挂载图层。
   * 图层未 bind（未 addLayer）时仅登记缓存（离线组装），挂载时统一上屏。
   */
  addGraphic(graphic: BaseGraphic): this {
    if (this._graphics.has(graphic.id)) {
      throw new Error(`[PrimitiveLayer] graphic id 重复: "${graphic.id}"`)
    }
    this._graphics.set(graphic.id, graphic)
    if (!this._viewer || !this._eventBus) {
      // 离线组装：未挂载，仅缓存；addLayer 时经 addToMap -> _mountAll 统一上屏
      return this
    }
    this._mountGraphic(graphic)
    return this
  }

  removeGraphic(id: string): this {
    const graphic = this._graphics.get(id)
    if (!graphic) return this
    this._graphics.delete(id)
    graphic.destroy()
    this._eventBus?.emit('graphic:removed', { layerId: this.id, graphicId: id })
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

  /** 图层挂载（addLayer 后 addToMap 驱动）：统一挂载离线组装的缓存图元 */
  protected override _onMounted(): void {
    for (const graphic of this._graphics.values()) {
      if (!graphic.destroyed && !graphic.isAdded) this._mountGraphic(graphic)
    }
  }

  // -- 共享渲染容器（内部：仅 primitive/ 图元经 _addToMap/_removeFromMap 存取） --

  /** 索取共享点集合：懒创建并挂到 viewer.scene.primitives */
  _acquirePointCollection(): PointPrimitiveCollection {
    if (!this._viewer) {
      throw new Error('[PrimitiveLayer] 未绑定到 map，无法创建共享点集合')
    }
    if (!this._pointCollection) {
      this._pointCollection = new PointPrimitiveCollection()
      this._viewer.scene.primitives.add(this._pointCollection)
    }
    return this._pointCollection
  }

  /** 归还点句柄：从共享集合移除自己的点；最后一个点移除后卸载整个集合 */
  _releasePoint(point: CesiumPointPrimitive): void {
    if (!this._pointCollection) return
    this._pointCollection.remove(point)
    if (this._pointCollection.length === 0 && this._viewer) {
      this._viewer.scene.primitives.remove(this._pointCollection)
      this._pointCollection = undefined
    }
  }

  destroy(): void {
    if (this.destroyed) return
    // 级联销毁组内图元（graphic.destroy 自身会 _removeFromMap，最后一个点释放时卸载共享集合）
    for (const graphic of this._graphics.values()) {
      graphic.destroy()
    }
    this._graphics.clear()
    // 兜底：若仍有残留集合（异常路径），直接卸载
    if (this._pointCollection && this._viewer) {
      this._viewer.scene.primitives.remove(this._pointCollection)
      this._pointCollection = undefined
    }
    super.destroy()
  }
}
