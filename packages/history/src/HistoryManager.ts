/**
 * @module @cgx/history/HistoryManager
 *
 * History 管理器实现。
 *
 * 基于 Command Pattern 的撤销/重做系统，特点：
 * - 完全独立于 Layer/Feature（不耦合任何业务层）
 * - 每个 Command 是纯数据 + 执行/回滚函数
 * - 支持命令合并（coalesce）减少冗余操作
 * - 支持序列化快照（snapshot/restore）
 * - can.undo / can.redo 为响应式 Signal
 */

import { signal, type Signal, type ReadonlySignal, type Off } from '@cgx/reactive';
import { TypedEmitter } from '@cgx/core';
import type {
  Command,
  CommandContext,
  History,
  HistoryEvents,
  HistoryOptions,
  SerializedSnapshot,
  SerializedEntry,
} from './types';

// ---------------------------------------------------------------------------
// 内部辅助
// ---------------------------------------------------------------------------

/**
 * 从命令中提取可序列化的纯数据条目。
 */
function toSerializedEntry(cmd: Command): SerializedEntry {
  return {
    id: cmd.id,
    kind: cmd.kind,
    payload: cmd.payload,
  };
}

// ---------------------------------------------------------------------------
// HistoryManager 实现
// ---------------------------------------------------------------------------

/**
 * 基于 Command Pattern 的历史管理器。
 *
 * @typeParam Ctx - 执行上下文的数据类型
 */
class HistoryManager<Ctx = unknown> implements History<Ctx> {
  /** undo 栈（底 → 顶 = 旧 → 新） */
  private undoStack: Command<unknown, Ctx>[] = [];
  /** redo 栈（底 → 顶 = 旧 → 新） */
  private redoStack: Command<unknown, Ctx>[] = [];
  /** 执行上下文 */
  private readonly ctx: CommandContext<Ctx>;
  /** 最大 undo 深度 */
  private readonly limit: number;
  /** 事件派发器 */
  private readonly emitter = new TypedEmitter<HistoryEvents>();
  /** 是否已销毁 */
  private _disposed = false;

  // 响应式信号
  private readonly _canUndo: Signal<boolean>;
  private readonly _canRedo: Signal<boolean>;

  constructor(ctx: CommandContext<Ctx>, opts?: HistoryOptions) {
    this.ctx = ctx;
    this.limit = opts?.limit ?? Infinity;
    this._canUndo = signal(false);
    this._canRedo = signal(false);
  }

  // -------------------------------------------------------------------------
  // 公开属性
  // -------------------------------------------------------------------------

  get can(): { undo: ReadonlySignal<boolean>; redo: ReadonlySignal<boolean> } {
    return {
      undo: this._canUndo as unknown as ReadonlySignal<boolean>,
      redo: this._canRedo as unknown as ReadonlySignal<boolean>,
    };
  }

  get undoDepth(): number {
    return this.undoStack.length;
  }

  get redoDepth(): number {
    return this.redoStack.length;
  }

  get disposed(): boolean {
    return this._disposed;
  }

  // -------------------------------------------------------------------------
  // 核心操作
  // -------------------------------------------------------------------------

  async execute(cmd: Command<unknown, Ctx>): Promise<void> {
    this.assertNotDisposed();

    // 尝试与 undo 栈顶合并
    const top = this.undoStack[this.undoStack.length - 1];
    if (top && top.kind === cmd.kind && typeof top.coalesceWith === 'function') {
      const merged = top.coalesceWith(cmd);
      if (merged) {
        // 合并成功：替换栈顶，执行合并后的命令
        this.undoStack[this.undoStack.length - 1] = merged;
        await merged.apply(this.ctx);
        // 清空 redo 栈（分支丢弃）
        this.redoStack.length = 0;
        this.updateSignals();
        this.emitChanged('execute');
        return;
      }
    }

    // 执行命令
    await cmd.apply(this.ctx);

    // 压入 undo 栈
    this.undoStack.push(cmd);

    // 清空 redo 栈（分支丢弃）
    this.redoStack.length = 0;

    // 限制 undo 栈深度
    this.trimUndoStack();

    this.updateSignals();
    this.emitChanged('execute');
  }

