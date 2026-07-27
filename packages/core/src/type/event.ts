import type { BaseLayer } from '../layer/BaseLayer'
import type { BaseGraphic } from '../graphic'
import type { MeasureResult } from './graphic'

export type { BaseLayer }

/**
 * 强类型事件总线的事件表（设计文档 §5.4 原文）。
 * 事件命名统一过去式：`domain:动作过去式`；新增事件必须在此显式声明。
 *
 * GraphicLayer 模式：图元事件由所属 GraphicLayer 发，负载带 layerId，
 * 与 layer:* 事件同构。
 */
export interface EventMap {
  'map3d:ready': void
  'map3d:destroyed': void
  'layer:added': { layer: BaseLayer }
  'layer:removed': { layerId: string }
  'layer:showChanged': { layerId: string; show: boolean }
  'graphic:added': { layerId: string; graphic: BaseGraphic }
  'graphic:removed': { layerId: string; graphicId: string }
  'graphic:showChanged': { layerId: string; graphicId: string; show: boolean }
  'plot:drawEnded': { graphic: BaseGraphic }
  'measure:completed': { result: MeasureResult }
}
