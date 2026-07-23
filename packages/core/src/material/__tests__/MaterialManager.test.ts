import { describe, it, expect, vi } from 'vitest'
import { Map3D } from '../../map'
import { MaterialManager } from '../MaterialManager'

vi.mock('cesium')

describe('MaterialManager（空壳契约）', () => {
  it('map.material getter 存在且为 MaterialManager 实例', () => {
    const map = new Map3D({ container: 'map-container', cesiumBaseUrl: '/cesium' })
    expect(map.material).toBeInstanceOf(MaterialManager)
  })

  it('init 为空实现不报错', () => {
    const map = new Map3D({ container: 'map-container', cesiumBaseUrl: '/cesium' })
    expect(() => map.material.init()).not.toThrow()
  })

  it('destroy 置 destroyed 且幂等', () => {
    const map = new Map3D({ container: 'map-container', cesiumBaseUrl: '/cesium' })
    map.material.destroy()
    expect(map.material.destroyed).toBe(true)
    expect(() => map.material.destroy()).not.toThrow()
    expect(map.material.destroyed).toBe(true)
  })

  it('map.destroy 级联销毁 manager', () => {
    const map = new Map3D({ container: 'map-container', cesiumBaseUrl: '/cesium' })
    map.destroy()
    expect(map.material.destroyed).toBe(true)
  })
})
