import type { BaseGraphic } from './graphic'
import type { MeasureResult } from './graphic'

/**
 * 图层对象的最小形状（占位，后续 layer 域迭代扩展）。
 */
export interface BaseLayer {
  id: string
}

/**
 * 强类型事件总线的事件表（设计文档 §5.4 原文）。
 * 事件命名统一过去式：`domain:动作过去式`；新增事件必须在此显式声明。
 */
export interface EventMap {
  'map3d:ready': void
  'map3d:destroyed': void
  'layer:added': { layer: BaseLayer }
  'layer:removed': { layerId: string }
  'layer:showChanged': { layerId: string; show: boolean }
  'graphic:added': { graphic: BaseGraphic }
  'graphic:removed': { graphicId: string }
  'graphic:showChanged': { graphicId: string; show: boolean }
  'plot:drawEnded': { graphic: BaseGraphic }
  'measure:completed': { result: MeasureResult }
}
