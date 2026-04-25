/**
 * @module @cgx/adapter-vue
 *
 * Cgx Vue3 适配器（L4 Framework Adapter）
 *
 * 薄封装层，不复制核心逻辑。
 * 提供 Composables 将 Cgx Signal 桥接为 Vue Ref。
 *
 * @example
 * ```ts
 * import { toRef, fromRef } from '@cgx/adapter-vue';
 * import { signal } from '@cgx/reactive';
 *
 * const count = signal(0);
 * const vueRef = toRef(count); // Vue Ref<number>
 * ```
 */

import { ref, watch, onUnmounted, type Ref } from 'vue';
import type { Signal, ReadonlySignal, Off } from '@cgx/reactive';

/**
 * 将 Cgx Signal 转换为 Vue Ref（单向绑定）。
 *
 * Signal 变化 → Ref 自动更新。
 *
 * @param s - Cgx Signal
 * @returns Vue Ref
 */
export function toRef<T>(s: Signal<T> | ReadonlySignal<T>): Ref<T> {
  const r = ref(s.get()) as Ref<T>;
  const off: Off = s.subscribe((v: T) => {
    r.value = v;
  });

  // Vue 组件卸载时自动取消订阅
  try {
    onUnmounted(() => off());
  } catch {
    // 非组件上下文中调用，手动管理生命周期
  }

  return r;
}

/**
 * 将 Vue Ref 转换为 Cgx Signal（双向绑定）。
 *
 * Ref 变化 → Signal 自动更新；Signal 变化 → Ref 自动更新。
 *
 * @param r - Vue Ref
 * @returns Cgx Signal
 */
export function fromRef<T>(r: Ref<T>): Signal<T> {
  // 动态导入避免循环依赖
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { signal: createSignal } = require('@cgx/reactive') as typeof import('@cgx/reactive');
  const s = createSignal(r.value);

  // Ref → Signal
  const stopWatch = watch(r, (newVal) => {
    s.set(newVal);
  });

  // Signal → Ref
  const off = s.subscribe((v) => {
    r.value = v;
  });

  try {
    onUnmounted(() => {
      stopWatch();
      off();
    });
  } catch {
    // 非组件上下文
  }

  return s;
}
