import { Cartesian3, Color } from 'cesium'
import type { PointPrimitive as CesiumPointPrimitive } from 'cesium'
import { BaseGraphic } from '../graphic'
import type { PrimitiveLayer } from '../layer'
import type { LngLatPosition, PointPrimitiveOptions, PointPrimitiveStyle } from '../type'

/**
 * 点图元（Primitive 系：基于图层共享的 PointPrimitiveCollection 渲染，性能优于 Entity 点）。
 *
 * 归属模型（设计文档 §5.1 注② / §5.8）：点图元不可直接添加到 Map 实例，
 * 需先经 `PrimitiveLayer.addGraphic()` 加入图元Layer，再随图层经 `map.layer.addLayer()` 挂载。
 *
 * **共享 collection**：图层未挂载（未 addLayer）时 addGraphic 仅登记缓存（离线组装），
 * 图层挂载时统一 bind + _addToMap；挂载后 addGraphic 即时上屏。
 * _addToMap 向所属 PrimitiveLayer 索取共享 PointPrimitiveCollection（一个 draw call 渲染同层全部点），
 * _removeFromMap 只从集合移除自己的点句柄，不影响同层其他图元。
 * 构造只收纯数据（position + style），晚期绑定同 BaseGraphic。
 */
export class PointPrimitive extends BaseGraphic<PointPrimitiveStyle> {
  readonly type = 'point'
  /** 点位置：[经度, 纬度] 或 [经度, 纬度, 高程(米)]（WGS84 角度制） */
  readonly position: LngLatPosition
  private _point?: CesiumPointPrimitive

  constructor(options: PointPrimitiveOptions) {
    super({ ...options, style: options.style ?? {} })
    this.position = options.position
  }

  _addToMap(): void {
    if (!this._viewer || !this._layer) {
      throw new Error(
        '[PointPrimitive] 未绑定到 map：图元不能直接添加到 Map 实例，请先经 PrimitiveLayer.addGraphic 加入图元Layer，再 addLayer 挂载图层',
      )
    }
    if (this._point) return // 已挂载，幂等
    const style = this.style
    const [lng, lat, alt = 0] = this.position
    // 向图层索取共享 collection（图层懒创建并挂 scene.primitives）
    const collection = (this._layer as PrimitiveLayer)._acquirePointCollection()
    this._point = collection.add({
      position: Cartesian3.fromDegrees(lng, lat, alt),
      pixelSize: style.pixelSize ?? 10,
      color: style.color ?? Color.WHITE,
      outlineColor: style.outlineColor ?? Color.BLACK,
      outlineWidth: style.outlineWidth ?? 0,
      // 初始可见性与 style.show 一致（_bind 时已同步 _show）
      show: this._show,
    })
    this._added = true
  }

  _removeFromMap(): void {
    if (this._layer && this._point) {
      // 只移除自己的点句柄，共享 collection 与同层其他图元不受影响
      ;(this._layer as PrimitiveLayer)._releasePoint(this._point)
    }
    this._point = undefined
    this._added = false
  }

  _updateShow(show: boolean): void {
    if (this._point) this._point.show = show
  }
}
