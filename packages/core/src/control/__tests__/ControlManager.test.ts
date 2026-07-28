import { describe, it, expect, vi } from 'vitest'
import { Map3D } from '../../map'
import { ControlManager } from '../ControlManager'

vi.mock('cesium')

describe('ControlManager（空壳契约）', () => {
  it('map.control getter 存在且为 ControlManager 实例', () => {
    const map = new Map3D({ container: 'map-container' })
    expect(map.control).toBeInstanceOf(ControlManager)
  })

  it('init 为空实现不报错', () => {
    const map = new Map3D({ container: 'map-container' })
    expect(() => map.control.init()).not.toThrow()
  })

  it('destroy 置 destroyed 且幂等', () => {
    const map = new Map3D({ container: 'map-container' })
    map.control.destroy()
    expect(map.control.destroyed).toBe(true)
    expect(() => map.control.destroy()).not.toThrow()
    expect(map.control.destroyed).toBe(true)
  })

  it('map.destroy 级联销毁 manager', () => {
    const map = new Map3D({ container: 'map-container' })
    map.destroy()
    expect(map.control.destroyed).toBe(true)
  })
})
