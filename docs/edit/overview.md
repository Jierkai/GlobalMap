# @cgx/edit — 要素编辑工具集

> **模块层级**：L3 Feature API
> **依赖**：`@cgx/reactive`、`@cgx/core`（FSM + 约束）、`@cgx/history`（Command）、`@cgx/sketch`（Command 工厂）
> **不依赖**：Cesium（零 Cesium import）

---

## 概述

`@cgx/edit` 提供要素编辑能力，包括顶点拖动、插入、删除、批量平移/旋转/缩放。

**设计原则**：
- **FSM 驱动**：Editor 状态机（`idle → selecting → dragging/rotating/scaling`）
- **History 集成**：所有变更以 Command 形式进入 `@cgx/history`，支持完整 undo/redo
- **Diff 事件**：每次编辑产出 `{ before, after, diff }` 事件载荷
- **零 Cesium 依赖**：操作纯数据顶点，不持有 Cesium 引用

---

## 快速开始

```ts
import { createHistory } from '@cgx/history';
import { createFeatureEditor } from '@cgx/edit';

// 创建 History 和可编辑要素
const history = createHistory({ data: null });
const editor = createFeatureEditor({
  history,
  features: [
    { id: 'polygon-1', kind: 'polygon', vertices: [
      { x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }
    ]},
  ],
});

// 选中要素
editor.select('polygon-1');

// 拖动顶点
editor.startDrag('polygon-1', 0);
editor.updateDrag({ x: 5, y: 5 });
editor.endDrag();

// 撤销
await editor.undo(); // 顶点回到 (0, 0)

// 批量平移
editor.translate(10, 20);
await editor.undo(); // 回到原位
```

---

## API

### `createFeatureEditor(opts)`

创建要素编辑器实例。

| 参数 | 类型 | 说明 |
|------|------|------|
| `opts.history` | `History` | 关联的 History 实例 |
| `opts.features` | `EditableFeature[]` | 可编辑要素列表 |
| `opts.constraints` | `Constraint[]` | 可选约束列表 |

### `Editor` 接口

| 方法 / 属性 | 说明 |
|-------------|------|
| `state` | `ReadonlySignal<EditorState>` — 当前状态 |
| `selection` | 当前选中的要素 ID 列表 |
| `history` | 关联的 History 实例 |
| `select(ids)` | 选中要素 |
| `unselectAll()` | 取消所有选中 |
| `startDrag(featureId, vertexIndex)` | 开始拖动顶点 |
| `updateDrag(raw)` | 更新拖动位置（应用约束） |
| `endDrag()` | 完成拖动（提交 Command） |
| `insertVertex(featureId, afterIndex, vertex)` | 插入顶点 |
| `deleteVertex(featureId, vertexIndex)` | 删除顶点 |
| `translate(dx, dy)` | 批量平移 |
| `rotate(angle, center?)` | 批量旋转（弧度） |
| `scale(factor, center?)` | 批量缩放 |
| `undo()` | 撤销 |
| `redo()` | 重做 |
| `on(event, handler)` | 订阅事件 |
| `off(event, handler?)` | 取消订阅 |
| `dispose()` | 销毁 |

### `EditorState` 类型

```ts
type EditorState =
  | { phase: 'idle' }
  | { phase: 'selecting' }
  | { phase: 'dragging'; vertexIndex: number }
  | { phase: 'rotating'; center: Point2D }
  | { phase: 'scaling'; center: Point2D };
```

### 事件

| 事件 | 载荷 | 触发时机 |
|------|------|----------|
| `'vertex-dragged'` | `EditDiffEvent` | endDrag 时 |
| `'vertex-inserted'` | `EditDiffEvent` | insertVertex 时 |
| `'vertex-deleted'` | `EditDiffEvent` | deleteVertex 时 |
| `'batch-transformed'` | `EditDiffEvent` | translate/rotate/scale 时 |
| `'selection-changed'` | `{ selected: string[] }` | select/unselectAll 时 |

### `EditDiffEvent` 类型

```ts
interface EditDiffEvent {
  before: FeatureSnapshot;   // 编辑前快照
  after: FeatureSnapshot;    // 编辑后快照
  diff: string[];            // 变更的属性路径
}
```

---

## History 集成

所有编辑操作通过 `@cgx/history` 的 Command 实现：

| 操作 | Command kind | 说明 |
|------|-------------|------|
| 拖动顶点 | `edit.moveVertex` | 支持 coalesceWith（连续拖拽合并） |
| 插入顶点 | `sketch.addVertex` | — |
| 删除顶点 | `sketch.removeVertex` | — |
| 平移 | `edit.translate` | 批量变换 |
| 旋转 | `edit.rotate` | 批量变换 |
| 缩放 | `edit.scale` | 批量变换 |

---

## 约束

- **禁止**使用继承基类（如 `EditBase`）
- **禁止**在 Editor 中持有 Cesium 原生对象引用
- **禁止**将 History 实例挂载到 Layer/Feature 上
- 所有顶点数据为纯 `Point2D`（`{ x, y }`）
