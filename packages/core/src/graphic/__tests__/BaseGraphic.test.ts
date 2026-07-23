import { describe, it, expect, vi } from 'vitest'
import { Viewer } from 'cesium'
import { BaseGraphic } from '../BaseGraphic'
import { EventBus } from '../../event'
import type { GraphicStyle } from '../../type'

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

function setup() {
  const viewer = new Viewer('div-id')
  const eventBus = new EventBus()
  const style: DemoStyle = { color: 'red', width: 2, show: true }
  const graphic = new FakeGraphic('graphic-1', viewer, eventBus, style)
  return { viewer, eventBus, style, graphic }
}

describe('BaseGraphic', () => {
  it('构造注入 id/viewer/eventBus/style，泛型 style 原样透传', () => {
    const { graphic, style } = setup()
    expect(graphic.id).toBe('graphic-1')
    expect(graphic.type).toBe('fake')
    expect(graphic.style).toBe(style)
    expect(graphic.style.color).toBe('red')
    expect(graphic.style.width).toBe(2)
    expect(graphic.show).toBe(true)
    expect(graphic.destroyed).toBe(false)
  })

  it('show 赋相同值不去重触发：不调用 _updateShow、不 emit', () => {
    const { graphic, eventBus } = setup()
    const handler = vi.fn()
    eventBus.on('graphic:showChanged', handler)
    graphic.show = true
    expect(graphic._updateShow).not.toHaveBeenCalled()
    expect(handler).not.toHaveBeenCalled()
  })

  it('show 变更调用 _updateShow 并 emit graphic:showChanged', () => {
    const { graphic, eventBus } = setup()
    const handler = vi.fn()
    eventBus.on('graphic:showChanged', handler)
    graphic.show = false
    expect(graphic.show).toBe(false)
    expect(graphic._updateShow).toHaveBeenCalledTimes(1)
    expect(graphic._updateShow).toHaveBeenCalledWith(false)
    expect(handler).toHaveBeenCalledTimes(1)
    expect(handler).toHaveBeenCalledWith({ graphicId: 'graphic-1', show: false })
  })

  it('destroy 调用 removeFromMap 并置 destroyed', () => {
    const { graphic } = setup()
    graphic.destroy()
    expect(graphic.destroyed).toBe(true)
    expect(graphic.removeFromMap).toHaveBeenCalledTimes(1)
  })

  it('二次 destroy 无副作用（幂等）', () => {
    const { graphic } = setup()
    graphic.destroy()
    graphic.destroy()
    expect(graphic.removeFromMap).toHaveBeenCalledTimes(1)
    expect(graphic.destroyed).toBe(true)
  })
})
