# API 总览

> 骨架初始化阶段的 API 占位页。各能力域的详细 API 随功能迭代补充。

## 核心导出（@globalmap/core）

### 组合根

- `Map3D` — 地图组合根，构造完成全部初始化，`destroy()` 幂等逆序清理
- `Map3DOptions` — 构造选项：`container` / `cesiumBaseUrl` / `viewerOptions?`

### 事件

- `EventBus` — 强类型事件总线（`on` / `once` / `off` / `emit` / `destroy`）
- `EventMap` — 事件表：`map3d:ready`、`map3d:destroyed`、`layer:*`、`graphic:*`、`plot:drawEnded`、`measure:completed`

### 基类

- `BaseLayer` — 图层抽象基类（`id` / `show` / `addToMap` / `removeFromMap` / `destroy`）
- `BaseGraphic<TStyle>` — 图元抽象基类（同上 + 必填泛型 `style`）

### Manager（13 个能力域）

`LayerManager`、`GraphicManager`、`PrimitiveManager`、`PlotManager`、`MeasureManager`、`RoamManager`、`EffectManager`、`MaterialManager`、`AnalyseManager`、`TransformManager`、`ControlManager`、`ResourceManager`、`SceneManager`

### 工具

- `setCesiumBaseUrl(url)` — 提前设置 Cesium 静态资源路径，见[边缘场景说明](/guide/cesium-base-url)

### 类型

- `Disposable` / `Manager` — 统一销毁契约
- `GraphicStyle` / `MeasureResult` — 图元样式基础接口 / 量算结果

## @globalmap/shared

纯函数工具（不依赖 Cesium）：

- 数学：`clamp` / `lerp` / `toRadians` / `toDegrees`
- 格式化：`formatDistance` / `formatArea` / `formatCoordinate`
- 校验：`isValidLongitude` / `isValidLatitude` / `assertNonEmptyId`
- 下载：`downloadBlob` / `downloadText`
