import type { BaseGraphic } from '../graphic/BaseGraphic'

export type { BaseGraphic }

/**
 * 图形样式基础接口（初始化阶段最小形状，后续迭代扩展）。
 */
export interface GraphicStyle {
  show?: boolean
}

/**
 * 量算结果。
 */
export interface MeasureResult {
  type: string
  value: number
  text: string
}
