import type { Disposable, EventMap } from '../type'

type Handler<K extends keyof EventMap> = (payload: EventMap[K]) => void

/**
 * 强类型事件总线（设计文档 §5.4）。
 *
 * - 事件负载类型由 `EventMap` 约束，`void` 负载事件可无参 emit；
 * - `on` 返回取消订阅函数；
 * - `destroy()` 幂等，清空所有监听，此后 emit 静默无效。
 */
export class EventBus implements Disposable {
  private _destroyed = false
  private _handlers = new Map<keyof EventMap, Set<Handler<keyof EventMap>>>()

  get destroyed(): boolean {
    return this._destroyed
  }

  on<K extends keyof EventMap>(event: K, handler: Handler<K>): () => void {
    if (this._destroyed) return () => {}
    let set = this._handlers.get(event)
    if (!set) {
      set = new Set()
      this._handlers.set(event, set)
    }
    const h = handler as Handler<keyof EventMap>
    set.add(h)
    return () => this.off(event, handler)
  }

  once<K extends keyof EventMap>(event: K, handler: Handler<K>): void {
    const off = this.on(event, (payload: EventMap[K]) => {
      off()
      handler(payload)
    })
  }

  off<K extends keyof EventMap>(event: K, handler: Handler<K>): void {
    const set = this._handlers.get(event)
    if (!set) return
    set.delete(handler as Handler<keyof EventMap>)
    if (set.size === 0) this._handlers.delete(event)
  }

  emit<K extends keyof EventMap>(
    event: K,
    ...args: EventMap[K] extends void ? [] : [EventMap[K]]
  ): void {
    if (this._destroyed) return
    const set = this._handlers.get(event)
    if (!set) return
    const payload = args[0] as EventMap[K]
    // 复制快照，避免 handler 内 off/on 影响本次遍历
    for (const handler of [...set]) {
      ;(handler as Handler<K>)(payload)
    }
  }

  destroy(): void {
    if (this._destroyed) return
    this._destroyed = true
    this._handlers.clear()
  }
}
