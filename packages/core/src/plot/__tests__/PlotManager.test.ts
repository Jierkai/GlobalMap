import { describe, it, expect, vi } from 'vitest'
import { Map3D } from '../../map'
import { PlotManager } from '../PlotManager'

vi.mock('cesium')

describe('PlotManager（空壳契约）', () => {
  it('map.plot getter 存在且为 PlotManager 实例', () => {
    const map = new Map3D({ container: 'map-container' })
    expect(map.plot).toBeInstanceOf(PlotManager)
  })

  it('init 为空实现不报错', () => {
    const map = new Map3D({ container: 'map-container' })
    expect(() => map.plot.init()).not.toThrow()
  })

  it('destroy 置 destroyed 且幂等', () => {
    const map = new Map3D({ container: 'map-container' })
    map.plot.destroy()
    expect(map.plot.destroyed).toBe(true)
    expect(() => map.plot.destroy()).not.toThrow()
    expect(map.plot.destroyed).toBe(true)
  })

  it('map.destroy 级联销毁 manager', () => {
    const map = new Map3D({ container: 'map-container' })
    map.destroy()
    expect(map.plot.destroyed).toBe(true)
  })
})
