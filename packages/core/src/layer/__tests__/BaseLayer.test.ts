import { describe, it, expect, vi } from 'vitest'
import { Viewer } from 'cesium'
import { BaseLayer } from '../BaseLayer'
import { EventBus } from '../../event'

vi.mock('cesium')

class FakeLayer extends BaseLayer {
  readonly type = 'fake'
  addToMap = vi.fn()
  removeFromMap = vi.fn()
  _updateShow = vi.fn()
}

function setup() {
  const viewer = new Viewer('div-id')
  const eventBus = new EventBus()
  const layer = new FakeLayer('layer-1', viewer, eventBus)
  return { viewer, eventBus, layer }
}

describe('BaseLayer', () => {
  it('构造注入 id/viewer/eventBus，默认 show=true、destroyed=false', () => {
    const { layer } = setup()
    expect(layer.id).toBe('layer-1')
    expect(layer.type).toBe('fake')
    expect(layer.show).toBe(true)
    expect(layer.destroyed).toBe(false)
  })

  it('show 赋相同值不去重触发：不调用 _updateShow、不 emit', () => {
    const { layer, eventBus } = setup()
    const handler = vi.fn()
    eventBus.on('layer:showChanged', handler)
    layer.show = true
    expect(layer._updateShow).not.toHaveBeenCalled()
    expect(handler).not.toHaveBeenCalled()
  })

  it('show 变更调用 _updateShow 并 emit layer:showChanged', () => {
    const { layer, eventBus } = setup()
    const handler = vi.fn()
    eventBus.on('layer:showChanged', handler)
    layer.show = false
    expect(layer.show).toBe(false)
    expect(layer._updateShow).toHaveBeenCalledTimes(1)
    expect(layer._updateShow).toHaveBeenCalledWith(false)
    expect(handler).toHaveBeenCalledTimes(1)
    expect(handler).toHaveBeenCalledWith({ layerId: 'layer-1', show: false })
  })

  it('destroy 调用 removeFromMap 并置 destroyed', () => {
    const { layer } = setup()
    layer.destroy()
    expect(layer.destroyed).toBe(true)
    expect(layer.removeFromMap).toHaveBeenCalledTimes(1)
  })

  it('二次 destroy 无副作用（幂等）', () => {
    const { layer } = setup()
    layer.destroy()
    layer.destroy()
    expect(layer.removeFromMap).toHaveBeenCalledTimes(1)
    expect(layer.destroyed).toBe(true)
  })
})
