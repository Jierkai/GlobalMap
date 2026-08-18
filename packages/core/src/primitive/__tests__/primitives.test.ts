import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  Viewer,
  Color,
  PointPrimitiveCollection,
  Primitive,
  GeometryInstance,
  PolylineGeometry,
  PolygonGeometry,
  PerInstanceColorAppearance,
  PolylineColorAppearance,
} from 'cesium'
import { PointPrimitive, PolylinePrimitive, PolygonPrimitive } from '../index'
import { PrimitiveLayer } from '../../layer'
import type { BaseGraphic } from '../../graphic'
import { EventBus } from '../../event'

vi.mock('cesium')

function makeViewer() {
  return new Viewer('div-id')
}

/** 已 bind 的图元（晚期绑定：addGraphic 时由 PrimitiveLayer 经 _bind 注入） */
function bind(graphic: BaseGraphic, mount = true) {
  const viewer = makeViewer()
  const eventBus = new EventBus()
  const layer = new PrimitiveLayer({ id: 'layer-1' })
  layer._bind(viewer, eventBus)
  if (mount) layer.addGraphic(graphic)
  return { viewer, eventBus, layer }
}

function scenePrimitives(viewer: Viewer) {
  return (viewer.scene as unknown as { primitives: { _items: unknown[] } }).primitives
}

/** mock PolylineGeometry 形状（mock 保留构造参数，与真实 Cesium 类型不同） */
interface MockPolylineGeometry {
  positions: { x: number; y: number; z: number }[]
  width?: number
  colors?: unknown[]
}

