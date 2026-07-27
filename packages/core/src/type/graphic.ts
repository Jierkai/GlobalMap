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
 * 量算结果。
 */
export interface MeasureResult {
  type: string
  value: number
  text: string
}
