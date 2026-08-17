import type { ImageryLayer } from 'cesium'
import { BaseLayer } from './BaseLayer'
import { LayerState } from '../type'

/**
 * 图层组：装其它图层的图层（沿用 GraphicLayer 的"归属/装孩子"模型）。
 *
 * 组本身是 BaseLayer，经 `map.layer.addLayer(group)` 挂载，统一走晚期绑定与生命周期；
 * 组自身无 Cesium 图层实体（addToMap 不创建 ImageryLayer），hasOpacity / hasZIndex 为 false。
 *
 * 成员管理：
 * - `addLayer(layer)` 支持两种时序——先建组后整体挂载（未 bind 时 addLayer 只登记，
 *   组 addToMap 时统一绑定挂载），或组已挂载后增量加入（立即 bind + addToMap 并按层级重排）；
 * - **展示顺序（层级 + 数据顺序）**：按成员 zIndex 升序（值越大越在上层；未声明 zIndex 按 0），
 *   同层级按加入先后；`getAllLayers` / `eachLayer` 与 addToMap 的挂载次序均遵循该顺序；
 * - `removeLayer(id)`：移出组并销毁成员（与 LayerManager.removeLayer 语义一致）；
 * - show 级联：`group.show` 变化经成员自身 show setter 同步给已挂载成员
 *   （各成员独立 emit layer:showChanged）；组隐藏时新加成员初始即为隐藏；
 * - `removeFromMap` / `destroy` 级联成员；destroy 幂等。
 *
 * 事件：组成员的挂载 / 移除 emit `layer:added` / `layer:removed`
 * （成员进组即上图，与 LayerManager 的语义一致）。
 *
 * 注：同一图层实例不要同时挂在多个组 / map.layer 下（销毁与事件归属以所在容器为准）。
 */
export class LayerGroup extends BaseLayer {
  readonly type = 'group'

  /** 成员登记（id -> 图层） */
  private _layers = new Map<string, BaseLayer>()
  /** 成员加入序号（同 zIndex 稳定排序依据，即"数据顺序"） */
  private _seq = new Map<string, number>()
  /** 已由本组绑定并挂载到地图的成员 id（show 级联仅作用于这些成员） */
  private _addedIds = new Set<string>()
  private _counter = 0

  /** 能否设置透明度：组自身无 ImageryLayer，返回 false */
  get hasOpacity(): boolean {
    return false
  }

  /** 能否设置 zIndex：组自身无 ImageryLayer，返回 false */
  get hasZIndex(): boolean {
    return false
  }

  /** 挂载：按展示顺序（自底向上）绑定并挂载全部成员 */
  addToMap(): void {
    this._state = LayerState.ADDING
    for (const member of this._sortedLayers()) {
      this._addMemberToMap(member)
    }
    this._state = LayerState.ADDED
  }

  /** 从 map 移除：级联移除全部未销毁成员 */
  removeFromMap(): void {
    if (this._state === LayerState.ADDED) {
      this._state = LayerState.REMOVING
    }
    for (const member of this._layers.values()) {
      if (!member.destroyed) member.removeFromMap()
    }
    this._addedIds.clear()
    if (this._state === LayerState.REMOVING) {
      this._state = LayerState.REMOVED
    }
  }

  protected _updateShow(show: boolean): void {
    for (const member of this._layers.values()) {
      if (member.destroyed) continue
      if (!this._addedIds.has(member.id)) continue
      // 经成员 show setter 级联：状态与可视一致，各成员独立 emit layer:showChanged
      if (member.show !== show) member.show = show
    }
  }

  // -- 成员管理（链式） --

  addLayer(layer: BaseLayer): this {
    if (layer === this) {
      throw new Error('[LayerGroup] 不能把组自身加为成员')
    }
    if (this._layers.has(layer.id)) {
      throw new Error(`[LayerGroup] layer id 重复: "${layer.id}"`)
    }
    this._layers.set(layer.id, layer)
    this._seq.set(layer.id, this._counter++)
    // 组已挂载：立即 bind + addToMap 并恢复层级顺序；未挂载：只登记，待组 addToMap 统一处理
    if (this._viewer && this._eventBus) {
      this._addMemberToMap(layer)
      this._applyOrder()
    }
    return this
  }

  removeLayer(id: string): this {
    const layer = this._layers.get(id)
    if (!layer) return this
    this._layers.delete(id)
    this._seq.delete(id)
    this._addedIds.delete(id)
    layer.destroy()
    if (this._eventBus) this._eventBus.emit('layer:removed', { layerId: id })
    return this
  }

  getLayer(id: string): BaseLayer | undefined {
    return this._layers.get(id)
  }

  hasLayer(id: string): boolean {
    return this._layers.has(id)
  }

  /** 全部成员（展示顺序：zIndex 升序，同层级按加入先后） */
  getAllLayers(): BaseLayer[] {
    return this._sortedLayers()
  }

  /** 按展示顺序遍历成员 */
  eachLayer(callback: (layer: BaseLayer, index: number) => void): this {
    this._sortedLayers().forEach(callback)
    return this
  }

  destroy(): void {
    if (this.destroyed) return
    for (const member of this._layers.values()) {
      member.destroy()
    }
    this._layers.clear()
    this._seq.clear()
    this._addedIds.clear()
    super.destroy()
  }

  // -- 内部方法 --

  /** 展示顺序：zIndex 升序（值越大越在上层；未声明 zIndex 按 0），同层级按加入先后（数据顺序） */
  private _sortedLayers(): BaseLayer[] {
    return [...this._layers.values()].sort((a, b) => {
      const za = a.zIndex ?? 0
      const zb = b.zIndex ?? 0
      if (za !== zb) return za - zb
      return this._seq.get(a.id)! - this._seq.get(b.id)!
    })
  }

  /** 内部：绑定并挂载成员；本组已挂载过或成员已在图上（如经 map.layer 挂载）则不重复挂载；组隐藏时成员初始即隐藏 */
  private _addMemberToMap(member: BaseLayer): void {
    const alreadyOnMap = this._addedIds.has(member.id) || member.isAdded
    if (!alreadyOnMap) {
      member._bind(this._viewer!, this._eventBus!)
      member.addToMap()
    }
    this._addedIds.add(member.id)
    // 组隐藏时新成员初始即隐藏（经 setter，状态与可视一致）
    if (!this._show && member.show) member.show = false
    if (!alreadyOnMap) this._eventBus!.emit('layer:added', { layer: member })
  }

  /** 内部：已挂载组增量加成员后，按展示顺序重排成员的 ImageryLayer（无 ImageryLayer 的成员跳过） */
  private _applyOrder(): void {
    if (!this._viewer) return
    const collection = this._viewer.imageryLayers
    let anchor: ImageryLayer | undefined
    for (const member of this._sortedLayers()) {
      const il = member.layer
      if (!il) {
        continue
      }
      if (anchor && collection.indexOf(il) !== -1) {
        // 把 il 移到 anchor 正上方；步数上限防异常集合实现导致死循环
        const maxSteps = collection.length + 1
        let steps = 0
        while (collection.indexOf(il) > collection.indexOf(anchor) + 1 && steps++ < maxSteps) {
          collection.lower(il)
        }
        steps = 0
        while (collection.indexOf(il) < collection.indexOf(anchor) + 1 && steps++ < maxSteps) {
          collection.raise(il)
        }
      }
      anchor = il
    }
  }
}
