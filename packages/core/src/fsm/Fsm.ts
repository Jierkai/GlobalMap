/**
 * @module @cgx/core/fsm
 *
 * 通用有限状态机（FSM）基础设施。
 *
 * 设计原则：
 * - 纯数据驱动：状态、转换、钩子均为声明式配置
 * - Signal 驱动：当前状态为响应式 Signal，可被 UI 订阅
 * - 无继承：通过 `defineFsm()` 工厂创建，不暴露基类
 */

import { signal, type Signal, type ReadonlySignal, type Off } from '@cgx/reactive';

// ---------------------------------------------------------------------------
// 类型定义
// ---------------------------------------------------------------------------

/**
 * FSM 转换规则。
 *
 * @typeParam S - 状态联合类型
 * @typeParam E - 事件联合类型
 */
export interface FsmTransition<S extends string, E extends string> {
  /** 转换名称（可选，用于调试） */
  readonly name?: string;
  /** 源状态 */
  readonly from: S;
  /** 目标状态 */
  readonly to: S;
  /** 触发事件 */
  readonly event: E;
  /** 守卫条件：返回 `false` 阻止转换 */
  readonly guard?: () => boolean;
}

/**
 * FSM 状态钩子。
 *
 * @typeParam S - 状态联合类型
 * @typeParam E - 事件联合类型
 * @typeParam Ctx - 上下文数据类型
 */
export interface FsmHooks<S extends string, E extends string, Ctx = unknown> {
  /** 进入某状态时调用 */
  readonly onEnter?: (state: S, ctx: Ctx) => void;
  /** 离开某状态时调用 */
  readonly onExit?: (state: S, ctx: Ctx) => void;
  /** 转换发生时调用 */
  readonly onTransition?: (from: S, to: S, event: E, ctx: Ctx) => void;
}

/**
 * FSM 定义配置。
 *
 * @typeParam S - 状态联合类型
 * @typeParam E - 事件联合类型
 * @typeParam Ctx - 上下文数据类型
 */
export interface FsmDefinition<S extends string, E extends string, Ctx = unknown> {
  /** FSM 实例标识 */
  readonly id: string;
  /** 初始状态 */
  readonly initial: S;
  /** 所有状态列表 */
  readonly states: ReadonlyArray<S>;
  /** 转换规则列表 */
  readonly transitions: ReadonlyArray<FsmTransition<S, E>>;
  /** 生命周期钩子 */
  readonly hooks?: FsmHooks<S, E, Ctx>;
  /** 上下文数据（传递给钩子） */
  readonly context?: Ctx;
}

/**
 * FSM 实例接口。
 *
 * @typeParam S - 状态联合类型
 * @typeParam E - 事件联合类型
 */
export interface FsmInstance<S extends string, E extends string> {
  /** FSM 实例标识 */
  readonly id: string;
  /** 当前状态（响应式 Signal） */
  readonly state: ReadonlySignal<S>;
  /** 是否处于终态（无可用转换） */
  readonly terminal: boolean;
  /**
   * 发送事件触发状态转换。
   *
   * @param event - 要发送的事件
   * @returns 是否成功转换
   */
  send(event: E): boolean;
  /**
   * 强制设置状态（跳过转换规则和钩子）。
   * 仅用于恢复/重置场景。
   */
  forceState(state: S): void;
  /** 重置到初始状态 */
  reset(): void;
  /** 销毁 FSM */
  dispose(): void;
  /** 是否已销毁 */
  readonly disposed: boolean;
}

// ---------------------------------------------------------------------------
// 工厂函数
// ---------------------------------------------------------------------------

/**
 * 创建一个有限状态机实例。
 *
 * @typeParam S - 状态联合类型（如 `'idle' | 'drawing' | 'finished'`）
 * @typeParam E - 事件联合类型（如 `'start' | 'complete' | 'cancel'`）
 * @typeParam Ctx - 上下文数据类型
 * @param def - FSM 定义配置
 * @returns FSM 实例
 *
 * @example
 * ```ts
 * type SketchState = 'idle' | 'drawing' | 'finished';
 * type SketchEvent = 'start' | 'complete' | 'cancel';
 *
 * const fsm = defineFsm<SketchState, SketchEvent>({
 *   id: 'sketch-polygon',
 *   initial: 'idle',
 *   states: ['idle', 'drawing', 'finished'],
 *   transitions: [
 *     { from: 'idle', to: 'drawing', event: 'start' },
 *     { from: 'drawing', to: 'finished', event: 'complete' },
 *     { from: 'drawing', to: 'idle', event: 'cancel' },
 *   ],
 * });
 *
 * fsm.state.get(); // 'idle'
 * fsm.send('start');
 * fsm.state.get(); // 'drawing'
 * ```
 */
export function defineFsm<S extends string, E extends string, Ctx = unknown>(
  def: FsmDefinition<S, E, Ctx>
): FsmInstance<S, E> {
  const _state = signal<S>(def.initial);
  let _disposed = false;

  // 构建转换查找表：`${from}::${event}` → transition
  const transitionMap = new Map<string, FsmTransition<S, E>>();
  for (const t of def.transitions) {
    transitionMap.set(`${t.from}::${t.event}`, t);
  }

  function assertNotDisposed(): void {
    if (_disposed) {
      throw new Error(`FSM "${def.id}" has been disposed`);
    }
  }

  function send(event: E): boolean {
    assertNotDisposed();

    const current = _state.get();
    const key = `${current}::${event}`;
    const transition = transitionMap.get(key);

    if (!transition) return false;

    // 守卫检查
    if (transition.guard && !transition.guard()) return false;

    const from = current;
    const to = transition.to;

    // onExit
    def.hooks?.onExit?.(from, def.context as Ctx);

    // 状态变更
    _state.set(to);

    // onEnter
    def.hooks?.onEnter?.(to, def.context as Ctx);

    // onTransition
    def.hooks?.onTransition?.(from, to, event, def.context as Ctx);

    return true;
  }

  function forceState(state: S): void {
    assertNotDisposed();
    _state.set(state);
  }

  function reset(): void {
    assertNotDisposed();
    _state.set(def.initial);
  }

  function dispose(): void {
    if (_disposed) return;
    _disposed = true;
  }

  return {
    id: def.id,
    get state(): ReadonlySignal<S> {
      return _state as unknown as ReadonlySignal<S>;
    },
    get terminal(): boolean {
      const current = _state.get();
      // 检查是否有从当前状态出发的转换
      for (const t of def.transitions) {
        if (t.from === current) return false;
      }
      return true;
    },
    send,
    forceState,
    reset,
    dispose,
    get disposed(): boolean {
      return _disposed;
    },
  };
}
