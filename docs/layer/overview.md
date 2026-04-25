# @cgx/layer 架构概览

@cgx/layer 是 Cgx 框架中负责图层生命周期管理的包。

## 设计约束
- **无 BaseLayer 继承树**：完全通过组合工厂 (`createImageryLayer`, `createVectorLayer` 等) 组装，不暴露任何 Class 供继承，阻断强耦合污染。
- **无依赖 `cesium`**：在 L2/L3 层面不直接导入 `cesium` 原生库，所有的基础组件仅依赖 `alien-signals`。实际的图层渲染依靠 `adapter-cesium` 内置的装载器通过 `provider.toCesium()` 契约提取描述后下发到 Cesium。
- **按需加载 Provider**：所有的 Provider（例如 `xyz`, `wms`）都被提取到了独立的入口（如 `@cgx/layer/provider/xyz`），可以在现代构建工具中实现精准的 Tree-shaking，不会导致未使用源切片逻辑膨胀主包。

## 信号 (Signal) 状态
- 图层的控制状态包括 `visible`、`opacity`、`zIndex` 皆被注册为独立响应式。修改后直接由 L1 消费底层实体状态更新，不再需要手动轮询 `setTimeout`。
- `LayerManager` 的挂载通过 Viewer 的 `.use(Layers)` 执行。使用 `list()` 将返回响应式列表，方便 L4 (Vue / React 等适配层) 桥接监听列表变更。
