import {
  Cartesian3,
  Color,
  ColorGeometryInstanceAttribute,
  GeometryInstance,
  PerInstanceColorAppearance,
  PolygonGeometry,
  Primitive,
} from 'cesium'
import { BaseGraphic } from '../graphic'
import type { LngLatPosition, PolygonPrimitiveOptions, PolygonPrimitiveStyle } from '../type'

/**
 * 面图元（Primitive 系：基于 Cesium Primitive + PolygonGeometry 渲染，性能优于 Entity 面）。
 *
 * 归属模型（设计文档 §5.1 注② / §5.8）：面图元不可直接添加到 Map 实例，
 * 需先经 `PrimitiveLayer.addGraphic()` 加入图元Layer，再随图层经 `map.layer.addLayer()` 挂载。
 *
 * 颜色经 PerInstanceColorAppearance 的逐实例颜色属性实现；
 * style.extrudedHeight 设置后呈拉伸体。
 */
export class PolygonPrimitive extends BaseGraphic<PolygonPrimitiveStyle> {
  readonly type = 'polygon'
  /** 面坐标序列（至少 3 个点，首尾无需闭合） */
  readonly positions: LngLatPosition[]
  private _primitive?: Primitive

  constructor(options: PolygonPrimitiveOptions) {
    super({ ...options, style: options.style ?? {} })
    if (options.positions.length < 3) {
      throw new Error(
        `[PolygonPrimitive] 面图元至少需要 3 个坐标点，实际 ${options.positions.length} 个`,
      )
    }
    this.positions = options.positions
  }

  _addToMap(): void {
    if (!this._viewer) {
      throw new Error(
        '[PolygonPrimitive] 未绑定到 map：图元不能直接添加到 Map 实例，请先经 PrimitiveLayer.addGraphic 加入图元Layer，再 addLayer 挂载图层',
      )
    }
    if (this._primitive) return // 已挂载，幂等
    const style = this.style
    const cartPositions = this.positions.map(([lng, lat, alt = 0]) =>
      Cartesian3.fromDegrees(lng, lat, alt),
    )
    this._primitive = new Primitive({
      geometryInstances: new GeometryInstance({
        geometry: PolygonGeometry.fromPositions({
          positions: cartPositions,
          height: style.height ?? 0,
          extrudedHeight: style.extrudedHeight,
        }),
        attributes: {
          color: ColorGeometryInstanceAttribute.fromColor(style.color ?? Color.WHITE),
        },
      }),
      appearance: new PerInstanceColorAppearance(),
      show: this._show,
    })
    this._viewer.scene.primitives.add(this._primitive)
    this._added = true
  }

  _removeFromMap(): void {
    if (this._viewer && this._primitive) {
      this._viewer.scene.primitives.remove(this._primitive)
    }
    this._primitive = undefined
    this._added = false
  }

  _updateShow(show: boolean): void {
    if (this._primitive) this._primitive.show = show
  }
}
