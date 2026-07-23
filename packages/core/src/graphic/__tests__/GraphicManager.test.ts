import { describe, it, expect, vi } from 'vitest'
import { Viewer } from 'cesium'
import { Map3D } from '../../map'
import { BaseGraphic } from '../BaseGraphic'
import { GraphicManager } from '../GraphicManager'

vi.mock('cesium')

class FakeGraphic extends BaseGraphic {
  readonly type = 'fake'
  addToMap = vi.fn()
  removeFromMap = vi.fn()
  _updateShow = vi.fn()
}

function setup() {
  const map = new Map3D({ container: 'map-container', cesiumBaseUrl: '/cesium' })
  const manager = new GraphicManager(map)
  const viewer = map.viewer as Viewer
  const makeGraphic = (id: string) => new FakeGraphic(id, viewer, map.eventBus, {})
  return { map, manager, makeGraphic }
}

describe('GraphicManager', () => {
  it('addGraphic 调用 graphic.addToMap 并 emit graphic:added，返回 this 链式', () => {
    const { map, manager, makeGraphic } = setup()
    const handler = vi.fn()
    map.eventBus.on('graphic:added', handler)
    const graphic = makeGraphic('g1')
    const ret = manager.addGraphic(graphic)
    expect(ret).toBe(manager)
    expect(graphic.addToMap).toHaveBeenCalledTimes(1)
    expect(handler).toHaveBeenCalledTimes(1)
    expect(handler).toHaveBeenCalledWith({ graphic })
  })

  it('removeGraphic 调用 graphic.destroy 并 emit graphic:removed，返回 this', () => {
    const { map, manager, makeGraphic } = setup()
    const handler = vi.fn()
    map.eventBus.on('graphic:removed', handler)
    const graphic = makeGraphic('g1')
    manager.addGraphic(graphic)
    const ret = manager.removeGraphic('g1')
    expect(ret).toBe(manager)
    expect(graphic.destroyed).toBe(true)
    expect(handler).toHaveBeenCalledTimes(1)
    expect(handler).toHaveBeenCalledWith({ graphicId: 'g1' })
    expect(manager.hasGraphic('g1')).toBe(false)
  })

  it('removeGraphic 不存在的 id 静默返回 this', () => {
    const { manager } = setup()
    expect(manager.removeGraphic('nope')).toBe(manager)
  })

  it('getGraphic / hasGraphic / getAllGraphics', () => {
    const { manager, makeGraphic } = setup()
    const g1 = makeGraphic('g1')
    const g2 = makeGraphic('g2')
    manager.addGraphic(g1).addGraphic(g2)
    expect(manager.getGraphic('g1')).toBe(g1)
    expect(manager.getGraphic('nope')).toBeUndefined()
    expect(manager.hasGraphic('g2')).toBe(true)
    expect(manager.getAllGraphics()).toEqual([g1, g2])
  })

  it('重复 add 同 id 抛错，且不再调用 addToMap', () => {
    const { manager, makeGraphic } = setup()
    const graphic = makeGraphic('g1')
    manager.addGraphic(graphic)
    expect(() => manager.addGraphic(graphic)).toThrow(/g1/)
    expect(graphic.addToMap).toHaveBeenCalledTimes(1)
  })

  it('init 为空实现不报错', () => {
    const { manager } = setup()
    expect(() => manager.init()).not.toThrow()
  })

  it('destroy 同步销毁全部 graphic，幂等', () => {
    const { manager, makeGraphic } = setup()
    const g1 = makeGraphic('g1')
    const g2 = makeGraphic('g2')
    manager.addGraphic(g1).addGraphic(g2)
    manager.destroy()
    expect(manager.destroyed).toBe(true)
    expect(g1.destroyed).toBe(true)
    expect(g2.destroyed).toBe(true)
    expect(manager.getAllGraphics()).toEqual([])
    manager.destroy()
    expect(manager.destroyed).toBe(true)
  })
})
