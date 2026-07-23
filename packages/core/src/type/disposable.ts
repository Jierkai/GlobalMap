/**
 * 所有可销毁对象的统一契约（设计文档 §5.5）。
 */
export interface Disposable {
  readonly destroyed: boolean
  destroy(): void
}

/**
 * 约束所有域 Manager 必须实现 init() 与 destroy()；
 * Map3D 内部通过 Manager[] 管理销毁顺序（设计文档 §5.5）。
 */
export interface Manager extends Disposable {
  init(): void
}
