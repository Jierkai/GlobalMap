import { describe, it, expect, vi, afterEach } from 'vitest'
import { Map3D } from '../Map3D'
import { EventBus } from '../../event'
import { LayerManager } from '../../layer/LayerManager'

vi.mock('cesium')

function createMap(cesiumBaseUrl = '/cesium') {
  return new Map3D({ container: 'map-container', cesiumBaseUrl })
}

afterEach(() => {
  vi.restoreAllMocks()
  delete (window as { CESIUM_BASE_URL?: string }).CESIUM_BASE_URL
})

describe('Map3D', () => {
  it('构造时经 setCesiumBaseUrl 设置 window.CESIUM_BASE_URL', () => {
    createMap('https://cdn.example.com/cesium/')
    expect((window as { CESIUM_BASE_URL?: string }).CESIUM_BASE_URL).toBe(
      'https://cdn.example.com/cesium/',
    )
  })

  it('Viewer 以 container 与 viewerOptions 创建', () => {
    const map = new Map3D({
      container: 'map-container',
      cesiumBaseUrl: '/cesium',
      viewerOptions: { animation: false },
    })
    expect(map.viewer.container).toBe('map-container')
    // viewer 经 mock 创建，实例上记录了构造 options
    expect((map.viewer as unknown as { options: Record<string, unknown> }).options).toEqual({
      animation: false,
    })
  })

  it('map3d:ready 在构造函数返回前已触发', () => {
    const emitSpy = vi.spyOn(EventBus.prototype, 'emit')
    const map = createMap()
    expect(emitSpy).toHaveBeenCalledWith('map3d:ready')
    // 构造完成后再订阅不会重复触发（证明非延迟触发）
    const late = vi.fn()
    map.eventBus.on('map3d:ready', late)
    expect(late).not.toHaveBeenCalled()
  })

  it('getter 暴露 viewer/eventBus/destroyed', () => {
    const map = createMap()
    expect(map.viewer).toBeDefined()
    expect(map.eventBus).toBeInstanceOf(EventBus)
    expect(map.destroyed).toBe(false)
  })

  it('destroy 逆序销毁：viewer 先于 eventBus', () => {
    const map = createMap()
    const order: string[] = []
    vi.spyOn(map.viewer, 'destroy').mockImplementation(() => {
      order.push('viewer')
    })
    vi.spyOn(map.eventBus, 'destroy').mockImplementation(() => {
      order.push('eventBus')
    })
    map.destroy()
    expect(order).toEqual(['viewer', 'eventBus'])
  })

  it('某个销毁回调抛错不阻断其余销毁', () => {
    const map = createMap()
    vi.spyOn(map.viewer, 'destroy').mockImplementation(() => {
      throw new Error('boom')
    })
    const destroyedHandler = vi.fn()
    map.eventBus.on('map3d:destroyed', destroyedHandler)
    expect(() => map.destroy()).not.toThrow()
    expect(destroyedHandler).toHaveBeenCalledTimes(1)
    expect(map.eventBus.destroyed).toBe(true)
    expect(map.destroyed).toBe(true)
  })

  it('二次 destroy 无操作（幂等）', () => {
    const map = createMap()
    const viewerDestroy = vi.spyOn(map.viewer, 'destroy')
    map.destroy()
    map.destroy()
    expect(viewerDestroy).toHaveBeenCalledTimes(1)
  })

  it('map3d:destroyed 在 eventBus 销毁前触发', () => {
    const map = createMap()
    const states: boolean[] = []
    map.eventBus.on('map3d:destroyed', () => {
      // 事件触发时 eventBus 应尚未销毁
      states.push(map.eventBus.destroyed)
    })
    map.destroy()
    expect(states).toEqual([false])
    expect(map.eventBus.destroyed).toBe(true)
  })

  it('map.layer 可访问 LayerManager 实例', () => {
    const map = createMap()
    expect(map.layer).toBeInstanceOf(LayerManager)
  })

  it('map.destroy 级联销毁 layer manager（先于 viewer）', () => {
    const map = createMap()
    const order: string[] = []
    vi.spyOn(map.layer, 'destroy').mockImplementation(() => {
      order.push('layer')
    })
    vi.spyOn(map.viewer, 'destroy').mockImplementation(() => {
      order.push('viewer')
    })
    map.destroy()
    expect(order).toEqual(['layer', 'viewer'])
  })
})
