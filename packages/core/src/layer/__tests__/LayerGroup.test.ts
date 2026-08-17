import { describe, it, expect, vi } from 'vitest'
import { Viewer, ImageryLayer } from 'cesium'
import type { ImageryProvider } from 'cesium'
import { LayerGroup } from '../LayerGroup'
import { BaseLayer } from '../BaseLayer'
import { EventBus } from '../../event'
import type { BaseLayerOptions } from '../../type'

vi.mock('cesium')

/** 最小图层子类：zIndex 可控，生命周期方法为 spy */
class FakeLayer extends BaseLayer {
  readonly type = 'fake'
  private _z?: number
  addToMap = vi.fn()
  removeFromMap = vi.fn()
  _updateShow = vi.fn()

  constructor(options: BaseLayerOptions & { zIndex?: number } = {}) {
    super(options)
    this._z = options.zIndex
  }

  get zIndex(): number | undefined {
    return this._z
  }
}

/** 仿瓦片图层：addToMap 时往 viewer.imageryLayers 挂真实（mock 集合内）ImageryLayer，供堆叠断言 */
class FakeTileLayer extends BaseLayer {
  readonly type = 'fake-tile'
  private _z?: number
  private _imageryLayer?: ImageryLayer
  removeFromMap = vi.fn(() => {
    if (this._imageryLayer && this._viewer) {
      this._viewer.imageryLayers.remove(this._imageryLayer)
      this._imageryLayer = undefined
    }
  })
  _updateShow = vi.fn()

  constructor(options: BaseLayerOptions & { zIndex?: number } = {}) {
    super(options)
    this._z = options.zIndex
  }

  get zIndex(): number | undefined {
    return this._z
  }

  get layer(): ImageryLayer | undefined {
    return this._imageryLayer
  }

  addToMap(): void {
    this._imageryLayer = this._viewer!.imageryLayers.addImageryProvider(
      {} as unknown as ImageryProvider,
    )
  }
}

function makeViewer() {
  return new Viewer('div-id')
}

/** 构造一个已 bind 的 LayerGroup（晚期绑定：addLayer 时由 LayerManager 经 _bind 注入） */
function makeBoundGroup(id = 'group-1', options: BaseLayerOptions = {}) {
  const group = new LayerGroup({ id, ...options })
  const viewer = makeViewer()
  const eventBus = new EventBus()
  group._bind(viewer, eventBus)
  return { group, viewer, eventBus }
}

