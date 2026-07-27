import { describe, it, expect, vi } from 'vitest'
import { Viewer } from 'cesium'
import { BaseGraphic } from '../BaseGraphic'
import { EventBus } from '../../event'
import type { GraphicStyle, BaseGraphicOptions } from '../../type'

vi.mock('cesium')

interface DemoStyle extends GraphicStyle {
  color: string
  width: number
}

class FakeGraphic extends BaseGraphic<DemoStyle> {
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

const style: DemoStyle = { color: 'red', width: 2 }

describe('BaseGraphic 晚期绑定 + options 构造', () => {
  it('构造不碰 map：仅收 options，id 显式透传，style 必填透传', () => {
    const graphic = new FakeGraphic({ id: 'graphic-1', style })
    expect(graphic.id).toBe('graphic-1')
    expect(graphic.type).toBe('fake')
    expect(graphic.style).toBe(style)
    expect(graphic.style.color).toBe('red')
    expect(graphic.show).toBe(true)
    expect(graphic.destroyed).toBe(false)
  })

  it('id 缺省时自动生成（非空）', () => {
    const graphic = new FakeGraphic({ style })
    expect(typeof graphic.id).toBe('string')
    expect(graphic.id.length).toBeGreaterThan(0)
  })

  it('options.show 声明初始可见性', () => {
    const graphic = new FakeGraphic({ style: { ...style, show: false } })
    expect(graphic.show).toBe(false)
  })

  it('未 bind 时 show setter 抛错（依赖 eventBus）', () => {
    const graphic = new FakeGraphic({ style })
    expect(() => {
      graphic.show = false
    }).toThrow(/bind|绑定/i)
  })

  it('_bind 注入 viewer/eventBus/layerId，bind 后 show emit 带 layerId', () => {
    const viewer = makeViewer()
    const eventBus = makeEventBus()
    const graphic = new FakeGraphic({ id: 'graphic-1', style })
    graphic._bind(viewer, eventBus, 'layer-1')

    const handler = vi.fn()
    eventBus.on('graphic:showChanged', handler)
    graphic.show = false
    expect(graphic.show).toBe(false)
    expect(graphic._updateShow).toHaveBeenCalledWith(false)
    expect(handler).toHaveBeenCalledTimes(1)
    expect(handler).toHaveBeenCalledWith({
      layerId: 'layer-1',
      graphicId: 'graphic-1',
      show: false,
    })
  })

  it('show 赋相同值不去重触发', () => {
    const viewer = makeViewer()
    const eventBus = makeEventBus()
    const graphic = new FakeGraphic({ id: 'graphic-1', style })
    graphic._bind(viewer, eventBus, 'layer-1')

    const handler = vi.fn()
    eventBus.on('graphic:showChanged', handler)
    // 清除 _bind 时同步初始 show 的调用，仅观察 setter 去重行为
    graphic._updateShow.mockClear()
    graphic.show = true
    expect(graphic._updateShow).not.toHaveBeenCalled()
    expect(handler).not.toHaveBeenCalled()
  })

  it('双 map 守卫：已绑定到另一 viewer 时 _bind 抛错', () => {
    const viewer1 = makeViewer()
    const viewer2 = makeViewer()
    const eventBus = makeEventBus()
    const graphic = new FakeGraphic({ style })
    graphic._bind(viewer1, eventBus, 'layer-1')
    expect(() => graphic._bind(viewer2, eventBus, 'layer-1')).toThrow(/bind|绑定|已绑/i)
  })

  it('同 viewer 同 eventBus 二次 _bind 幂等', () => {
    const viewer = makeViewer()
    const eventBus = makeEventBus()
    const graphic = new FakeGraphic({ style })
    graphic._bind(viewer, eventBus, 'layer-1')
    expect(() => graphic._bind(viewer, eventBus, 'layer-1')).not.toThrow()
  })

  it('style.show 在 _bind 时同步一次（_updateShow 被调用）', () => {
    const viewer = makeViewer()
    const eventBus = makeEventBus()
    const graphic = new FakeGraphic({ style: { ...style, show: false } })
    graphic._bind(viewer, eventBus, 'layer-1')
    expect(graphic._updateShow).toHaveBeenCalledWith(false)
  })

  it('destroy 调用 removeFromMap 并置 destroyed', () => {
    const viewer = makeViewer()
    const eventBus = makeEventBus()
    const graphic = new FakeGraphic({ style })
    graphic._bind(viewer, eventBus, 'layer-1')
    graphic.destroy()
    expect(graphic.destroyed).toBe(true)
    expect(graphic.removeFromMap).toHaveBeenCalledTimes(1)
  })

  it('二次 destroy 无副作用（幂等）', () => {
    const viewer = makeViewer()
    const eventBus = makeEventBus()
    const graphic = new FakeGraphic({ style })
    graphic._bind(viewer, eventBus, 'layer-1')
    graphic.destroy()
    graphic.destroy()
    expect(graphic.removeFromMap).toHaveBeenCalledTimes(1)
    expect(graphic.destroyed).toBe(true)
  })

  it('构造签名符合 BaseGraphicOptions<TStyle> 类型', () => {
    const opts: BaseGraphicOptions<DemoStyle> = { id: 'typed', style }
    const graphic = new FakeGraphic(opts)
    expect(graphic.id).toBe('typed')
    expect(graphic.style).toBe(style)
  })
})
