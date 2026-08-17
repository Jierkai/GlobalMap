import type { Map3D } from '../map'
import type { Control, Manager } from '../type'

/**
 * UI 控件管理域（骨架空壳，后续迭代填充功能）。
 *
 * 配置消费分工：
 * - Cesium Viewer 原生控件（animation / baseLayerPicker / timeline 等）已在 `Map3D`
 *   构造时合并进 Viewer 构造参数（见 `CONTROL_VIEWER_KEYS`），此处不重复处理；
 * - 扩展控件（compass / zoom / locationBar 等）的 `options` 由本 Manager
 *   持有，待后续迭代实现具体控件。
 */
export class ControlManager implements Manager {
  private _destroyed = false

  constructor(
    private map3d: Map3D,
    private options: Control = {},
  ) {}

  get destroyed(): boolean {
    return this._destroyed
  }

  /** 建立跨域关联（骨架阶段为空实现，不暴露给用户） */
  init(): void {
    // 空实现
  }

  destroy(): void {
    if (this._destroyed) return
    this._destroyed = true
  }
}
