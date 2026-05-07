/** 能够被调用以取消订阅事件处理函数的清理回调。 */
export type Off = () => void;

/**
 * 强类型事件派发器接口。
 * @template TEvents 映射事件名称到其携带参数类型的字典。
 */
export interface Emitter<TEvents extends object> {
  /** 订阅一个事件。 */
  on<K extends keyof TEvents>(event: K, handler: (payload: TEvents[K]) => void): Off;
  /** 订阅一个仅触发一次的事件。 */
  once<K extends keyof TEvents>(event: K, handler: (payload: TEvents[K]) => void): Off;
  /** 取消订阅一个事件。如果未提供处理函数，则清除该事件的所有监听器。 */
  off<K extends keyof TEvents>(event: K, handler?: (payload: TEvents[K]) => void): void;
  /** 触发一个事件并传递对应的载荷数据。 */
  emit<K extends keyof TEvents>(event: K, payload: TEvents[K]): void;
}

/**
 * 强类型事件派发器的具体实现。
 * 能够在单个监听器发生异常时隔离错误，避免阻塞其它监听器的执行。
 * @template TEvents 映射事件名称到其携带参数类型的字典。
 */
export class TypedEmitter<TEvents extends object> implements Emitter<TEvents> {
  private listeners: Map<keyof TEvents, Set<(payload: unknown) => void>> = new Map();

  on<K extends keyof TEvents>(event: K, handler: (payload: TEvents[K]) => void): Off {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler as (payload: unknown) => void);
    return () => this.off(event, handler);
  }

  once<K extends keyof TEvents>(event: K, handler: (payload: TEvents[K]) => void): Off {
    const onceHandler = (payload: TEvents[K]) => {
      this.off(event, onceHandler);
      handler(payload);
    };
    return this.on(event, onceHandler);
  }

  off<K extends keyof TEvents>(event: K, handler?: (payload: TEvents[K]) => void): void {
    if (!this.listeners.has(event)) return;
    if (handler) {
      this.listeners.get(event)!.delete(handler as (payload: unknown) => void);
    } else {
      this.listeners.get(event)!.clear();
    }
  }

  emit<K extends keyof TEvents>(event: K, payload: TEvents[K]): void {
    if (!this.listeners.has(event)) return;
    const handlers = Array.from(this.listeners.get(event)!);
    for (const handler of handlers) {
      try {
        handler(payload);
      } catch (err) {
        console.error(`Error in event listener for ${String(event)}:`, err);
      }
    }
  }
}
