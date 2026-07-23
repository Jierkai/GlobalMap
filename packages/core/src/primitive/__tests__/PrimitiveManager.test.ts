import { describe, it, expect, vi } from 'vitest'
import { Map3D } from '../../map'
import { PrimitiveManager } from '../PrimitiveManager'

vi.mock('cesium')

describe('PrimitiveManager（空壳契约）', () => {
  it('map.primitive getter 存在且为 PrimitiveManager 实例', () => {
    const map = new Map3D({ container: 'map-container', cesiumBaseUrl: '/cesium' })
    expect(map.primitive).toBeInstanceOf(PrimitiveManager)
  })

  it('init 为空实现不报错', () => {
    const map = new Map3D({ container: 'map-container', cesiumBaseUrl: '/cesium' })
    expect(() => map.primitive.init()).not.toThrow()
  })

  it('destroy 置 destroyed 且幂等', () => {
    const map = new Map3D({ container: 'map-container', cesiumBaseUrl: '/cesium' })
    map.primitive.destroy()
    expect(map.primitive.destroyed).toBe(true)
    expect(() => map.primitive.destroy()).not.toThrow()
    expect(map.primitive.destroyed).toBe(true)
  })

  it('map.destroy 级联销毁 manager', () => {
    const map = new Map3D({ container: 'map-container', cesiumBaseUrl: '/cesium' })
    map.destroy()
    expect(map.primitive.destroyed).toBe(true)
  })
})
