/**
 * @module @cgx/history
 *
 * Cgx 撤销/重做历史管理器（L2 Domain Kernel）
 *
 * 基于 Command Pattern 的独立历史栈，完全解耦于 Layer/Feature。
 * 支持命令合并、序列化快照、响应式 can.undo/can.redo 信号。
 *
 * @example
 * ```ts
 * import { createHistory } from '@cgx/history';
 *
 * const history = createHistory({ data: myApp });
 *
 * await history.execute({
 *   id: crypto.randomUUID(),
 *   kind: 'move',
 *   payload: { x: 10, y: 20 },
 *   apply(ctx) { ctx.data.moveTo(10, 20); },
 *   revert(ctx) { ctx.data.moveTo(0, 0); },
 * });
 *
 * await history.undo();
 * await history.redo();
 * ```
 */

export { createHistory } from './HistoryManager.js';
export type {
  Command,
  CommandContext,
  History,
  HistoryEvents,
  HistoryChangedEvent,
  HistoryOptions,
} from './types.js';
