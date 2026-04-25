# @cgx/history — 撤销/重做历史管理器

> **模块层级**：L2 Domain Kernel
> **依赖**：`@cgx/reactive`（Signal）、`@cgx/core`（TypedEmitter）
> **不依赖**：Cesium（零 Cesium import）

---

## 概述

`@cgx/history` 是基于 **Command Pattern** 的独立撤销/重做系统。

**设计原则**：
- **完全独立**：不耦合 Layer/Feature，不挂载在任何业务对象上
- **纯数据命令**：每个 Command 是纯数据 + apply/revert 函数，不持有 Cesium 原生对象引用
- **响应式**：`can.undo` / `can.redo` 为 Signal，可被 UI 直接订阅
- **可合并**：连续同类型操作自动合并为单次（如连续拖拽）
- **可序列化**：支持 snapshot/restore，用于编辑会话中断恢复

---

## 快速开始

```ts
import { createHistory } from '@cgx/history';

// 1. 创建 History 实例，注入执行上下文
const history = createHistory({ data: myApp });

// 2. 执行命令
await history.execute({
  id: crypto.randomUUID(),
  kind: 'move',
  payload: { x: 10, y: 20 },
  apply(ctx) { ctx.data.moveTo(10, 20); },
  revert(ctx) { ctx.data.moveTo(0, 0); },
});

// 3. 撤销 / 重做
await history.undo();
await history.redo();

// 4. 查询状态
history.can.undo.get(); // boolean
history.can.redo.get(); // boolean
history.undoDepth;      // number
history.redoDepth;      // number
```

---

## API

### `createHistory(ctx, opts?)`

创建 History 实例。

| 参数 | 类型 | 说明 |
|------|------|------|
| `ctx` | `CommandContext<Ctx>` | 命令执行上下文，`ctx.data` 传递给每个 Command 的 apply/revert |
| `opts.limit` | `number` | undo 栈最大深度，默认 `Infinity` |

### `Command<P, Ctx>` 接口

| 属性 | 类型 | 说明 |
|------|------|------|
| `id` | `string` | 命令唯一标识 |
| `kind` | `string` | 命令类型（用于合并判断） |
| `payload` | `P` | 纯数据载荷 |
| `apply(ctx)` | `() => void \| Promise<void>` | 执行命令 |
| `revert(ctx)` | `() => void \| Promise<void>` | 回滚命令 |
| `coalesceWith?(next)` | `(next) => Command \| null` | 可选合并逻辑 |

### `History<Ctx>` 接口

| 方法 / 属性 | 说明 |
|-------------|------|
| `execute(cmd)` | 执行命令并压栈（清空 redo 栈） |
| `undo()` | 撤销最近一次命令 |
| `redo()` | 重做最近一次撤销 |
| `clear()` | 清空所有历史 |
| `can.undo` | `ReadonlySignal<boolean>` — 是否可撤销 |
| `can.redo` | `ReadonlySignal<boolean>` — 是否可重做 |
| `undoDepth` | 当前 undo 栈深度 |
| `redoDepth` | 当前 redo 栈深度 |
| `snapshot()` | 序列化为 `Uint8Array` |
| `restore(bytes, factory)` | 从快照恢复 |
| `on('changed', cb)` | 订阅变更事件 |
| `off('changed', cb?)` | 取消订阅 |
| `dispose()` | 销毁实例 |

---

## 命令合并（Coalesce）

连续执行同 `kind` 的命令时，如果前一个命令定义了 `coalesceWith`，系统会尝试合并：

```ts
// 连续拖拽只保留最终位置
const dragCmd = {
  kind: 'drag',
  payload: { x, y },
  apply(ctx) { /* ... */ },
  revert(ctx) { /* ... */ },
  coalesceWith(next) {
    // 合并为最终位置
    return { ...this, payload: next.payload };
  },
};
```

合并后 undo 栈只保留一个命令，减少内存占用和撤销次数。

---

## 序列化快照

```ts
// 导出快照
const bytes = history.snapshot();

// 恢复快照（需要提供命令工厂）
history.restore(bytes, (kind, payload) => {
  switch (kind) {
    case 'move': return createMoveCommand(payload);
    case 'resize': return createResizeCommand(payload);
    default: throw new Error(`Unknown command kind: ${kind}`);
  }
});
```

快照格式为 JSON 编码的 `Uint8Array`，仅包含命令的 `id`、`kind`、`payload`（纯数据），不包含函数。

---

## 事件

| 事件 | 载荷 | 触发时机 |
|------|------|----------|
| `'changed'` | `{ action, undoDepth, redoDepth }` | execute / undo / redo / clear |

`action` 可选值：`'execute'` | `'undo'` | `'redo'` | `'clear'`

---

## 与 Sketch/Edit 集成

`@cgx/history` 被 `@cgx/sketch` 和 `@cgx/edit` 共同依赖：

```
@cgx/sketch ──┐
              ├──▶ @cgx/history
@cgx/edit  ──┘
```

Sketch 和 Edit 各自创建独立的 History 实例，互不干扰。

---

## 约束

- **禁止**在 Command 的 `apply`/`revert` 中持有 Cesium 原生对象引用
- **禁止**将 History 实例挂载到 Layer/Feature 上
- Command 的 `payload` 必须是可序列化的纯数据（支持 JSON.stringify）
