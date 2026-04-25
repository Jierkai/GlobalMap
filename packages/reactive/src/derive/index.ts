/**
 * @module @cgx/reactive/derive
 *
 * 派生信号工具模块，提供 `derive` 和 `memo` 两个便捷函数。
 *
 * 两者均为 `computed` 的语义别名，旨在丰富 API 表面并为未来扩展预留空间。
 */

import { computed } from '../index';
import type { ReadonlySignal } from '../index';

/**
 * 派生一个新的响应式值。
 *
 * 这是 `computed` 的语义别名，用于表达"从现有信号派生新值"的意图。
 * 内部直接委托给 `computed` 实现。
 *
 * @typeParam T - 派生值的类型
 * @param fn - 计算函数，返回派生值
 * @returns 只读的派生信号
 *
 * @example
 * ```ts
 * const count = signal(3);
 * const doubled = derive(() => count.get() * 2);
 * doubled.get(); // 6
 * ```
 */
export function derive<T>(fn: () => T): ReadonlySignal<T> {
  return computed(fn);
}

/**
 * 创建一个带记忆化的信号计算。
 *
 * 这是 `computed` 的语义别名，用于表达"记忆化计算"的意图。
 * 内部直接委托给 `computed` 实现。
 *
 * @typeParam T - 计算值的类型
 * @param fn - 计算函数，返回计算值
 * @returns 只读的派生信号
 *
 * @example
 * ```ts
 * const items = signal([1, 2, 3]);
 * const sum = memo(() => items.get().reduce((a, b) => a + b, 0));
 * sum.get(); // 6
 * ```
 */
export function memo<T>(fn: () => T): ReadonlySignal<T> {
  return computed(fn);
}
