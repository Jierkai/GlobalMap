import { describe, it, expect, vi } from 'vitest'
import { Viewer, Color } from 'cesium'
import { PrimitiveLayer } from '../PrimitiveLayer'
import { EventBus } from '../../event'
import { BaseGraphic } from '../../graphic'
import { PointPrimitive } from '../../primitive'
import type { GraphicStyle } from '../../type'

vi.mock('cesium')

class FakeGraphic extends BaseGraphic {
  readonly type = 'fake'
  _addToMap = vi.fn()
  _removeFromMap = vi.fn()
  _updateShow = vi.fn()
}

function makeViewer() {
  return new Viewer('div-id')
}

function makeEventBus() {
  return new EventBus()
}

const style: GraphicStyle = {}

/** 构造一个已 bind 的 PrimitiveLayer（晚期绑定：addLayer 时由 LayerManager 经 _bind 注入） */
function makeLayer(id = 'layer-1') {
  const layer = new PrimitiveLayer({ id })
  const viewer = makeViewer()
  const eventBus = makeEventBus()
  layer._bind(viewer, eventBus)
  return { layer, viewer, eventBus }
}

describe('PrimitiveLayer', () => {
  it('是一种 BaseLayer，type 为 primitive，id 透传', () => {
    const { layer } = makeLayer('layer-1')
    expect(layer.type).toBe('primitive')
    expect(layer.id).toBe('layer-1')
    expect(layer.show).toBe(true)
    expect(layer.destroyed).toBe(false)
  })

  it('无 ImageryLayer 实体：hasOpacity / hasZIndex 为 false，addToMap 为 noop', () => {
    const { layer } = makeLayer()
    expect(layer.hasOpacity).toBe(false)
    expect(layer.hasZIndex).toBe(false)
    expect(() => layer.addToMap()).not.toThrow()
  })

  it('addGraphic 经 _bind 注入 layerId、调用 graphic._addToMap、emit graphic:added，返回 this 链式', () => {
    const { layer, eventBus } = makeLayer()
    const handler = vi.fn()
    eventBus.on('graphic:added', handler)
    const graphic = new FakeGraphic({ id: 'g1', style })
    const ret = layer.addGraphic(graphic)
    expect(ret).toBe(layer)
    expect(graphic._addToMap).toHaveBeenCalledTimes(1)
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
    expect(graphic._addToMap).toHaveBeenCalledTimes(1)
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

  it('未 bind 时 addGraphic 不抛错（离线组装：仅登记缓存，挂载时统一上屏）', () => {
    const layer = new PrimitiveLayer({ id: 'layer-1' })
    const graphic = new FakeGraphic({ id: 'g1', style })
    expect(() => layer.addGraphic(graphic)).not.toThrow()
    expect(layer.hasGraphic('g1')).toBe(true)
    expect(graphic._addToMap).not.toHaveBeenCalled()
  })

  it('离线组装：未 bind 时 addGraphic 缓存，addLayer 挂载后统一 bind + 上屏 + emit graphic:added', () => {
    const layer = new PrimitiveLayer({ id: 'layer-1' })
    const g1 = new FakeGraphic({ id: 'g1', style })
    const g2 = new FakeGraphic({ id: 'g2', style })
    layer.addGraphic(g1).addGraphic(g2)
    expect(g1._addToMap).not.toHaveBeenCalled()

    // 模拟 addLayer：LayerManager 顺序 _bind -> addToMap
    const viewer = makeViewer()
    const eventBus = makeEventBus()
    const handler = vi.fn()
    eventBus.on('graphic:added', handler)
    layer._bind(viewer, eventBus)
    layer.addToMap()

    expect(g1._addToMap).toHaveBeenCalledTimes(1)
    expect(g2._addToMap).toHaveBeenCalledTimes(1)
    expect(handler).toHaveBeenCalledTimes(2)
    expect(handler).toHaveBeenNthCalledWith(1, { layerId: 'layer-1', graphic: g1 })
  })

  it('共享点集合：多个点图元复用同一 PointPrimitiveCollection，removeGraphic 只删自己的点', () => {
    const { layer, viewer } = makeLayer()
    const p1 = new PointPrimitive({ id: 'p1', position: [116.1, 39.1] })
    const p2 = new PointPrimitive({ id: 'p2', position: [116.4, 39.9] })
    layer.addGraphic(p1).addGraphic(p2)

    const primitives = (viewer.scene as unknown as { primitives: { _items: unknown[] } }).primitives
    // 两个点 -> 仅 1 个共享集合（一个 draw call）
    expect(primitives._items).toHaveLength(1)
    const collection = primitives._items[0] as { _all: unknown[] }
    expect(collection._all).toHaveLength(2)

    // 移除 p1：只删自己的点，p2 与集合不受影响
    layer.removeGraphic('p1')
    expect(primitives._items).toHaveLength(1)
    expect(collection._all).toHaveLength(1)

    // 移除 p2：最后一个点释放后集合卸载
    layer.removeGraphic('p2')
    expect(primitives._items).toHaveLength(0)
  })

  it('端到端：点图元经 PrimitiveLayer 挂载后进入 viewer.scene.primitives（图元不可直连 map）', () => {
    const { layer, viewer } = makeLayer()
    const point = new PointPrimitive({
      id: 'p1',
      position: [116.4, 39.9],
      style: { color: Color.RED },
    })
    layer.addGraphic(point)
    const primitives = (viewer.scene as unknown as { primitives: { _items: unknown[] } }).primitives
    expect(primitives._items).toHaveLength(1)

    layer.removeGraphic('p1')
    expect(primitives._items).toHaveLength(0)
  })
})
