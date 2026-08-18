import {
  Cartesian3,
  Color,
  GeometryInstance,
  PolylineColorAppearance,
  PolylineGeometry,
  Primitive,
} from 'cesium'
import { BaseGraphic } from '../graphic'
import type { LngLatPosition, PolylinePrimitiveOptions, PolylinePrimitiveStyle } from '../type'

/**
 * 线图元（Primitive 系：基于 Cesium Primitive + PolylineGeometry 渲染，性能优于 Entity 线）。
 *
 * 归属模型（设计文档 §5.1 注② / §5.8）：线图元不可直接添加到 Map 实例，
 * 需先经 `PrimitiveLayer.addGraphic()` 加入图元Layer，再随图层经 `map.layer.addLayer()` 挂载。
 *
 * 颜色经 PolylineColorAppearance 消费逐段顶点色实现实色线（段数 = 点数 - 1）。
 */
export class PolylinePrimitive extends BaseGraphic<PolylinePrimitiveStyle> {
  readonly type = 'polyline'
  /** 线坐标序列（至少 2 个点） */
  readonly positions: LngLatPosition[]
  private _primitive?: Primitive

  constructor(options: PolylinePrimitiveOptions) {
    super({ ...options, style: options.style ?? {} })
    if (options.positions.length < 2) {
      throw new Error(
        `[PolylinePrimitive] 线图元至少需要 2 个坐标点，实际 ${options.positions.length} 个`,
      )
    }
    this.positions = options.positions
  }

  _addToMap(): void {
    if (!this._viewer) {
      throw new Error(
        '[PolylinePrimitive] 未绑定到 map：图元不能直接添加到 Map 实例，请先经 PrimitiveLayer.addGraphic 加入图元Layer，再 addLayer 挂载图层',
      )
    }
    if (this._primitive) return // 已挂载，幂等
    const style = this.style
    const color = style.color ?? Color.WHITE
    const cartPositions = this.positions.map(([lng, lat, alt = 0]) =>
      Cartesian3.fromDegrees(lng, lat, alt),
    )
    this._primitive = new Primitive({
      geometryInstances: new GeometryInstance({
        geometry: new PolylineGeometry({
          positions: cartPositions,
          width: style.width ?? 3,
          // 实色线：每段一个颜色（段数 = 点数 - 1）
          colors: cartPositions.slice(1).map(() => color),
        }),
      }),
      appearance: new PolylineColorAppearance(),
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
