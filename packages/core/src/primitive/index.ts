// Primitive 系图元实现目录（设计文档 §5.1 注②）：图元类 extends BaseGraphic，
// 由 PrimitiveLayer（layer 域，图元Layer）持有——图元先入图层，图层再入 map，不可直连 Map 实例。
// 无 Manager：图层/图元的管理一律归 layer 域。
export { PointPrimitive } from './PointPrimitive'
export { PolylinePrimitive } from './PolylinePrimitive'
export { PolygonPrimitive } from './PolygonPrimitive'
