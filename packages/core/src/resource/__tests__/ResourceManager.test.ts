import { describe, it, expect, vi } from 'vitest'
import { Map3D } from '../../map'
import { ResourceManager } from '../ResourceManager'

vi.mock('cesium')

describe('ResourceManager（空壳契约）', () => {
  it('map.resource getter 存在且为 ResourceManager 实例', () => {
    const map = new Map3D({ container: 'map-container', cesiumBaseUrl: '/cesium' })
    expect(map.resource).toBeInstanceOf(ResourceManager)
  })

  it('init 为空实现不报错', () => {
    const map = new Map3D({ container: 'map-container', cesiumBaseUrl: '/cesium' })
    expect(() => map.resource.init()).not.toThrow()
  })

  it('destroy 置 destroyed 且幂等', () => {
    const map = new Map3D({ container: 'map-container', cesiumBaseUrl: '/cesium' })
    map.resource.destroy()
    expect(map.resource.destroyed).toBe(true)
    expect(() => map.resource.destroy()).not.toThrow()
    expect(map.resource.destroyed).toBe(true)
  })

  it('map.destroy 级联销毁 manager', () => {
    const map = new Map3D({ container: 'map-container', cesiumBaseUrl: '/cesium' })
    map.destroy()
    expect(map.resource.destroyed).toBe(true)
  })
})