describe('LayerGroup', () => {
  it('是一种 BaseLayer，type 为 group，id 透传，hasOpacity/hasZIndex 为 false', () => {
    const group = new LayerGroup({ id: 'g-1' })
    expect(group).toBeInstanceOf(BaseLayer)
    expect(group.type).toBe('group')
    expect(group.id).toBe('g-1')
    expect(group.show).toBe(true)
    expect(group.hasOpacity).toBe(false)
    expect(group.hasZIndex).toBe(false)
    expect(group.zIndex).toBeUndefined()
    expect(group.destroyed).toBe(false)
  })

  it('未挂载组 addLayer 只登记：成员不 bind / addToMap，返回 this 链式', () => {
    const group = new LayerGroup({ id: 'g-1' })
    const m1 = new FakeLayer({ id: 'm1' })
    const m2 = new FakeLayer({ id: 'm2' })
    const ret = group.addLayer(m1).addLayer(m2)
    expect(ret).toBe(group)
    expect(m1.addToMap).not.toHaveBeenCalled()
    expect(m2.addToMap).not.toHaveBeenCalled()
    expect(group.hasLayer('m1')).toBe(true)
    expect(group.getAllLayers()).toEqual([m1, m2])
  })

  it('重复成员 id 抛错；不能把组自身加为成员', () => {
    const group = new LayerGroup({ id: 'g-1' })
    group.addLayer(new FakeLayer({ id: 'm1' }))
    expect(() => group.addLayer(new FakeLayer({ id: 'm1' }))).toThrow(/id 重复/)
    expect(() => group.addLayer(group)).toThrow(/组自身/)
  })

  it('先建组后挂载：按展示顺序 bind + addToMap 成员（zIndex 升序，同层级按数据顺序），逐个 emit layer:added，且重复 addToMap 幂等', () => {
    // 未挂载组装（baseLayers 初始化主流程）
    const group = new LayerGroup({ id: 'g-1' })
    const order: string[] = []
    const mk = (id: string, zIndex?: number) => {
      const m = new FakeLayer({ id, zIndex })
      m.addToMap = vi.fn(() => {
        order.push(id)
      })
      return m
    }
    const a = mk('a', 1)
    const b = mk('b') // 未声明 zIndex 按 0
    const c = mk('c', 1) // 与 a 同层级，加入在后
    group.addLayer(a).addLayer(b).addLayer(c)
    expect(order).toEqual([]) // 未挂载前不 addToMap

    const viewer = makeViewer()
    const eventBus = new EventBus()
    const addedHandler = vi.fn()
    eventBus.on('layer:added', addedHandler)
    group._bind(viewer, eventBus)
    group.addToMap()

    expect(order).toEqual(['b', 'a', 'c'])
    expect(addedHandler).toHaveBeenCalledTimes(3)
    expect(addedHandler.mock.calls.map((call) => call[0].layer.id)).toEqual(['b', 'a', 'c'])
    expect(group.isAdded).toBe(true)

    // 重复 addToMap 不重复挂载成员
    group.addToMap()
    expect(order).toEqual(['b', 'a', 'c'])
    expect(addedHandler).toHaveBeenCalledTimes(3)
  })

  it('getAllLayers / eachLayer 恒按展示顺序（zIndex 升序 + 数据顺序）', () => {
    const group = new LayerGroup({ id: 'g-1' })
    const m1 = new FakeLayer({ id: 'm1', zIndex: 2 })
    const m2 = new FakeLayer({ id: 'm2', zIndex: 0 })
    const m3 = new FakeLayer({ id: 'm3', zIndex: 2 })
    group.addLayer(m1).addLayer(m2).addLayer(m3)
    expect(group.getAllLayers().map((l) => l.id)).toEqual(['m2', 'm1', 'm3'])
    const seen: string[] = []
    const ret = group.eachLayer((layer, index) => {
      seen.push(`${index}:${layer.id}`)
    })
    expect(ret).toBe(group)
    expect(seen).toEqual(['0:m2', '1:m1', '2:m3'])
  })

  it('已挂载组增量 addLayer：立即挂载并按层级重排 ImageryLayer 堆叠', () => {
    const { group, viewer } = makeBoundGroup()
    const stack = (viewer.imageryLayers as unknown as { _stack: ImageryLayer[] })._stack
    const m1 = new FakeTileLayer({ id: 'm1', zIndex: 0 })
    const m2 = new FakeTileLayer({ id: 'm2', zIndex: 2 })
    group.addLayer(m1).addLayer(m2)
    expect(stack).toEqual([m1.layer, m2.layer])

    // 插入 zIndex=1 成员：应排到 m1 之上、m2 之下
    const m3 = new FakeTileLayer({ id: 'm3', zIndex: 1 })
    group.addLayer(m3)
    expect(stack).toEqual([m1.layer, m3.layer, m2.layer])

    // 插入最底层成员：应沉到 m1 之下
    const m0 = new FakeTileLayer({ id: 'm0', zIndex: -1 })
    group.addLayer(m0)
    expect(stack).toEqual([m0.layer, m1.layer, m3.layer, m2.layer])
  })

  it('show 级联：group.show 变化经成员 setter 同步并逐个 emit layer:showChanged', () => {
    const { group, eventBus } = makeBoundGroup('g-1')
    const m1 = new FakeLayer({ id: 'm1' })
    const m2 = new FakeLayer({ id: 'm2', show: false })
    group.addLayer(m1).addLayer(m2)
    group.addToMap()

    const handler = vi.fn()
    eventBus.on('layer:showChanged', handler)
    group.show = false

    expect(m1.show).toBe(false)
    expect(m1._updateShow).toHaveBeenLastCalledWith(false)
    // m2 本就是 false：仅挂载时的 bind 初始同步一次，级联时被 setter 去重，不再调用
    expect(m2._updateShow).toHaveBeenCalledTimes(1)
    // 事件：组自身 1 次 + m1 1 次（m2 去重无事件）
    expect(handler).toHaveBeenCalledTimes(2)
    expect(handler).toHaveBeenCalledWith({ layerId: 'g-1', show: false })
    expect(handler).toHaveBeenCalledWith({ layerId: 'm1', show: false })
  })

  it('组隐藏时新加成员初始即为隐藏（先挂载后加 / 先加后挂载两种时序）', () => {
    // 时序①：组已挂载，增量加成员
    const bound = makeBoundGroup('g-1')
    bound.group.show = false
    const m1 = new FakeLayer({ id: 'm1' })
    bound.group.addLayer(m1)
    expect(m1.show).toBe(false)
    expect(m1._updateShow).toHaveBeenLastCalledWith(false)

    // 时序②：组未挂载时先加成员，整体挂载后仍保持隐藏
    const group2 = new LayerGroup({ id: 'g-2', show: false })
    const m2 = new FakeLayer({ id: 'm2' })
    group2.addLayer(m2)
    const viewer = makeViewer()
    const eventBus = new EventBus()
    group2._bind(viewer, eventBus)
    group2.addToMap()
    expect(m2.show).toBe(false)
    expect(m2._updateShow).toHaveBeenLastCalledWith(false)
  })

  it('removeFromMap 级联成员 removeFromMap', () => {
    const { group } = makeBoundGroup()
    const m1 = new FakeLayer({ id: 'm1' })
    group.addLayer(m1)
    group.addToMap()
    group.removeFromMap()
    expect(m1.removeFromMap).toHaveBeenCalledTimes(1)
  })

  it('removeLayer 销毁成员、emit layer:removed，返回 this；未知 id 静默返回', () => {
    const { group, eventBus } = makeBoundGroup()
    const m1 = new FakeLayer({ id: 'm1' })
    group.addLayer(m1)
    group.addToMap()
    const handler = vi.fn()
    eventBus.on('layer:removed', handler)
    const ret = group.removeLayer('m1')
    expect(ret).toBe(group)
    expect(m1.destroyed).toBe(true)
    expect(group.hasLayer('m1')).toBe(false)
    expect(handler).toHaveBeenCalledWith({ layerId: 'm1' })
    expect(group.removeLayer('nope')).toBe(group)
  })

  it('destroy 级联销毁成员且幂等', () => {
    const { group } = makeBoundGroup()
    const m1 = new FakeLayer({ id: 'm1' })
    const m2 = new FakeLayer({ id: 'm2' })
    group.addLayer(m1).addLayer(m2)
    group.addToMap()
    group.destroy()
    expect(group.destroyed).toBe(true)
    expect(m1.destroyed).toBe(true)
    expect(m2.destroyed).toBe(true)
    expect(() => group.destroy()).not.toThrow()
  })
})
