/**
 * @fileoverview 指标总线模块
 * 提供轻量级的性能指标收集与订阅机制，支持计数器和仪表两种模式。
 *
 * @module MetricsBus
 */

/** 指标变化处理函数类型。 */
export type MetricsHandler = (name: string, value: number) => void;

/**
 * 指标总线，供适配器推送性能数据，供 VitalsHud 等订阅方消费。
 * 支持两种指标语义：
 * - 计数器（counter）：通过 {@link MetricsBus.record} 累加
 * - 仪表（gauge）：通过 {@link MetricsBus.set} 替换为最新值
 */
class MetricsBus {
  private readonly handlers = new Set<MetricsHandler>();
  private readonly values = new Map<string, number>();

  /** 通知所有已注册的处理函数。 */
  private notify(name: string, value: number): void {
    for (const handler of this.handlers) {
      handler(name, value);
    }
  }

  /**
   * 计数器：将指定指标累加 value（默认 +1）。
   * @param name 指标名称
   * @param value 累加量，默认为 1
   */
  record(name: string, value = 1): void {
    const prev = this.values.get(name) ?? 0;
    const next = prev + value;
    this.values.set(name, next);
    this.notify(name, next);
  }

  /**
   * 仪表：将指定指标替换为最新值（适用于命中率等比率指标）。
   * @param name 指标名称
   * @param value 最新值
   */
  set(name: string, value: number): void {
    this.values.set(name, value);
    this.notify(name, value);
  }

  /** 返回当前所有指标的快照。 */
  snapshot(): Record<string, number> {
    return Object.fromEntries(this.values);
  }

  /** 清空所有已记录的指标值（不影响订阅者）。 */
  reset(): void {
    this.values.clear();
  }

  /**
   * 订阅指标变化事件。
   * @param handler 每次指标更新时调用的处理函数
   * @returns 取消订阅的函数
   */
  subscribe(handler: MetricsHandler): () => void {
    this.handlers.add(handler);
    return () => {
      this.handlers.delete(handler);
    };
  }
}

/** 全局单例指标总线。适配器向此推送数据，HUD 等组件订阅此数据。 */
export const metricsBus = new MetricsBus();
