/**
 * 图层构造项（设计文档 §5.6）。
 *
 * - `id` 可选，缺省时经 generateId()（shared）随机生成；
 * - `show` 可选，声明初始可见性，在 _bind 时同步一次；
 * - 其余字段由各具体图层扩展自身构造项。
 */
export interface BaseLayerOptions {
  id?: string
  show?: boolean
  [key: string]: unknown
}
