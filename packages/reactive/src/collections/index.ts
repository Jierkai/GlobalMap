/**
 * @module @cgx/reactive/collections
 *
 * 响应式集合模块，提供可追踪变化的列表和映射数据结构。
 *
 * - `ObservableList` — 响应式列表，类似 `Array`，支持 push/pop/splice 等操作
 * - `ObservableMap`  — 响应式映射，类似 `Map`，支持 get/set/delete 等操作
 *
 * 所有集合内部使用信号（Signal）追踪版本变化，
 * 在 effect 或 computed 中访问集合属性/方法时会自动建立依赖关系。
 */

export * from './ObservableList';
export * from './ObservableMap';
