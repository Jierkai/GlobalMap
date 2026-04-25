# @cgx/history

## 功能
`history` 模块提供独立的撤销（Undo）与重做（Redo）历史管理系统，主要配合 `edit` 或 `sketch` 模块记录和回滚用户操作。

## 架构
模块实现了经典的**命令模式（Command Pattern）**，并与 UI 和业务逻辑完全解耦。
- **HistoryManager**: 提供栈管理、快照序列化和响应式的 `canUndo` / `canRedo` 状态，可通过 `createHistory` 实例化。
- **Command**: 定义单个可被执行 `apply()` 和撤销 `revert()` 的操作单元。
- 支持将多个命令原子合并操作。

## 示例
```typescript
import { createHistory } from '@cgx/history';

// 初始化历史栈
const history = createHistory({ data: { position: { x: 0, y: 0 } } });

// 执行并推入命令
await history.execute({
  id: 'move-1',
  kind: 'move',
  payload: { x: 10, y: 20 },
  apply(ctx) { ctx.data.position = { x: 10, y: 20 }; },
  revert(ctx) { ctx.data.position = { x: 0, y: 0 }; },
});

// 撤销刚才的操作
await history.undo();
console.log(history.canRedo); // true

// 重做
await history.redo();
```
