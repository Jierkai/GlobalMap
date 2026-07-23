import { describe, it, expect, vi } from 'vitest'
import { Map3D } from '../../map'
import { SceneManager } from '../SceneManager'

vi.mock('cesium')

describe('SceneManager（空壳契约）', () => {
  it('map.scene getter 存在且为 SceneManager 实例', () => {
    const map = new Map3D({ container: 'map-container', cesiumBaseUrl: '/cesium' })
    expect(map.scene).toBeInstanceOf(SceneManager)
  })

  it('init 为空实现不报错', () => {
    const map = new Map3D({ container: 'map-container', cesiumBaseUrl: '/cesium' })
    expect(() => map.scene.init()).not.toThrow()
  })

  it('destroy 置 destroyed 且幂等', () => {
    const map = new Map3D({ container: 'map-container', cesiumBaseUrl: '/cesium' })
    map.scene.destroy()
    expect(map.scene.destroyed).toBe(true)
    expect(() => map.scene.destroy()).not.toThrow()
    expect(map.scene.destroyed).toBe(true)
  })

  it('map.destroy 级联销毁 manager', () => {
    const map = new Map3D({ container: 'map-container', cesiumBaseUrl: '/cesium' })
    map.destroy()
    expect(map.scene.destroyed).toBe(true)
  })
})
