import { describe, it, expect, vi } from 'vitest'
import { Map3D } from '../../map'
import { RoamManager } from '../RoamManager'

vi.mock('cesium')

describe('RoamManager（空壳契约）', () => {
  it('map.roam getter 存在且为 RoamManager 实例', () => {
    const map = new Map3D({ container: 'map-container' })
    expect(map.roam).toBeInstanceOf(RoamManager)
  })

  it('init 为空实现不报错', () => {
    const map = new Map3D({ container: 'map-container' })
    expect(() => map.roam.init()).not.toThrow()
  })

  it('destroy 置 destroyed 且幂等', () => {
    const map = new Map3D({ container: 'map-container' })
    map.roam.destroy()
    expect(map.roam.destroyed).toBe(true)
    expect(() => map.roam.destroy()).not.toThrow()
    expect(map.roam.destroyed).toBe(true)
  })

  it('map.destroy 级联销毁 manager', () => {
    const map = new Map3D({ container: 'map-container' })
    map.destroy()
    expect(map.roam.destroyed).toBe(true)
  })
})
