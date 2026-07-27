import { describe, it, expect, vi } from 'vitest'
import { Viewer } from 'cesium'
import { GraphicLayer } from '../GraphicLayer'
import { EventBus } from '../../event'
import { BaseGraphic } from '../../graphic'
import type { GraphicStyle } from '../../type'

vi.mock('cesium')

class FakeGraphic extends BaseGraphic {
  readonly type = 'fake'
  addToMap = vi.fn()
  removeFromMap = vi.fn()
  _updateShow = vi.fn()
}

function makeViewer() {
  return new Viewer('div-id')
}

function makeEventBus() {
  return new EventBus()
}

const style: GraphicStyle = {}

/** 构造一个已 bind 的 GraphicLayer（晚期绑定：addLayer 时由 LayerManager 经 _bind 注入） */
function makeLayer(id = 'layer-1') {
  const layer = new GraphicLayer({ id })
  const viewer = makeViewer()
  const eventBus = makeEventBus()
  layer._bind(viewer, eventBus)
  return { layer, viewer, eventBus }
}

describe('GraphicLayer', () => {
  it('是一种 BaseLayer，type 为 graphic，id 透传', () => {
    const { layer } = makeLayer('layer-1')
    expect(layer.type).toBe('graphic')
    expect(layer.id).toBe('layer-1')
    expect(layer.show).toBe(true)
    expect(layer.destroyed).toBe(false)
  })

  it('addGraphic 经 _bind 注入 layerId、调用 graphic.addToMap、emit graphic:added，返回 this 链式', () => {
    const { layer, eventBus } = makeLayer()
    const handler = vi.fn()
    eventBus.on('graphic:added', handler)
    const graphic = new FakeGraphic({ id: 'g1', style })
    const ret = layer.addGraphic(graphic)
    expect(ret).toBe(layer)
    expect(graphic.addToMap).toHaveBeenCalledTimes(1)
    expect(handler).toHaveBeenCalledTimes(1)
    expect(handler).toHaveBeenCalledWith({ layerId: 'layer-1', graphic })
  })

  it('removeGraphic 调用 graphic.destroy、emit graphic:removed，返回 this', () => {
    const { layer, eventBus } = makeLayer()
    const handler = vi.fn()
    eventBus.on('graphic:removed', handler)
    const graphic = new FakeGraphic({ id: 'g1', style })
    layer.addGraphic(graphic)
    const ret = layer.removeGraphic('g1')
    expect(ret).toBe(layer)
    expect(graphic.destroyed).toBe(true)
    expect(handler).toHaveBeenCalledTimes(1)
    expect(handler).toHaveBeenCalledWith({ layerId: 'layer-1', graphicId: 'g1' })
    expect(layer.hasGraphic('g1')).toBe(false)
  })

  it('removeGraphic 不存在的 id 静默返回 this', () => {
    const { layer } = makeLayer()
    expect(layer.removeGraphic('nope')).toBe(layer)
  })

  it('getGraphic / hasGraphic / getAllGraphics', () => {
    const { layer } = makeLayer()
    const g1 = new FakeGraphic({ id: 'g1', style })
    const g2 = new FakeGraphic({ id: 'g2', style })
    layer.addGraphic(g1).addGraphic(g2)
    expect(layer.getGraphic('g1')).toBe(g1)
    expect(layer.getGraphic('nope')).toBeUndefined()
    expect(layer.hasGraphic('g2')).toBe(true)
    expect(layer.getAllGraphics()).toEqual([g1, g2])
  })

  it('重复 add 同 graphic id 抛错，且不再调用 addToMap', () => {
    const { layer } = makeLayer()
    const graphic = new FakeGraphic({ id: 'g1', style })
    layer.addGraphic(graphic)
    expect(() => layer.addGraphic(graphic)).toThrow(/g1/)
    expect(graphic.addToMap).toHaveBeenCalledTimes(1)
  })

  it('图层 show 级联组内图元 _updateShow', () => {
    const { layer } = makeLayer()
    const g1 = new FakeGraphic({ id: 'g1', style })
    const g2 = new FakeGraphic({ id: 'g2', style })
    layer.addGraphic(g1).addGraphic(g2)
    // 清除 addGraphic 时 _bind 同步初始 show 的调用，仅观察级联
    g1._updateShow.mockClear()
    g2._updateShow.mockClear()
    layer.show = false
    expect(g1._updateShow).toHaveBeenCalledWith(false)
    expect(g2._updateShow).toHaveBeenCalledWith(false)
  })

  it('destroy 级联销毁组内图元', () => {
    const { layer } = makeLayer()
    const g1 = new FakeGraphic({ id: 'g1', style })
    const g2 = new FakeGraphic({ id: 'g2', style })
    layer.addGraphic(g1).addGraphic(g2)
    layer.destroy()
    expect(layer.destroyed).toBe(true)
    expect(g1.destroyed).toBe(true)
    expect(g2.destroyed).toBe(true)
    expect(layer.getAllGraphics()).toEqual([])
  })

  it('destroy 幂等', () => {
    const { layer } = makeLayer()
    layer.destroy()
    layer.destroy()
    expect(layer.destroyed).toBe(true)
  })

  it('未 bind 时 addGraphic 抛错（依赖 viewer/eventBus）', () => {
    const layer = new GraphicLayer({ id: 'layer-1' })
    const graphic = new FakeGraphic({ id: 'g1', style })
    expect(() => layer.addGraphic(graphic)).toThrow(/bind|绑定/i)
  })
})
