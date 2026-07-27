import { describe, it, expect, vi, afterEach } from 'vitest'
import { Map3D } from '../Map3D'
import { EventBus } from '../../event'
import { LayerManager } from '../../layer/LayerManager'
import { PrimitiveManager } from '../../primitive/PrimitiveManager'
import { PlotManager } from '../../plot/PlotManager'
import { MeasureManager } from '../../measure/MeasureManager'
import { RoamManager } from '../../roam/RoamManager'
import { EffectManager } from '../../effect/EffectManager'
import { MaterialManager } from '../../material/MaterialManager'
import { AnalyseManager } from '../../analyse/AnalyseManager'
import { TransformManager } from '../../transform/TransformManager'
import { ControlManager } from '../../control/ControlManager'
import { ResourceManager } from '../../resource/ResourceManager'
import { SceneManager } from '../../scene/SceneManager'

vi.mock('cesium')

/** 12 个域 Manager 的名称 → 原型映射（供 init 时序断言；图元归 GraphicLayer，无全局 GraphicManager） */
function map3dManagerProtos() {
  return {
    layer: LayerManager.prototype,
    primitive: PrimitiveManager.prototype,
    plot: PlotManager.prototype,
    measure: MeasureManager.prototype,
    roam: RoamManager.prototype,
    effect: EffectManager.prototype,
    material: MaterialManager.prototype,
    analyse: AnalyseManager.prototype,
    transform: TransformManager.prototype,
    control: ControlManager.prototype,
    resource: ResourceManager.prototype,
    scene: SceneManager.prototype,
  }
}

function createMap(cesiumBaseUrl = '/cesium') {
  return new Map3D({ container: 'map-container', cesiumBaseUrl })
}

afterEach(() => {
  vi.restoreAllMocks()
  delete (window as { CESIUM_BASE_URL?: string }).CESIUM_BASE_URL
})

describe('Map3D', () => {
  it('构造时经 setCesiumBaseUrl 设置 window.CESIUM_BASE_URL', () => {
    createMap('https://cdn.example.com/cesium/')
    expect((window as { CESIUM_BASE_URL?: string }).CESIUM_BASE_URL).toBe(
      'https://cdn.example.com/cesium/',
    )
  })

  it('Viewer 以 container 与 viewerOptions 创建', () => {
    const map = new Map3D({
      container: 'map-container',
      cesiumBaseUrl: '/cesium',
      viewerOptions: { animation: false },
    })
    expect(map.viewer.container).toBe('map-container')
    // viewer 经 mock 创建，实例上记录了构造 options
    expect((map.viewer as unknown as { options: Record<string, unknown> }).options).toEqual({
      animation: false,
    })
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

  it('12 个域 getter 全部存在（无 graphic；图元归 GraphicLayer）', () => {
    const map = createMap()
    const getters = [
      'layer',
      'primitive',
      'plot',
      'measure',
      'roam',
      'effect',
      'material',
      'analyse',
      'transform',
      'control',
      'resource',
      'scene',
    ] as const
    for (const key of getters) {
      expect(map[key], `map.${key} 应存在`).toBeDefined()
      expect(typeof map[key].init).toBe('function')
      expect(typeof map[key].destroy).toBe('function')
    }
    // 图元不再有全局 Manager
    expect((map as unknown as { graphic?: unknown }).graphic).toBeUndefined()
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
    expect(initLog).toHaveLength(12)
    // ready 触发点之前必须已完成 12 次 init
    const readyCallOrder = emitSpy.mock.invocationCallOrder[0]
    expect(emitSpy.mock.calls[0][0]).toBe('map3d:ready')
    for (const proto of Object.values(protoSources)) {
      const spy = proto.init as ReturnType<typeof vi.fn>
      expect(spy.mock.invocationCallOrder[0]).toBeLessThan(readyCallOrder)
    }
  })
})
