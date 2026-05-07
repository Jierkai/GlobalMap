/**
 * @module @cgx/reactive
 *
 * Cgx 响应式内核层（L2 Reactive Kernel Layer）
 *
 * 本模块提供框架无关的信号（Signal）原语，基于 Push-Pull 架构，
 * 底层由 `alien-signals` 驱动。
 *
 * 核心导出：
 * - `signal`   — 创建可读写的响应式信号
 * - `computed` — 创建只读的派生信号（自动追踪依赖）
 * - `effect`   — 创建响应式副作用（自动追踪依赖并重新执行）
 * - `batch`    — 将多次信号写入合并为一次更新
 * - `untrack`  — 在不追踪依赖的情况下执行函数
 * - `peek`     — 读取信号值但不建立依赖关系
 */

import {
  signal as _signal,
  computed as _computed,
  effect as _effect,
  startBatch,
  endBatch,
  getActiveSub,
  setActiveSub,
} from 'alien-signals';

// ---------------------------------------------------------------------------
// 类型定义
// ---------------------------------------------------------------------------

/**
 * 可读写的响应式信号接口。
 *
 * @typeParam T - 信号持有的值类型
 *
 * @example
 * ```ts
 * const count = signal(0);
 * count.get(); // 0
 * count.set(1);
 * count.get(); // 1
 * ```
 */
export interface Signal<T> {
  /** 直接调用时读取当前值。 */
  (): T;
  /** 直接传参时写入新值。 */
  (val: T): void;
  /** 获取当前信号值（会建立依赖追踪） */
  get(): T;
  /** 设置信号新值，触发依赖更新 */
  set(val: T): void;
  /** 订阅信号值变化，返回取消订阅函数 */
  subscribe(handler: (v: T) => void): Off;
  /** 内部不透明符号，供框架适配器识别信号类型 */
  readonly __symbol: symbol;
}

/**
 * 只读的派生信号接口（由 `computed` 创建）。
 *
 * @typeParam T - 派生值的类型
 */
export interface ReadonlySignal<T> {
  /** 直接调用时读取当前值。 */
  (): T;
  /** 获取当前派生值（会建立依赖追踪） */
  get(): T;
  /** 订阅派生值变化，返回取消订阅函数 */
  subscribe(handler: (v: T) => void): Off;
  /** 内部不透明符号，供框架适配器识别信号类型 */
  readonly __symbol: symbol;
}

/**
 * 取消订阅 / 停止副作用的回调函数类型。
 * 调用后将清理相关资源并停止响应式追踪。
 */
export type Off = () => void;

// ---------------------------------------------------------------------------
// 内部常量
// ---------------------------------------------------------------------------

/** 用于标识 cgx 信号实例的唯一符号 */
const signalSymbol = Symbol('cgx-signal');

// ---------------------------------------------------------------------------
// 核心 API
// ---------------------------------------------------------------------------

/**
 * 创建一个可读写的响应式信号（Signal）。
 *
 * 信号是最基本的响应式原语，持有单个值并在值变化时通知所有订阅者。
 *
 * @typeParam T - 信号值的类型
 * @param initial - 信号的初始值
 * @returns 一个包含 `get`、`set`、`subscribe` 方法的信号对象
 *
 * @example
 * ```ts
 * const count = signal(0);
 *
 * effect(() => {
 *   console.log('当前值:', count.get());
 * });
 * // 输出: 当前值: 0
 *
 * count.set(5);
 * // 输出: 当前值: 5
 * ```
 */
export function signal<T>(initial: T): Signal<T> {
  // 使用 alien-signals 创建底层信号
  const inner = _signal(initial);
  const fn = function (this: void, val?: T): T | void {
    if (arguments.length === 0) {
      return inner();
    }
    inner(val as T);
  } as Signal<T>;

  fn.get = () => inner();
  fn.set = (val: T) => inner(val);
  fn.subscribe = (handler: (v: T) => void) => effect(() => handler(inner()));
  Object.defineProperty(fn, '__symbol', {
    get: () => signalSymbol
  });
  return fn;
}

/**
 * 创建一个只读的派生信号（Computed Signal）。
 *
 * 派生信号会自动追踪其计算函数中访问的其他信号，
 * 当依赖信号变化时自动重新计算。
 *
 * @typeParam T - 派生值的类型
 * @param fn - 计算函数，返回派生值
 * @returns 一个只读的派生信号对象
 *
 * @example
 * ```ts
 * const count = signal(2);
 * const double = computed(() => count.get() * 2);
 *
 * double.get(); // 4
 * count.set(5);
 * double.get(); // 10
 * ```
 */