  async undo(): Promise<void> {
    this.assertNotDisposed();

    const cmd = this.undoStack.pop();
    if (!cmd) return;

    await cmd.revert(this.ctx);
    this.redoStack.push(cmd);

    this.updateSignals();
    this.emitChanged('undo');
  }

  async redo(): Promise<void> {
    this.assertNotDisposed();

    const cmd = this.redoStack.pop();
    if (!cmd) return;

    await cmd.apply(this.ctx);
    this.undoStack.push(cmd);

    this.updateSignals();
    this.emitChanged('redo');
  }

  clear(): void {
    this.assertNotDisposed();

    this.undoStack.length = 0;
    this.redoStack.length = 0;

    this.updateSignals();
    this.emitChanged('clear');
  }

  // -------------------------------------------------------------------------
  // 序列化
  // -------------------------------------------------------------------------

  snapshot(): Uint8Array {
    this.assertNotDisposed();

    const data: SerializedSnapshot = {
      v: 1,
      undo: this.undoStack.map(toSerializedEntry),
      redo: this.redoStack.map(toSerializedEntry),
    };
    const json = JSON.stringify(data);
    return new TextEncoder().encode(json);
  }

  restore(
    bytes: Uint8Array,
    factory: (kind: string, payload: unknown) => Command<unknown, Ctx>
  ): void {
    this.assertNotDisposed();

    const json = new TextDecoder().decode(bytes);
    const data = JSON.parse(json) as SerializedSnapshot;

    if (data.v !== 1) {
      throw new Error(`Unsupported snapshot version: ${String(data.v)}`);
    }

    this.undoStack = data.undo.map((entry) => factory(entry.kind, entry.payload));
    this.redoStack = data.redo.map((entry) => factory(entry.kind, entry.payload));

    this.updateSignals();
    this.emitChanged('clear');
  }

  // -------------------------------------------------------------------------
  // 事件
  // -------------------------------------------------------------------------

  on<K extends keyof HistoryEvents>(
    event: K,
    handler: (payload: HistoryEvents[K]) => void
  ): Off {
    return this.emitter.on(event, handler);
  }

  off<K extends keyof HistoryEvents>(
    event: K,
    handler?: (payload: HistoryEvents[K]) => void
  ): void {
    this.emitter.off(event, handler);
  }

  // -------------------------------------------------------------------------
  // 生命周期
  // -------------------------------------------------------------------------

  dispose(): void {
    if (this._disposed) return;
    this._disposed = true;
    this.undoStack.length = 0;
    this.redoStack.length = 0;
    this._canUndo.set(false);
    this._canRedo.set(false);
  }

  // -------------------------------------------------------------------------
  // 内部方法
  // -------------------------------------------------------------------------

  private assertNotDisposed(): void {
    if (this._disposed) {
      throw new Error('History instance has been disposed');
    }
  }

  private updateSignals(): void {
    this._canUndo.set(this.undoStack.length > 0);
    this._canRedo.set(this.redoStack.length > 0);
  }

  private trimUndoStack(): void {
    while (this.undoStack.length > this.limit) {
      this.undoStack.shift();
    }
  }

  private emitChanged(action: HistoryEvents['changed']['action']): void {
    this.emitter.emit('changed', {
      action,
      undoDepth: this.undoStack.length,
      redoDepth: this.redoStack.length,
    });
  }
}

// ---------------------------------------------------------------------------
// 工厂函数
// ---------------------------------------------------------------------------

/**
 * 创建一个 History 实例。
 *
 * @typeParam Ctx - 执行上下文的数据类型
 * @param ctx - 命令执行上下文
 * @param opts - 可选配置
 * @returns History 实例
 *
 * @example
 * ```ts
 * const history = createHistory({ data: viewer });
 *
 * await history.execute({
 *   id: crypto.randomUUID(),
 *   kind: 'move',
 *   payload: { x: 10, y: 20 },
 *   apply(ctx) { ctx.data.moveTo(10, 20); },
 *   revert(ctx) { ctx.data.moveTo(0, 0); },
 * });
 *
 * await history.undo(); // 回到原位
 * await history.redo(); // 再次移动
 * ```
 */
export function createHistory<Ctx = unknown>(
  ctx: CommandContext<Ctx>,
  opts?: HistoryOptions
): History<Ctx> {
  return new HistoryManager<Ctx>(ctx, opts);
}
