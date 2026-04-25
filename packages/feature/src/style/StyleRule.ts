import { signal } from 'alien-signals';

/**
 * 带有条件判断的局部样式规则。
 * @template S 底层样式类型。
 */
export type StyleRule<S> = {
  /** 一个计算函数，用于决定该条规则中的样式是否应当应用。 */
  when: (ctx: Record<string, unknown>) => boolean;
  /** 如果 `when` 返回 true，则会被合并的部分样式。 */
  style: Partial<S>;
};

/**
 * 要素的样式系统 (StyleSystem)，提供基础样式以及动态条件规则计算能力。
 * @template S 底层样式类型。
 */
export interface StyleSystem<S> {
  /** 存储作为兜底基础样式的响应式信号。 */
  base: { (): S; (v: S): void };
  /** 存储所有需要被动态评估的样式规则列表的响应式信号。 */
  rules: { (): StyleRule<S>[]; (v: StyleRule<S>[]): void };
  /**
   * 基于传入的上下文环境进行条件计算，获取当前激活后的完整样式。
   * @param ctx 用于在规则计算中判断的上下文对象。
   * @returns 合并并且解析完成的最终样式对象。
   */
  evaluate(ctx: Record<string, unknown>): S;
  /**
   * 将局部样式合并至基础样式中。
   * 这个操作将触发响应式更新。
   * @param partial 要覆盖的部分样式属性。
   */
  patch(partial: Partial<S>): void;
}

/**
 * 创建一个新的响应式样式系统 (StyleSystem)。
 * @param initialBase 初始的基础样式配置。
 * @returns 全新的 StyleSystem 实例。
 */
export function createStyleSystem<S>(initialBase: S): StyleSystem<S> {
  const base = signal(initialBase);
  const rules = signal<StyleRule<S>[]>([]);

  return {
    base,
    rules,
    evaluate(ctx: Record<string, unknown>): S {
      let merged = { ...base() };
      for (const rule of rules()) {
        if (rule.when(ctx)) {
          merged = { ...merged, ...rule.style };
        }
      }
      return merged;
    },
    patch(partial: Partial<S>) {
      base({ ...base(), ...partial });
    }
  };
}
