# @cgx/sketch — 矢量标绘工具集

> **模块层级**：L3 Feature API
> **依赖**：`@cgx/reactive`、`@cgx/core`（FSM + 约束）、`@cgx/history`（Command）
> **不依赖**：Cesium（零 Cesium import）

---

## 概述

`@cgx/sketch` 提供 6 种矢量标绘工具，每个工具是一个 **FSM 实例**（`idle → drawing → finished | cancelled`）。

**设计原则**：
- **FSM 驱动**：每个 Sketcher 是状态机，非继承基类
- **约束系统**：顶点坐标通过约束管道修正（吸附/正交/长度锁定/角度锁定）
- **History 集成**：所有操作以 Command 形式进入 `@cgx/history`，支持 undo/redo
- **零 Cesium 依赖**：产出纯数据顶点，不持有 Cesium 引用

---

## 快速开始

```ts
import { createPolygonSketcher } from '@cgx/sketch';
import { orthoConstraint } from '@cgx/core';

// 创建多边形标绘工具（带正交约束）
const sketcher = createPolygonSketcher({
  constraints: [orthoConstraint()],
});

// 开始绘制
sketcher.start();

// 添加顶点（自动应用约束）
sketcher.addVertex({ x: 116.4, y: 39.9 });
sketcher.addVertex({ x: 116.5, y: 39.9 });
sketcher.addVertex({ x: 116.5, y: 40.0 });

// 完成绘制
const vertices = sketcher.complete();
// vertices: [{ x: 116.4, y: 39.9 }, { x: 116.5, y: 39.9 }, { x: 116.5, y: 40.0 }]
```

---

## API

### 工厂函数

| 函数 | kind | minVertices | maxVertices | 说明 |
|------|------|-------------|-------------|------|
| `createPointSketcher(opts?)` | `'point'` | 1 | 1 | 点标绘 |
| `createPolylineSketcher(opts?)` | `'polyline'` | 2 | ∞ | 折线标绘 |
| `createPolygonSketcher(opts?)` | `'polygon'` | 3 | ∞ | 多边形标绘 |
| `createRectangleSketcher(opts?)` | `'rectangle'` | 2 | 2 | 矩形标绘（对角点） |
| `createCircleSketcher(opts?)` | `'circle'` | 2 | 2 | 圆标绘（圆心+半径点） |
| `createFreehandSketcher(opts?)` | `'freehand'` | 2 | ∞ | 自由绘制 |

### `Sketcher` 接口

| 方法 / 属性 | 说明 |
|-------------|------|
| `kind` | Sketcher 类型标识 |
| `state` | `ReadonlySignal<SketcherState>` — 当前状态 |
| `vertices` | 当前顶点列表 |
| `constraints` | 约束列表 |
| `start()` | 开始绘制（idle → drawing） |
| `addVertex(raw)` | 添加顶点（应用约束后） |
| `complete()` | 完成绘制，返回顶点列表 |
| `cancel()` | 取消绘制 |
| `undoVertex()` | 撤销最后一个顶点 |
| `on(event, handler)` | 订阅事件 |
| `off(event, handler?)` | 取消订阅 |
| `dispose()` | 销毁 |

### `SketcherState` 类型

```ts
type SketcherState =
  | { phase: 'idle' }
  | { phase: 'drawing'; vertexCount: number }
  | { phase: 'finished' }
  | { phase: 'cancelled' };
```

### 事件

| 事件 | 载荷 | 触发时机 |
|------|------|----------|
| `'vertex-added'` | `{ vertex, index }` | addVertex 时 |
| `'completed'` | `{ vertices }` | complete 时 |
| `'cancelled'` | `{}` | cancel 时 |

---

## 约束系统

约束是纯函数，接收候选坐标和上下文，返回修正后的坐标：

```ts
import { orthoConstraint, snapToEndpoint, composeConstraints } from '@cgx/core';

const sketcher = createPolylineSketcher({
  constraints: [
    snapToEndpoint({ target: 'endpoint', radius: 10 }),
    orthoConstraint(),
  ],
});
```

可用约束：
- `snapToEndpoint` — 端点吸附
- `snapToMidpoint` — 中点吸附
- `orthoConstraint` — 正交轴锁（Shift）
- `lengthLockConstraint` — 长度锁定
- `angleLockConstraint` — 角度锁定
- `composeConstraints` — 组合多个约束

---

## Command 集成

所有顶点操作可通过 `@cgx/history` 的 Command 实现 undo/redo：

```ts
import { createAddVertexCommand, createRemoveVertexCommand } from '@cgx/sketch';

const cmd = createAddVertexCommand(vertices, { x: 5, y: 10 }, 'feature-1');
await history.execute(cmd);
await history.undo(); // 移除顶点
```

---

## 约束

- **禁止**使用 `Plot` 命名（如 `PolyPlot`、`PointPlot`）
- **禁止**在 Sketcher 中持有 Cesium 原生对象引用
- 顶点数据为纯 `Point2D`（`{ x, y }`）
