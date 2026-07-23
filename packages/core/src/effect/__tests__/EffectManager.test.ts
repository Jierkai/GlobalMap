import { describe, it, expect, vi } from 'vitest'
import { Map3D } from '../../map'
import { EffectManager } from '../EffectManager'

vi.mock('cesium')

describe('EffectManager（空壳契约）', () => {
  it('map.effect getter 存在且为 EffectManager 实例', () => {
    const map = new Map3D({ container: 'map-container', cesiumBaseUrl: '/cesium' })
    expect(map.effect).toBeInstanceOf(EffectManager)
  })

  it('init 为空实现不报错', () => {
    const map = new Map3D({ container: 'map-container', cesiumBaseUrl: '/cesium' })
    expect(() => map.effect.init()).not.toThrow()
  })

  it('destroy 置 destroyed 且幂等', () => {
    const map = new Map3D({ container: 'map-container', cesiumBaseUrl: '/cesium' })
    map.effect.destroy()
    expect(map.effect.destroyed).toBe(true)
    expect(() => map.effect.destroy()).not.toThrow()
    expect(map.effect.destroyed).toBe(true)
  })

  it('map.destroy 级联销毁 manager', () => {
    const map = new Map3D({ container: 'map-container', cesiumBaseUrl: '/cesium' })
    map.destroy()
    expect(map.effect.destroyed).toBe(true)
  })
})
