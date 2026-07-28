import { describe, it, expect, vi } from 'vitest'
import { Map3D } from '../../map'
import { AnalyseManager } from '../AnalyseManager'

vi.mock('cesium')

describe('AnalyseManager（空壳契约）', () => {
  it('map.analyse getter 存在且为 AnalyseManager 实例', () => {
    const map = new Map3D({ container: 'map-container' })
    expect(map.analyse).toBeInstanceOf(AnalyseManager)
  })

  it('init 为空实现不报错', () => {
    const map = new Map3D({ container: 'map-container' })
    expect(() => map.analyse.init()).not.toThrow()
  })

  it('destroy 置 destroyed 且幂等', () => {
    const map = new Map3D({ container: 'map-container' })
    map.analyse.destroy()
    expect(map.analyse.destroyed).toBe(true)
    expect(() => map.analyse.destroy()).not.toThrow()
    expect(map.analyse.destroyed).toBe(true)
  })

  it('map.destroy 级联销毁 manager', () => {
    const map = new Map3D({ container: 'map-container' })
    map.destroy()
    expect(map.analyse.destroyed).toBe(true)
  })
})
