/**
 * @module @cgx/history/types
 *
 * Command Pattern 核心类型定义。
 *
 * 设计原则：
 * - Command 是纯数据 + 执行/回滚函数，不持有 Cesium 原生对象引用
 * - History 完全独立于 Layer/Feature，不耦合任何业务层
 * - 支持命令合并（coalesce）以减少冗余操作
 */

// ---------------------------------------------------------------------------
// Command 契约
// ---------------------------------------------------------------------------

/**
 * 命令执行上下文。
 *
 * 由调用方在创建 History 时注入，传递给每个 Command 的 apply/revert 方法。
 * 上下文可以携带任意业务数据（如 Viewer 引用、Layer 管理器等），
 * 但 Command 本身不直接持有这些引用——它们通过 context 间接访问。
 *
 * @typeParam Ctx - 上下文数据类型，默认为 `unknown`
 */
export interface CommandContext<Ctx = unknown> {
  /** 调用方注入的业务上下文数据 */
  readonly data: Ctx;
}

/**
 * 可撤销/重做的命令接口。
 *
 * 每个 Command 代表一个原子操作，支持：
 * - `apply`：执行命令（正向操作）
 * - `revert`：回滚命令（逆向操作）
 * - `coalesceWith`：可选的命令合并逻辑（连续同类型操作合并为一次）
 *
 * @typeParam P - 命令载荷（payload）的数据类型
 * @typeParam Ctx - 执行上下文的数据类型
 *
 * @example
 * ```ts
 * const moveCmd: Command<{ x: number; y: number }> = {
 *   id: crypto.randomUUID(),
 *   kind: 'move',
 *   payload: { x: 10, y: 20 },
 *   apply(ctx) { ctx.data.moveTo(this.payload.x, this.payload.y); },
 *   revert(ctx) { ctx.data.moveTo(prevX, prevY); },
 * };
 * ```
 */
export interface Command<P = unknown, Ctx = unknown> {
  /** 命令唯一标识（UUID v7 推荐） */
  readonly id: string;
  /** 命令类型标识（如 'move'、'resize'、'addVertex'） */
  readonly kind: string;
  /** 命令载荷数据（纯数据，不含函数或 Cesium 对象） */
  readonly payload: P;
  /** 执行命令 */
  apply(ctx: CommandContext<Ctx>): Promise<void> | void;
  /** 回滚命令 */
  revert(ctx: CommandContext<Ctx>): Promise<void> | void;
  /**
   * 可选：尝试与下一个同类型命令合并。
   *
   * 如果合并成功，返回合并后的新命令（替代两者）；
   * 如果无法合并，返回 `null`。
   *
   * 合并条件由实现者自行决定，典型场景：
   * - 连续拖拽位置合并为最终位置
   * - 连续样式修改合并为最终样式
   *
   * @param next - 下一个待执行的命令
   * @returns 合并后的新命令，或 `null` 表示不合并
   */
  coalesceWith?(next: Command<P, Ctx>): Command<P, Ctx> | null;
}

// ---------------------------------------------------------------------------
// History 事件
// ---------------------------------------------------------------------------

/**
 * History 变更事件载荷。
 */
export interface HistoryChangedEvent {
  /** 触发变更的操作类型 */
  readonly action: 'execute' | 'undo' | 'redo' | 'clear';
  /** 当前 undo 栈深度 */
  readonly undoDepth: number;
  /** 当前 redo 栈深度 */
  readonly redoDepth: number;
}

/**
 * History 事件映射表。
 */
export interface HistoryEvents extends Record<string, unknown> {
  /** 历史栈发生变更时触发 */
  'changed': HistoryChangedEvent;
}

// ---------------------------------------------------------------------------
// History 配置
// ---------------------------------------------------------------------------

/**
 * History 创建选项。
 */
export interface HistoryOptions {
  /**
   * undo 栈最大深度。
   * 超出限制时，最早的命令将被永久丢弃（不可恢复）。
   * 默认值：`Infinity`（不限制）
   */
  limit?: number;
}

