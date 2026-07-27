import { describe, it, expect, vi } from 'vitest'
import { Viewer } from 'cesium'
import { BaseLayer } from '../BaseLayer'
import { EventBus } from '../../event'
import type { BaseLayerOptions } from '../../type'

vi.mock('cesium')

class FakeLayer extends BaseLayer {
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

describe('BaseLayer 晚期绑定 + options 构造', () => {
  it('构造不碰 map：仅收 options，id 显式透传', () => {
    const layer = new FakeLayer({ id: 'layer-1' })
    expect(layer.id).toBe('layer-1')
    expect(layer.type).toBe('fake')
    expect(layer.show).toBe(true)
    expect(layer.destroyed).toBe(false)
  })

  it('id 缺省时自动生成（gm- 前缀或自定义前缀，非空）', () => {
    const layer = new FakeLayer({})
    expect(typeof layer.id).toBe('string')
    expect(layer.id.length).toBeGreaterThan(0)
  })

  it('options.show 声明初始可见性（构造后读取）', () => {
    const layer = new FakeLayer({ show: false })
    expect(layer.show).toBe(false)
  })

  it('未 bind 时 show setter 抛错（依赖 eventBus）', () => {
    const layer = new FakeLayer({})
    expect(() => {
      layer.show = false
    }).toThrow(/bind|绑定/i)
  })

  it('_bind 注入 viewer/eventBus，bind 后 show 正常联动 + emit', () => {
    const viewer = makeViewer()
    const eventBus = makeEventBus()
    const layer = new FakeLayer({ id: 'layer-1' })
    layer._bind(viewer, eventBus)

    const handler = vi.fn()
    eventBus.on('layer:showChanged', handler)
    layer.show = false
    expect(layer.show).toBe(false)
    expect(layer._updateShow).toHaveBeenCalledWith(false)
    expect(handler).toHaveBeenCalledTimes(1)
    expect(handler).toHaveBeenCalledWith({ layerId: 'layer-1', show: false })
  })

  it('show 赋相同值不去重触发：不调用 _updateShow、不 emit', () => {
    const viewer = makeViewer()
    const eventBus = makeEventBus()
    const layer = new FakeLayer({ id: 'layer-1' })
    layer._bind(viewer, eventBus)

    const handler = vi.fn()
    eventBus.on('layer:showChanged', handler)
    // 清除 _bind 时同步初始 show 的调用，仅观察 setter 去重行为
    layer._updateShow.mockClear()
    layer.show = true
    expect(layer._updateShow).not.toHaveBeenCalled()
    expect(handler).not.toHaveBeenCalled()
  })

  it('双 map 守卫：已绑定到另一 viewer 时 _bind 抛错', () => {
    const viewer1 = makeViewer()
    const viewer2 = makeViewer()
    const eventBus = makeEventBus()
    const layer = new FakeLayer({})
    layer._bind(viewer1, eventBus)
    expect(() => layer._bind(viewer2, eventBus)).toThrow(/bind|绑定|已绑/i)
  })

  it('同 viewer 同 eventBus 二次 _bind 幂等（不抛错）', () => {
    const viewer = makeViewer()
    const eventBus = makeEventBus()
    const layer = new FakeLayer({})
    layer._bind(viewer, eventBus)
    expect(() => layer._bind(viewer, eventBus)).not.toThrow()
  })

  it('options.show 在 _bind 时同步一次（_updateShow 被调用）', () => {
    const viewer = makeViewer()
    const eventBus = makeEventBus()
    const layer = new FakeLayer({ show: false })
    layer._bind(viewer, eventBus)
    // bind 时应同步初始 show=false 到 _updateShow
    expect(layer._updateShow).toHaveBeenCalledWith(false)
  })

  it('destroy 调用 removeFromMap 并置 destroyed', () => {
    const viewer = makeViewer()
    const eventBus = makeEventBus()
    const layer = new FakeLayer({})
    layer._bind(viewer, eventBus)
    layer.destroy()
    expect(layer.destroyed).toBe(true)
    expect(layer.removeFromMap).toHaveBeenCalledTimes(1)
  })

  it('二次 destroy 无副作用（幂等）', () => {
    const viewer = makeViewer()
    const eventBus = makeEventBus()
    const layer = new FakeLayer({})
    layer._bind(viewer, eventBus)
    layer.destroy()
    layer.destroy()
    expect(layer.removeFromMap).toHaveBeenCalledTimes(1)
    expect(layer.destroyed).toBe(true)
  })

  it('构造签名符合 BaseLayerOptions 类型', () => {
    const opts: BaseLayerOptions = { id: 'typed', show: true }
    const layer = new FakeLayer(opts)
    expect(layer.id).toBe('typed')
  })
})
