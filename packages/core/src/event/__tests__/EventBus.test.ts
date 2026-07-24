import { describe, it, expect, vi } from 'vitest'
import { EventBus } from '../EventBus'

describe('EventBus', () => {
  it('on 订阅后 emit 触发 handler 并传入负载', () => {
    const bus = new EventBus()
    const handler = vi.fn()
    bus.on('measure:completed', handler)
    const payload = { result: { type: 'distance', value: 100, text: '100 m' } }
    bus.emit('measure:completed', payload)
    expect(handler).toHaveBeenCalledTimes(1)
    expect(handler).toHaveBeenCalledWith(payload)
  })

  it('on 返回取消订阅函数，调用后不再触发', () => {
    const bus = new EventBus()
    const handler = vi.fn()
    const off = bus.on('layer:showChanged', handler)
    bus.emit('layer:showChanged', { layerId: 'l1', show: false })
    off()
    bus.emit('layer:showChanged', { layerId: 'l1', show: true })
    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('once 只触发一次', () => {
    const bus = new EventBus()
    const handler = vi.fn()
    bus.once('map3d:destroyed', handler)
    bus.emit('map3d:destroyed')
    bus.emit('map3d:destroyed')
    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('off 移除指定 handler，其余 handler 不受影响', () => {
    const bus = new EventBus()
    const h1 = vi.fn()
    const h2 = vi.fn()
    bus.on('graphic:removed', h1)
    bus.on('graphic:removed', h2)
    bus.off('graphic:removed', h1)
    bus.emit('graphic:removed', { graphicId: 'g1' })
    expect(h1).not.toHaveBeenCalled()
    expect(h2).toHaveBeenCalledTimes(1)
  })

  it('void 负载事件（map3d:ready）可无参 emit', () => {
    const bus = new EventBus()
    const handler = vi.fn()
    bus.on('map3d:ready', handler)
    bus.emit('map3d:ready')
    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('destroy 后 emit 静默无效，handler 不再触发', () => {
    const bus = new EventBus()
    const handler = vi.fn()
    bus.on('graphic:removed', handler)
    bus.destroy()
    bus.emit('graphic:removed', { graphicId: 'g1' })
    expect(handler).not.toHaveBeenCalled()
  })

  it('destroy 幂等，二次调用无副作用', () => {
    const bus = new EventBus()
    bus.destroy()
    expect(bus.destroyed).toBe(true)
    expect(() => bus.destroy()).not.toThrow()
    expect(bus.destroyed).toBe(true)
  })

  it('未订阅的事件 emit 不报错', () => {
    const bus = new EventBus()
    expect(() =>
      bus.emit('measure:completed', {
        result: { type: 'distance', value: 1, text: '1 m' },
      }),
    ).not.toThrow()
  })
})