/** mock PolygonGeometry 形状（同上） */
interface MockPolygonGeometry {
  positions?: { x: number; y: number; z: number }[]
  height?: number
  extrudedHeight?: number
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('PointPrimitive（点图元）', () => {
  it('type=point，id 缺省自动生成，show 缺省 true', () => {
    const point = new PointPrimitive({ position: [116.4, 39.9] })
    expect(point.type).toBe('point')
    expect(point.id.length).toBeGreaterThan(0)
    expect(point.show).toBe(true)
    expect(point.destroyed).toBe(false)
  })

  it('_addToMap 创建 PointPrimitiveCollection 挂到 scene.primitives，点位参数正确', () => {
    const point = new PointPrimitive({
      position: [116.4, 39.9, 100],
      style: { pixelSize: 16, color: Color.RED, outlineColor: Color.BLUE, outlineWidth: 2 },
    })
    const { viewer } = bind(point)

    const primitives = scenePrimitives(viewer)
    expect(primitives._items).toHaveLength(1)
    const collection = primitives._items[0] as InstanceType<typeof PointPrimitiveCollection> & {
      _all: Record<string, unknown>[]
    }
    expect(collection).toBeInstanceOf(PointPrimitiveCollection)
    expect(collection._all).toHaveLength(1)

    const p = collection._all[0]
    const position = p.position as { x: number; y: number; z: number }
    expect(position.x).toBe(116.4)
    expect(position.y).toBe(39.9)
    expect(position.z).toBe(100)
    expect(p.pixelSize).toBe(16)
    expect(p.color).toBe(Color.RED)
    expect(p.outlineColor).toBe(Color.BLUE)
    expect(p.outlineWidth).toBe(2)
    expect(p.show).toBe(true)
  })

  it('样式缺省值：pixelSize=10 / color=WHITE / outlineColor=BLACK / outlineWidth=0 / height=0', () => {
    const point = new PointPrimitive({ position: [116.4, 39.9] })
    const { viewer } = bind(point)
    const collection = scenePrimitives(viewer)._items[0] as { _all: Record<string, unknown>[] }
    const p = collection._all[0]
    expect(p.pixelSize).toBe(10)
    expect(p.color).toBe(Color.WHITE)
    expect(p.outlineColor).toBe(Color.BLACK)
    expect(p.outlineWidth).toBe(0)
    expect((p.position as { z: number }).z).toBe(0)
  })

  it('style.show=false 初始值在 _addToMap 时同步（点初始即隐藏）', () => {
    const point = new PointPrimitive({ position: [116.4, 39.9], style: { show: false } })
    const { viewer } = bind(point)
    const collection = scenePrimitives(viewer)._items[0] as { _all: Record<string, unknown>[] }
    expect(collection._all[0].show).toBe(false)
  })

  it('_updateShow 切换底层点的 show', () => {
    const point = new PointPrimitive({ position: [116.4, 39.9] })
    const { viewer } = bind(point)
    const collection = scenePrimitives(viewer)._items[0] as { _all: { show: boolean }[] }
    point._updateShow(false)
    expect(collection._all[0].show).toBe(false)
    point._updateShow(true)
    expect(collection._all[0].show).toBe(true)
  })

  it('_removeFromMap 从 scene.primitives 移除集合，可再次 _addToMap 重新挂载', () => {
    const point = new PointPrimitive({ position: [116.4, 39.9] })
    const { viewer, layer } = bind(point)
    expect(scenePrimitives(viewer)._items).toHaveLength(1)
    point._removeFromMap()
    // 最后一个点移除后共享集合卸载
    expect(scenePrimitives(viewer)._items).toHaveLength(0)
    // 经图层重新挂载（不能直连 map）
    layer.addGraphic(new PointPrimitive({ position: [116.5, 39.8] }))
    expect(scenePrimitives(viewer)._items).toHaveLength(1)
  })

  it('destroy 幂等且移除底层对象', () => {
    const point = new PointPrimitive({ position: [116.4, 39.9] })
    const { viewer } = bind(point)
    point.destroy()
    point.destroy()
    expect(point.destroyed).toBe(true)
    expect(scenePrimitives(viewer)._items).toHaveLength(0)
  })

  it('未 bind（未经 PrimitiveLayer.addGraphic）直接 _addToMap 抛错', () => {
    const point = new PointPrimitive({ position: [116.4, 39.9] })
    expect(() => point._addToMap()).toThrow(/PrimitiveLayer|addGraphic/)
  })
})

describe('PolylinePrimitive（线图元）', () => {
  const positions: [number, number][] = [
    [116.1, 39.1],
    [116.2, 39.2],
    [116.3, 39.3],
  ]

  it('type=polyline，少于 2 个点抛错', () => {
    const line = new PolylinePrimitive({ positions })
    expect(line.type).toBe('polyline')
    expect(() => new PolylinePrimitive({ positions: [[116.1, 39.1]] })).toThrow(/2/)
  })

  it('_addToMap 创建 Primitive（PolylineGeometry + PolylineColorAppearance）挂到 scene.primitives', () => {
    const line = new PolylinePrimitive({ positions, style: { width: 5, color: Color.GREEN } })
    const { viewer } = bind(line)
    line._addToMap()

    const primitives = scenePrimitives(viewer)
    expect(primitives._items).toHaveLength(1)
    const primitive = primitives._items[0] as InstanceType<typeof Primitive>
    expect(primitive).toBeInstanceOf(Primitive)
    expect(primitive.show).toBe(true)
    expect(primitive.appearance).toBeInstanceOf(PolylineColorAppearance)

    const instance = primitive.geometryInstances as InstanceType<typeof GeometryInstance>
    expect(instance).toBeInstanceOf(GeometryInstance)
    expect(instance.geometry).toBeInstanceOf(PolylineGeometry)
    const geometry = instance.geometry as unknown as MockPolylineGeometry
    expect(geometry.positions).toHaveLength(3)
    expect(geometry.positions[0].x).toBe(116.1)
    expect(geometry.width).toBe(5)
    // 实色线：每段一个颜色（段数 = 点数 - 1）
    expect(geometry.colors).toHaveLength(2)
    expect(geometry.colors!.every((c: unknown) => c === Color.GREEN)).toBe(true)
  })

  it('样式缺省值：width=3 / color=WHITE', () => {
    const line = new PolylinePrimitive({ positions })
    const { viewer } = bind(line)
    line._addToMap()
    const primitive = scenePrimitives(viewer)._items[0] as InstanceType<typeof Primitive>
    const geometry = (primitive.geometryInstances as InstanceType<typeof GeometryInstance>)
      .geometry as unknown as MockPolylineGeometry
    expect(geometry.width).toBe(3)
    expect(geometry.colors!.every((c: unknown) => c === Color.WHITE)).toBe(true)
  })

  it('_updateShow 切换底层 Primitive.show', () => {
    const line = new PolylinePrimitive({ positions })
    const { viewer } = bind(line)
    line._addToMap()
    const primitive = scenePrimitives(viewer)._items[0] as InstanceType<typeof Primitive>
    line._updateShow(false)
    expect(primitive.show).toBe(false)
    line._updateShow(true)
    expect(primitive.show).toBe(true)
  })

  it('_removeFromMap / destroy 清理底层 Primitive', () => {
    const line = new PolylinePrimitive({ positions })
    const { viewer } = bind(line)
    line._addToMap()
    line._removeFromMap()
    expect(scenePrimitives(viewer)._items).toHaveLength(0)
    line.destroy()
    expect(line.destroyed).toBe(true)
  })

  it('未 bind 直接 _addToMap 抛错', () => {
    const line = new PolylinePrimitive({ positions })
    expect(() => line._addToMap()).toThrow(/PrimitiveLayer|addGraphic/)
  })
})

describe('PolygonPrimitive（面图元）', () => {
  const positions: [number, number][] = [
    [116.1, 39.1],
    [116.4, 39.1],
    [116.4, 39.4],
    [116.1, 39.4],
  ]

  it('type=polygon，少于 3 个点抛错', () => {
    const polygon = new PolygonPrimitive({ positions })
    expect(polygon.type).toBe('polygon')
    expect(
      () =>
        new PolygonPrimitive({
          positions: [
            [116.1, 39.1],
            [116.2, 39.2],
          ],
        }),
    ).toThrow(/3/)
  })

  it('_addToMap 创建 Primitive（PolygonGeometry.fromPositions + PerInstanceColorAppearance）', () => {
    const polygon = new PolygonPrimitive({
      positions,
      style: { color: Color.BLUE, height: 100, extrudedHeight: 500 },
    })
    const { viewer } = bind(polygon)
    polygon._addToMap()

    expect(PolygonGeometry.fromPositions).toHaveBeenCalledWith(
      expect.objectContaining({ height: 100, extrudedHeight: 500 }),
    )

    const primitive = scenePrimitives(viewer)._items[0] as InstanceType<typeof Primitive>
    expect(primitive).toBeInstanceOf(Primitive)
    expect(primitive.appearance).toBeInstanceOf(PerInstanceColorAppearance)

    const instance = primitive.geometryInstances as InstanceType<typeof GeometryInstance>
    expect(instance.geometry).toBeInstanceOf(PolygonGeometry)
    const geometry = instance.geometry as unknown as MockPolygonGeometry
    expect(geometry.positions).toHaveLength(4)
    expect(instance.attributes?.color).toBeDefined()
  })

  it('样式缺省值：height=0 / color=WHITE，extrudedHeight 缺省不传', () => {
    const polygon = new PolygonPrimitive({ positions })
    const { viewer } = bind(polygon)
    polygon._addToMap()
    const primitive = scenePrimitives(viewer)._items[0] as InstanceType<typeof Primitive>
    const geometry = (primitive.geometryInstances as InstanceType<typeof GeometryInstance>)
      .geometry as unknown as MockPolygonGeometry
    expect(geometry.height).toBe(0)
    expect(geometry.extrudedHeight).toBeUndefined()
    expect(PolygonGeometry.fromPositions).toHaveBeenCalledWith(
      expect.objectContaining({ height: 0 }),
    )
  })

  it('_updateShow 切换底层 Primitive.show；_removeFromMap 清理', () => {
    const polygon = new PolygonPrimitive({ positions })
    const { viewer } = bind(polygon)
    polygon._addToMap()
    const primitive = scenePrimitives(viewer)._items[0] as InstanceType<typeof Primitive>
    polygon._updateShow(false)
    expect(primitive.show).toBe(false)
    polygon._removeFromMap()
    expect(scenePrimitives(viewer)._items).toHaveLength(0)
  })

  it('未 bind 直接 _addToMap 抛错', () => {
    const polygon = new PolygonPrimitive({ positions })
    expect(() => polygon._addToMap()).toThrow(/PrimitiveLayer|addGraphic/)
  })
})
