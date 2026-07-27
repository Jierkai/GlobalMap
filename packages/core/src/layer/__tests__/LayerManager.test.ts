import { describe, it, expect, vi } from 'vitest'
import { Map3D } from '../../map'
import { BaseLayer } from '../BaseLayer'
import { LayerManager } from '../LayerManager'

vi.mock('cesium')

class FakeLayer extends BaseLayer {
  readonly type = 'fake'
  addToMap = vi.fn()
  removeFromMap = vi.fn()
  _updateShow = vi.fn()
}

function setup() {
  const map = new Map3D({ container: 'map-container', cesiumBaseUrl: '/cesium' })
  const manager = new LayerManager(map)
  // 晚期绑定：构造只收 options，viewer/eventBus 在 addLayer 时由 LayerManager 经 _bind 注入
  const makeLayer = (id: string) => new FakeLayer({ id })
  return { map, manager, makeLayer }
}

describe('LayerManager', () => {
  it('addLayer 经 _bind 注入 viewer/eventBus、调用 layer.addToMap 并 emit layer:added，返回 this 链式', () => {
    const { map, manager, makeLayer } = setup()
    const handler = vi.fn()
    map.eventBus.on('layer:added', handler)
    const layer = makeLayer('l1')
    const ret = manager.addLayer(layer)
    expect(ret).toBe(manager)
    expect(layer.addToMap).toHaveBeenCalledTimes(1)
    expect(handler).toHaveBeenCalledTimes(1)
    expect(handler).toHaveBeenCalledWith({ layer })
  })

  it('removeLayer 调用 layer.destroy 并 emit layer:removed，返回 this', () => {
    const { map, manager, makeLayer } = setup()
    const handler = vi.fn()
    map.eventBus.on('layer:removed', handler)
    const layer = makeLayer('l1')
    manager.addLayer(layer)
    const ret = manager.removeLayer('l1')
    expect(ret).toBe(manager)
    expect(layer.destroyed).toBe(true)
    expect(handler).toHaveBeenCalledTimes(1)
    expect(handler).toHaveBeenCalledWith({ layerId: 'l1' })
    expect(manager.hasLayer('l1')).toBe(false)
  })

  it('removeLayer 不存在的 id 静默返回 this', () => {
    const { manager } = setup()
    expect(manager.removeLayer('nope')).toBe(manager)
  })

  it('getLayer / hasLayer / getAllLayers', () => {
    const { manager, makeLayer } = setup()
    const l1 = makeLayer('l1')
    const l2 = makeLayer('l2')
    manager.addLayer(l1).addLayer(l2)
    expect(manager.getLayer('l1')).toBe(l1)
    expect(manager.getLayer('nope')).toBeUndefined()
    expect(manager.hasLayer('l2')).toBe(true)
    expect(manager.getAllLayers()).toEqual([l1, l2])
  })

  it('重复 add 同 id 抛错，且不再调用 addToMap', () => {
    const { manager, makeLayer } = setup()
    const layer = makeLayer('l1')
    manager.addLayer(layer)
    expect(() => manager.addLayer(layer)).toThrow(/l1/)
    expect(layer.addToMap).toHaveBeenCalledTimes(1)
  })

  it('init 为空实现不报错', () => {
    const { manager } = setup()
    expect(() => manager.init()).not.toThrow()
  })

  it('destroy 同步销毁全部 layer，幂等', () => {
    const { manager, makeLayer } = setup()
    const l1 = makeLayer('l1')
    const l2 = makeLayer('l2')
    manager.addLayer(l1).addLayer(l2)
    manager.destroy()
    expect(manager.destroyed).toBe(true)
    expect(l1.destroyed).toBe(true)
    expect(l2.destroyed).toBe(true)
    expect(manager.getAllLayers()).toEqual([])
    manager.destroy()
    expect(manager.destroyed).toBe(true)
  })
})
