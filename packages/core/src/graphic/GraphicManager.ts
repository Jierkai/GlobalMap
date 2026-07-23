import type { Map3D } from '../map'
import type { Manager } from '../type'
import type { BaseGraphic } from './BaseGraphic'

/**
 * 业务图元管理域（设计文档 §5.3），与 LayerManager 同模式。
 */
export class GraphicManager implements Manager {
  private _graphics = new Map<string, BaseGraphic>()
  private _destroyed = false

  constructor(
    private map3d: Map3D,
    private options: Record<string, unknown> = {},
  ) {}

  get destroyed(): boolean {
    return this._destroyed
  }

  /** 建立跨域关联（骨架阶段为空实现，不暴露给用户） */
  init(): void {
    // 空实现
  }

  addGraphic(graphic: BaseGraphic): this {
    if (this._graphics.has(graphic.id)) {
      throw new Error(`[GraphicManager] graphic id 重复: "${graphic.id}"`)
    }
    this._graphics.set(graphic.id, graphic)
    graphic.addToMap()
    this.map3d.eventBus.emit('graphic:added', { graphic })
    return this
  }

  removeGraphic(id: string): this {
    const graphic = this._graphics.get(id)
    if (!graphic) return this
    this._graphics.delete(id)
    graphic.destroy()
    this.map3d.eventBus.emit('graphic:removed', { graphicId: id })
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
    if (this._destroyed) return
    this._destroyed = true
    for (const graphic of this._graphics.values()) {
      graphic.destroy()
    }
    this._graphics.clear()
  }
}
