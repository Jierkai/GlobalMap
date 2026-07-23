import type { Map3D } from '../map'
import type { Manager } from '../type'

/**
 * 坐标转换管理域（骨架空壳，后续迭代填充功能）。
 */
export class TransformManager implements Manager {
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

  destroy(): void {
    if (this._destroyed) return
    this._destroyed = true
  }
}
