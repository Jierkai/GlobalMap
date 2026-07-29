import { describe, it, expect, vi, afterEach } from 'vitest'
import { Map3D } from '../Map3D'
import { EventBus } from '../../event'
import { LayerManager } from '../../layer/LayerManager'
import { GraphicLayer } from '../../layer/GraphicLayer'
import { BaseGraphic } from '../../graphic'
import { PlotManager } from '../../plot/PlotManager'
import { MeasureManager } from '../../measure/MeasureManager'
import { RoamManager } from '../../roam/RoamManager'
import { EffectManager } from '../../effect/EffectManager'
import { AnalyseManager } from '../../analyse/AnalyseManager'
import { ControlManager } from '../../control/ControlManager'
import { SceneManager } from '../../scene/SceneManager'
import type { GraphicStyle } from '../../type'

vi.mock('cesium')

/** 最小图元子类（供 GraphicLayer 级联销毁测试） */
class FakeGraphic extends BaseGraphic {
  readonly type = 'fake'
  addToMap = vi.fn()
  removeFromMap = vi.fn()
  _updateShow = vi.fn()
}
const fakeStyle: GraphicStyle = {}

/** 8 个域 Manager 的名称 -> 原型映射（供 init 时序断言；图元归 GraphicLayer，无全局 Graphic/PrimitiveManager；material/transform/resource 降级为工具函数，无 Manager） */
function map3dManagerProtos() {
  return {
    layer: LayerManager.prototype,
    plot: PlotManager.prototype,
    measure: MeasureManager.prototype,
    roam: RoamManager.prototype,
    effect: EffectManager.prototype,
    analyse: AnalyseManager.prototype,
    control: ControlManager.prototype,
    scene: SceneManager.prototype,
  }
}

function createMap() {
  return new Map3D({ container: 'map-container' })
}

afterEach(() => {
  vi.restoreAllMocks()
  delete (window as { CESIUM_BASE_URL?: string }).CESIUM_BASE_URL
})