export function computed<T>(fn: () => T): ReadonlySignal<T> {
  // 使用 alien-signals 创建底层 computed 信号
  const inner = _computed(fn);
  const read = function (): T {
    return inner();
  } as ReadonlySignal<T>;

  read.get = () => inner();
  read.subscribe = (handler: (v: T) => void) => effect(() => handler(inner()));
  Object.defineProperty(read, '__symbol', {
    get: () => signalSymbol
  });
  return read;
}

/**
 * 创建一个响应式副作用（Effect）。
 *
 * 副作用函数会在首次调用时立即执行，并自动追踪其中访问的信号。
 * 当任何被追踪的信号发生变化时，副作用会自动重新执行。
 *
 * 副作用函数可以返回一个清理函数（cleanup），该函数会在
 * 副作用重新执行前或被停止时调用，用于释放资源。
 *
 * @param fn - 副作用函数，可选返回清理函数
 * @returns 停止函数（`Off`），调用后停止副作用并执行清理
 *
 * @example
 * ```ts
 * const count = signal(0);
 *
 * const stop = effect(() => {
 *   console.log('count =', count.get());
 *   return () => console.log('清理上一次');
 * });
 * // 输出: count = 0
 *
 * count.set(1);
 * // 输出: 清理上一次
 * // 输出: count = 1
 *
 * stop(); // 停止副作用
 * ```
 */
export function effect(fn: () => void | (() => void)): Off {
  // 保存上一次副作用返回的清理函数
  let cleanup: void | (() => void);

  // 使用 alien-signals 创建底层 effect runner
  const runner = _effect(() => {
    // 每次重新执行前，先调用上一次的清理函数
    if (cleanup) cleanup();
    // 执行副作用并保存新的清理函数
    cleanup = fn();
  });

  // 标记是否已停止，防止重复停止
  let stopped = false;

  // 返回停止函数
  return () => {
    if (stopped) return;
    stopped = true;
    // 执行最终清理
    if (cleanup) {
      cleanup();
      cleanup = undefined;
    }
    // 调用 alien-signals 的 stop 函数（runner 本身就是 stop 函数）
    runner();
  };
}

/**
 * 将多次信号写入合并为一次批量更新。
 *
 * 在 batch 回调中对信号的所有写入会被延迟到回调结束后
 * 统一触发依赖更新，避免中间状态的无效渲染。
 *
 * @param fn - 包含多次信号写入的回调函数
 *
 * @example
 * ```ts
 * const a = signal(0);
 * const b = signal(0);
 *
 * effect(() => {
 *   console.log('a + b =', a.get() + b.get());
 * });
 * // 输出: a + b = 0
 *
 * batch(() => {
 *   a.set(1);
 *   b.set(2);
 * });
 * // 仅输出一次: a + b = 3（而非中间状态）
 * ```
 */
export function batch(fn: () => void): void {
  startBatch();
  try {
    fn();
  } finally {
    // 确保即使 fn 抛出异常也能结束批量更新
    endBatch();
  }
}

/**
 * 在不追踪依赖的情况下执行函数。
 *
 * 在 untrack 回调中读取信号不会建立依赖关系，
 * 即信号变化不会触发当前 effect 重新执行。
 *
 * @typeParam T - 返回值类型
 * @param fn - 要执行的函数
 * @returns fn 的返回值
 *
 * @example
 * ```ts
 * const count = signal(0);
 *
 * effect(() => {
 *   // count.get() 会被追踪
 *   console.log('tracked:', count.get());
 *   // count.get() 不会被追踪
 *   console.log('untracked:', untrack(() => count.get()));
 * });
 *
 * count.set(1);
 * // 仅输出: tracked: 1（untracked 的读取不触发重新执行）
 * ```
 */
export function untrack<T>(fn: () => T): T {
  // 保存当前活跃的订阅者
  const prevSub = getActiveSub();
  // 临时清除活跃订阅者，使信号读取不建立依赖
  setActiveSub(undefined);
  try {
    return fn();
  } finally {
    // 恢复之前的活跃订阅者
    setActiveSub(prevSub);
  }
}

/**
 * 读取信号值但不建立依赖关系（`untrack` 的便捷封装）。
 *
 * 等价于 `untrack(() => signal.get())`。
 *
 * @typeParam T - 信号值的类型
 * @param s - 要读取的信号
 * @returns 信号的当前值
 *
 * @example
 * ```ts
 * const count = signal(42);
 *
 * effect(() => {
 *   const val = peek(count); // 不追踪 count
 *   console.log('peeked:', val);
 * });
 *
 * count.set(100); // 不会触发 effect 重新执行
 * ```
 */
export function peek<T>(s: Signal<T> | ReadonlySignal<T>): T {
  return untrack(() => s());
}
