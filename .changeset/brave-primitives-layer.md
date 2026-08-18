---
'@globalmap/core': minor
---

新增图元Layer（PrimitiveLayer，layer 域）：Primitive 系图元的统一管理器。落地 primitive/ 目录点/线/面图元 PointPrimitive / PolylinePrimitive / PolygonPrimitive（extends BaseGraphic，基于 Cesium Primitive API 渲染）；图元先经 addGraphic 加入图层，图层再经 addLayer 加入 map——图元不能直接添加到 Map 实例。layer 配置项新增 { type: 'primitive' } 判别分支与工厂分发。