describe('Map3D', () => {
  it('构造时经 resolveCesiumBaseUrl 自动识别并设置 window.CESIUM_BASE_URL', () => {
    // jsdom 环境无打包器插件注入、无 script 标签 -> 回退 /cesium
    createMap()
    expect((window as { CESIUM_BASE_URL?: string }).CESIUM_BASE_URL).toBe('/cesium')
  })

  it('window.CESIUM_BASE_URL 已设时（模拟打包器插件注入）构造后保持该值', () => {
    ;(window as { CESIUM_BASE_URL?: string }).CESIUM_BASE_URL = '/plugin/cesium'
    createMap()
    expect((window as { CESIUM_BASE_URL?: string }).CESIUM_BASE_URL).toBe('/plugin/cesium')
  })

  it('Viewer 以 container 与 viewerOptions 创建', () => {
    const map = new Map3D({
      container: 'map-container',
      viewerOptions: { animation: false },
    })
    expect(map.viewer.container).toBe('map-container')
    // viewer 经 mock 创建，实例上记录了构造 options
    // 注：未传 basemapsLayer 时自动添加兜底 baseLayer（OSM），仅验证 animation 字段
    const opts = (map.viewer as unknown as { options: Record<string, unknown> }).options
    expect(opts.animation).toBe(false)
  })

  it('map3d:ready 由构造触发，先 on 订阅的 listener 被调用一次', async () => {
    const map = createMap()
    const handler = vi.fn()
    // 外部消费者标准用法：new 之后同步订阅即可收到（微任务触发）
    map.eventBus.on('map3d:ready', handler)
    await Promise.resolve()
    expect(handler).toHaveBeenCalledTimes(1)
    // 不重复触发
    await Promise.resolve()
    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('map3d:ready 触发后再订阅不会收到（非持续状态）', async () => {
    const map = createMap()
    await Promise.resolve()
    const late = vi.fn()
    map.eventBus.on('map3d:ready', late)
    await Promise.resolve()
    expect(late).not.toHaveBeenCalled()
  })

  it('微任务触发前已 destroy 的地图不再 emit ready', async () => {
    const emitSpy = vi.spyOn(EventBus.prototype, 'emit')
    const map = createMap()
    map.destroy()
    await Promise.resolve()
    const readyCalls = emitSpy.mock.calls.filter((c) => c[0] === 'map3d:ready')
    expect(readyCalls).toHaveLength(0)
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

  it('8 个域 getter 全部存在（无 graphic/primitive/material/transform/resource；图元归 GraphicLayer，底层图元归 PrimitiveLayer，材质/坐标转换/资源加载降级为工具函数）', () => {
    const map = createMap()
    const getters = [
      'layer',
      'plot',
      'measure',
      'roam',
      'effect',
      'analyse',
      'control',
      'scene',
    ] as const
    for (const key of getters) {
      expect(map[key], `map.${key} 应存在`).toBeDefined()
      expect(typeof map[key].init).toBe('function')
      expect(typeof map[key].destroy).toBe('function')
    }
    // 图元/底层图元不再有全局 Manager（归 layer 域）
    expect((map as unknown as { graphic?: unknown }).graphic).toBeUndefined()
    expect((map as unknown as { primitive?: unknown }).primitive).toBeUndefined()
    // material/transform/resource 降级为工具函数，不再有 Manager
    expect((map as unknown as { material?: unknown }).material).toBeUndefined()
    expect((map as unknown as { transform?: unknown }).transform).toBeUndefined()
    expect((map as unknown as { resource?: unknown }).resource).toBeUndefined()
  })

  it('Map3DOptions 接受 layer/basemapsLayer 及各域占位配置（类型占位，运行时消费待图层域开发）', () => {
    const map = new Map3D({
      container: 'map-container',
      layer: [{ type: 'graphic', options: {} }],
      basemapsLayer: [{ type: 'osm', options: {}, name: 'OSM' }],
      plot: { bar: true },
      measure: { things: [] },
      roam: { speed: 10 },
      effect: { bloom: false },
      analyse: { viewshed: false },
      control: { widgets: true },
      scene: { sky: false },
    })
    expect(map.destroyed).toBe(false)
    map.destroy()
    expect(map.destroyed).toBe(true)
  })

  it('basemapsLayer 传入后 viewerOptions 含 imageryProviderViewModels + baseLayer', () => {
    const map = new Map3D({
      container: 'map-container',
      basemapsLayer: [
        { type: 'osm', options: {}, name: 'OpenStreetMap' },
        { type: 'arcgis', options: { url: 'https://example.com/tile/{z}/{y}/{x}', useTileTemplate: true }, name: 'ArcGIS' },
      ],
    })
    const opts = (map.viewer as unknown as { options: Record<string, unknown> }).options
    expect(opts.imageryProviderViewModels).toBeDefined()
    expect(Array.isArray(opts.imageryProviderViewModels)).toBe(true)
    expect((opts.imageryProviderViewModels as unknown[]).length).toBe(2)
    expect(opts.selectedImageryProviderViewModel).toBeDefined()
    expect(opts.baseLayer).toBeDefined()
    map.destroy()
  })

  it('basemapsLayer 首项作为默认底图', () => {
    const map = new Map3D({
      container: 'map-container',
      basemapsLayer: [
        { type: 'osm', options: {}, name: '首项底图' },
      ],
    })
    const opts = (map.viewer as unknown as { options: Record<string, unknown> }).options
    expect(opts.baseLayer).toBeDefined()
    map.destroy()
  })

  it('layer 配置项传入后各图层被 addLayer', () => {
    const map = new Map3D({
      container: 'map-container',
      layer: [
        { type: 'graphic', options: { id: 'gl-1' } },
      ],
    })
    expect(map.layer.hasLayer('gl-1')).toBe(true)
    map.destroy()
  })

  it('未传 basemapsLayer 且未配 baseLayer -> 兜底 OSM', () => {
    const map = new Map3D({ container: 'map-container' })
    const opts = (map.viewer as unknown as { options: Record<string, unknown> }).options
    expect(opts.baseLayer).toBeDefined()
    map.destroy()
  })

  it('map.destroy 级联销毁 GraphicLayer 及其组内图元（layer->graphic 级联）', () => {
    const map = createMap()
    const layer = new GraphicLayer({ id: 'gl-1' })
    const graphic = new FakeGraphic({ id: 'g1', style: fakeStyle })
    map.layer.addLayer(layer)
    layer.addGraphic(graphic)
    expect(map.layer.hasLayer('gl-1')).toBe(true)
    expect(layer.hasGraphic('g1')).toBe(true)
    map.destroy()
    expect(map.destroyed).toBe(true)
    expect(layer.destroyed).toBe(true)
    expect(graphic.destroyed).toBe(true)
  })

  it('map3d:ready 时序守护：触发时全部 Manager 的 init 均已执行', async () => {
    const initLog: string[] = []
    const protoSources = map3dManagerProtos()
    for (const [name, proto] of Object.entries(protoSources)) {
      vi.spyOn(proto, 'init').mockImplementation(() => {
        initLog.push(name)
      })
    }
    const emitSpy = vi.spyOn(EventBus.prototype, 'emit')
    createMap()
    await Promise.resolve()
    expect(initLog).toHaveLength(8)
    // ready 触发点之前必须已完成 8 次 init
    const readyCallOrder = emitSpy.mock.invocationCallOrder[0]
    expect(emitSpy.mock.calls[0][0]).toBe('map3d:ready')
    for (const proto of Object.values(protoSources)) {
      const spy = proto.init as ReturnType<typeof vi.fn>
      expect(spy.mock.invocationCallOrder[0]).toBeLessThan(readyCallOrder)
    }
  })
})
