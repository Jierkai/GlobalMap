# @cgx/layer 架构概览

@cgx/layer 是 Cgx 框架中负责图层生命周期管理的包。

## 设计约束
- **类式领域对象 API**：通过 `ImageryLayer`、`TerrainLayer`、`DataLayer`、`GeoJsonLayer`、`PointCloudLayer`、`TilesetLayer`、`VectorLayer`、`GraphicLayer` 等公开类直接实例化，内部继承自 `BaseLayer` 抽象基类。
- **无依赖 `cesium`**：在 L2/L3 层面不直接导入 `cesium` 原生库，所有的基础组件仅依赖 `@cgx/reactive`。实际的图层渲染依靠 `adapter-cesium` 内置的装载器通过 `LayerRenderSpec` 描述后下发到 Cesium。
- **按需加载 Provider**：所有的 Provider（例如 `xyz`, `wms`）都被提取到了独立的入口（如 `@cgx/layer/provider/xyz`），可以在现代构建工具中实现精准的 Tree-shaking，不会导致未使用源切片逻辑膨胀主包。

## 类继承体系

```
BaseLayer (abstract, 内部基类)
├── ImageryLayer          — 影像图层
├── TerrainLayer          — 地形图层
├── DataLayer             — 通用数据图层
│   ├── GeoJsonLayer      — GeoJSON 图层
│   │   └── VectorLayer<F> — 矢量图层 (Legacy 兼容)
│   ├── PointCloudLayer   — 点云图层
│   └── TilesetLayer      — 3D Tileset 图层
└── GraphicLayer          — 图形图层（管理 Feature 集合）
```

## 信号 (Signal) 状态
- 图层的控制状态包括 `visible`、`opacity`、`zIndex` 皆被注册为独立响应式。修改后直接由 L1 消费底层实体状态更新，不再需要手动轮询 `setTimeout`。
- `LayerManager` 的挂载通过 Viewer 的 `.use(Layers)` 执行。使用 `list()` 将返回响应式列表，方便 L4 (Vue / React 等适配层) 桥接监听列表变更。
