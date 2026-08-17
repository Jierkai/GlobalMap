import type { Viewer, ImageryProvider, ImageryLayer } from 'cesium'
import type { EventBus } from '../event'
import type { Disposable, BaseLayerOptions } from '../type'
import { ChinaCRS, LayerState } from '../type'
import { generateId } from '@globalmap/shared'

/**
 * 图层基类（设计文档 §5.6）。
 *
 * - **晚期绑定**：构造只收纯数据 options 对象，不接触 map 内部；
 *   `viewer` / `eventBus` 在 `map.addLayer()` 时由框架经 `_bind()` 注入；
 * - `id` 缺省经 `generateId()` 随机生成；`show` 可在 options 声明初始可见性；
 * - `show` setter 去重 -> `_updateShow` -> emit `layer:showChanged`；
 * - `destroy()` 幂等，调用 `removeFromMap`。
 *
 * 实例方法：
 * - `reload()`：重新加载地图（先 removeFromMap 再 addToMap）；
 * - `setOpacity(opacity)`：设置透明度（仅 hasOpacity=true 的图层有效）；
 * - `setOptions(options, isMerge)`：重新设置参数（isMerge=true 时与现有 options 合并）。
 *
 * Getter：
 * - `crs`：图层坐标系（ChinaCRS）；
 * - `hasOpacity`：能否设置透明度（瓦片图层 true，GraphicLayer false）；
 * - `hasZIndex`：能否设置 zIndex（瓦片图层 true，GraphicLayer false）；
 * - `imageryProvider`：底层 Cesium ImageryProvider；
 * - `isAdded`：是否已添加到地图上；
 * - `isDestroy`：是否已销毁（与 `destroyed` 同义，语义化命名）；
 * - `layer`：底层 Cesium ImageryLayer；
 * - `state`：当前运行时状态（LayerState 枚举）；
 * - `zIndex`：图层叠放顺序（无 zIndex 概念的图层为 undefined）。
 */
export abstract class BaseLayer implements Disposable {
  abstract readonly type: string
  readonly id: string
  protected _show: boolean
  protected _destroyed = false
  protected _viewer?: Viewer
  protected _eventBus?: EventBus
  protected _state: LayerState = LayerState.INITIAL
  protected _opacity = 1.0
  protected _options: BaseLayerOptions

  constructor(options: BaseLayerOptions) {
    this.id = options.id ?? generateId('layer')
    this._show = options.show ?? true
    this._options = options
  }

  get show(): boolean {
    return this._show
  }

  set show(value: boolean) {
    if (value === this._show) return
    if (!this._eventBus) {
      throw new Error('[BaseLayer] 未绑定到 map，请先 addLayer 后再操作 show（依赖 eventBus）')
    }
    this._show = value
    this._updateShow(value)
    this._eventBus.emit('layer:showChanged', { layerId: this.id, show: value })
  }

  get destroyed(): boolean {
    return this._destroyed
  }

  // -- Getter --

  /** 图层坐标系（默认 WGS84，子类可覆写） */
  get crs(): ChinaCRS {
    return ChinaCRS.WGS84
  }

  /** 能否设置透明度（瓦片图层 true，GraphicLayer false） */
  get hasOpacity(): boolean {
    return false
  }

  /** 能否设置 zIndex（瓦片图层 true，GraphicLayer false） */
  get hasZIndex(): boolean {
    return false
  }

  /** 底层 Cesium ImageryProvider（未添加到地图时为 undefined） */
  get imageryProvider(): ImageryProvider | undefined {
    return undefined
  }

  /** 是否已添加到地图上 */
  get isAdded(): boolean {
    return this._state === LayerState.ADDED
  }

  /** 图层叠放顺序（值越大越在上层；无 zIndex 概念的图层为 undefined，子类覆写） */
  get zIndex(): number | undefined {
    return undefined
  }

  /** 是否已销毁（与 destroyed 同义，语义化命名） */
  get isDestroy(): boolean {
    return this._destroyed
  }

  /** 底层 Cesium ImageryLayer（未添加到地图时为 undefined） */
  get layer(): ImageryLayer | undefined {
    return undefined
  }

  /** 当前运行时状态 */
  get state(): LayerState {
    return this._state
  }

  // -- 实例方法 --

  /**
   * 重新加载地图：先 removeFromMap 再 addToMap。
   * 未绑定到 map 时抛错。
   */
  reload(): void {
    if (!this._viewer) {
      throw new Error('[BaseLayer] 未绑定到 map，请先 addLayer 后再 reload')
    }
    if (this._destroyed) return
    this.removeFromMap()
    this.addToMap()
  }

  /**
   * 设置透明度（仅 hasOpacity=true 的图层有效）。
   * @param opacity 透明度 0.0-1.0
   */
  setOpacity(opacity: number): void {
    this._opacity = opacity
    this._applyOpacity()
  }

  /**
   * 重新设置参数。
   * @param options 新的参数
   * @param isMerge 是否与现有 options 合并（true=合并，false=替换）
   *
   * 设置后需调用 reload() 使新参数生效。
   */
  setOptions(options: BaseLayerOptions, isMerge = false): void {
    if (isMerge) {
      this._options = { ...this._options, ...options }
    } else {
      this._options = options
    }
    // 同步 show 字段
    if (options.show !== undefined) {
      this._show = options.show
    }
  }

  /** 内部：同步透明度到底层 ImageryLayer（子类覆写） */
  protected _applyOpacity(): void {
    // 默认 noop，子类覆写
  }

  /**
   * 内部晚期绑定：addLayer 时由 LayerManager 调用，不暴露给用户。
   * 已绑定到另一 viewer 时抛错；同 viewer 同 eventBus 幂等。
   * options/style 的 show 初始值在 bind 时同步一次。
   */
  _bind(viewer: Viewer, eventBus: EventBus): void {
    if (this._viewer && this._viewer !== viewer) {
      throw new Error(`[BaseLayer] 图层 "${this.id}" 已绑定到另一个 map，不可重复绑定`)
    }
    this._viewer = viewer
    this._eventBus = eventBus
    // 同步初始 show（options 声明与实际可见性一致性）
    this._updateShow(this._show)
  }

  abstract addToMap(): void
  abstract removeFromMap(): void
  protected abstract _updateShow(show: boolean): void

  destroy(): void {
    if (this._destroyed) return
    this._destroyed = true
    this._state = LayerState.DESTROYED
    this.removeFromMap()
  }
}
