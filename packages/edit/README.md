# @cgx/edit

## 功能
`edit` 模块提供了交互式空间数据的编辑能力。支持顶点拖动、插入、删除以及图形的批量平移、旋转、缩放等操作。

## 架构
核心为 `FeatureEditor`，所有的变更操作均通过与 `@cgx/history` 模块协同工作，以便轻松实现编辑步骤的撤销 (Undo) 和重做 (Redo)。
- **FeatureEditor**: 核心编辑器，通过 `createFeatureEditor` 创建。
- 管理选中要素的状态，提供 `translate`, `rotate` 等便捷方法。
- 支持处理并捕获基于顶点的详细编辑事件。

## 示例
```typescript
import { createHistory } from '@cgx/history';
import { createFeatureEditor } from '@cgx/edit';

const history = createHistory({ data: null });
const editor = createFeatureEditor({
  history,
  features: [{ id: 'f1', kind: 'polygon', vertices: [] }],
});

// 选中某个要素
editor.select('f1');

// 执行编辑操作（平移）
editor.translate(10, 20);

// 因为结合了 history，可以撤销操作
await editor.undo();
```
