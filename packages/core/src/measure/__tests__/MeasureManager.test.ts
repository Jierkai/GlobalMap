import { describe, it, expect, vi } from 'vitest'
import { Map3D } from '../../map'
import { MeasureManager } from '../MeasureManager'

vi.mock('cesium')

describe('MeasureManager（空壳契约）', () => {
  it('map.measure getter 存在且为 MeasureManager 实例', () => {
    const map = new Map3D({ container: 'map-container' })
    expect(map.measure).toBeInstanceOf(MeasureManager)
  })

  it('init 为空实现不报错', () => {
    const map = new Map3D({ container: 'map-container' })
    expect(() => map.measure.init()).not.toThrow()
  })

  it('destroy 置 destroyed 且幂等', () => {
    const map = new Map3D({ container: 'map-container' })
    map.measure.destroy()
    expect(map.measure.destroyed).toBe(true)
    expect(() => map.measure.destroy()).not.toThrow()
    expect(map.measure.destroyed).toBe(true)
  })

  it('map.destroy 级联销毁 manager', () => {
    const map = new Map3D({ container: 'map-container' })
    map.destroy()
    expect(map.measure.destroyed).toBe(true)
  })
})
