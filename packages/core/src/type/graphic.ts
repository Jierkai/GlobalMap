import type { Color } from 'cesium'
import type { BaseGraphic } from '../graphic/BaseGraphic'

export type { BaseGraphic }

/**
 * 图形样式基础接口（初始化阶段最小形状，后续迭代扩展）。
 */
export interface GraphicStyle {
  show?: boolean
}

/**
 * 图元构造项（设计文档 §5.6 末条）。
 *
 * - `id` 可选，缺省时经 generateId()（shared）随机生成；
 * - `style` 必填，泛型 TStyle 透传；
 * - `show` 可选，声明初始可见性，在 _bind 时同步一次。
 */
export interface BaseGraphicOptions<TStyle extends GraphicStyle = GraphicStyle> {
  id?: string
  style: TStyle
  [key: string]: unknown
}

/**
 * 经纬度坐标：[经度, 纬度] 或 [经度, 纬度, 高程(米)]（WGS84 角度制）。
 */
export type LngLatPosition = [number, number] | [number, number, number]

/**
 * 点图元样式（Primitive 系）。
 */
export interface PointPrimitiveStyle extends GraphicStyle {
  /** 点大小（像素，默认 10） */
  pixelSize?: number
  /** 填充颜色（默认白色） */
  color?: Color
  /** 描边颜色（默认黑色） */
  outlineColor?: Color
  /** 描边宽度（像素，默认 0） */
  outlineWidth?: number
}

/**
 * 点图元构造项（Primitive 系，设计文档 §5.1 注②）。
 *
 * 几何（position）与样式（style）分离，对齐 Mars3D 心智。
 */
export interface PointPrimitiveOptions extends Omit<
  BaseGraphicOptions<PointPrimitiveStyle>,
  'style'
> {
  /** 点位置：[经度, 纬度] 或 [经度, 纬度, 高程(米)] */
  position: LngLatPosition
  /** 样式（缺省 pixelSize=10 / color=白 / outlineColor=黑 / outlineWidth=0） */
  style?: PointPrimitiveStyle
}

/**
 * 线图元样式（Primitive 系）。
 */
export interface PolylinePrimitiveStyle extends GraphicStyle {
  /** 线宽（像素，默认 3） */
  width?: number
  /** 线颜色（默认白色） */
  color?: Color
}

/**
 * 线图元构造项（Primitive 系）。
 */
export interface PolylinePrimitiveOptions extends Omit<
  BaseGraphicOptions<PolylinePrimitiveStyle>,
  'style'
> {
  /** 线坐标序列（至少 2 个点） */
  positions: LngLatPosition[]
  /** 样式（缺省 width=3 / color=白） */
  style?: PolylinePrimitiveStyle
}

/**
 * 面图元样式（Primitive 系）。
 */
export interface PolygonPrimitiveStyle extends GraphicStyle {
  /** 填充颜色（默认白色） */
  color?: Color
  /** 面高程（米，默认 0） */
  height?: number
  /** 拉伸顶高程（米）；设置后呈拉伸体 */
  extrudedHeight?: number
}

/**
 * 面图元构造项（Primitive 系）。
 */
export interface PolygonPrimitiveOptions extends Omit<
  BaseGraphicOptions<PolygonPrimitiveStyle>,
  'style'
> {
  /** 面坐标序列（至少 3 个点，首尾无需闭合） */
  positions: LngLatPosition[]
  /** 样式（缺省 color=白 / height=0） */
  style?: PolygonPrimitiveStyle
}

/**
 * 量算结果。
 */
export interface MeasureResult {
  type: string
  value: number
  text: string
}