// ---------------------------------------------------------------------------
// History 接口
// ---------------------------------------------------------------------------

/**
 * 历史管理器接口。
 *
 * 提供命令执行、撤销、重做、清空等操作，
 * 以及响应式的 `can.undo` / `can.redo` 信号。
 *
 * @typeParam Ctx - 执行上下文的数据类型
 */
export interface History<Ctx = unknown> {
  /**
   * 执行一个命令并压入 undo 栈。
   *
   * 执行新命令时，redo 栈会被清空（分支丢弃）。
   * 如果新命令与 undo 栈顶命令可合并（coalesceWith），则合并而非压栈。
   *
   * @param cmd - 要执行的命令
   */
  execute(cmd: Command<unknown, Ctx>): Promise<void>;

  /**
   * 撤销最近一次执行的命令。
   *
   * 如果 undo 栈为空，调用无效（不抛异常）。
   */
  undo(): Promise<void>;

  /**
   * 重做最近一次撤销的命令。
   *
   * 如果 redo 栈为空，调用无效（不抛异常）。
   */
  redo(): Promise<void>;

  /** 清空所有历史记录（undo 栈 + redo 栈）。 */
  clear(): void;

  /** 响应式状态：是否可以撤销 */
  readonly can: {
    /** 当 undo 栈非空时为 `true` */
    readonly undo: import('@cgx/reactive').ReadonlySignal<boolean>;
    /** 当 redo 栈非空时为 `true` */
    readonly redo: import('@cgx/reactive').ReadonlySignal<boolean>;
  };

  /** 当前 undo 栈深度 */
  readonly undoDepth: number;
  /** 当前 redo 栈深度 */
  readonly redoDepth: number;

  /**
   * 创建当前历史状态的序列化快照。
   *
   * 快照仅包含命令的 `id`、`kind`、`payload`（纯数据），
   * 不包含 `apply`/`revert` 函数。
   * 恢复时需要调用方提供命令工厂来重建命令实例。
   *
   * @returns 序列化后的字节数组（JSON 编码）
   */
  snapshot(): Uint8Array;

  /**
   * 从序列化快照恢复历史状态。
   *
   * @param bytes - 由 `snapshot()` 生成的字节数组
   * @param factory - 命令工厂函数，根据 `kind` 和 `payload` 重建完整 Command
   */
  restore(
    bytes: Uint8Array,
    factory: (kind: string, payload: unknown) => Command<unknown, Ctx>
  ): void;

  /**
   * 订阅历史变更事件。
   *
   * @param event - 事件名称
   * @param handler - 事件处理函数
   * @returns 取消订阅函数
   */
  on<K extends keyof HistoryEvents>(
    event: K,
    handler: (payload: HistoryEvents[K]) => void
  ): import('@cgx/reactive').Off;

  /**
   * 取消订阅历史变更事件。
   *
   * @param event - 事件名称
   * @param handler - 要移除的处理函数（不传则清除该事件所有监听器）
   */
  off<K extends keyof HistoryEvents>(
    event: K,
    handler?: (payload: HistoryEvents[K]) => void
  ): void;

  /** 销毁 History 实例，释放所有资源。 */
  dispose(): void;
  /** 是否已销毁 */
  readonly disposed: boolean;
}

// ---------------------------------------------------------------------------
// 序列化载荷（内部使用）
// ---------------------------------------------------------------------------

/**
 * 序列化快照的内部结构。
 * @internal
 */
export interface SerializedSnapshot {
  /** 快照格式版本号 */
  readonly v: 1;
  /** undo 栈（从底到顶） */
  readonly undo: ReadonlyArray<SerializedEntry>;
  /** redo 栈（从底到顶） */
  readonly redo: ReadonlyArray<SerializedEntry>;
}

/**
 * 单个序列化条目。
 * @internal
 */
export interface SerializedEntry {
  readonly id: string;
  readonly kind: string;
  readonly payload: unknown;
}
