import { describe, it, expect, vi } from 'vitest'
import { Map3D } from '../../map'
import { TransformManager } from '../TransformManager'

vi.mock('cesium')

describe('TransformManager（空壳契约）', () => {
  it('map.transform getter 存在且为 TransformManager 实例', () => {
    const map = new Map3D({ container: 'map-container' })
    expect(map.transform).toBeInstanceOf(TransformManager)
  })

  it('init 为空实现不报错', () => {
    const map = new Map3D({ container: 'map-container' })
    expect(() => map.transform.init()).not.toThrow()
  })

  it('destroy 置 destroyed 且幂等', () => {
    const map = new Map3D({ container: 'map-container' })
    map.transform.destroy()
    expect(map.transform.destroyed).toBe(true)
    expect(() => map.transform.destroy()).not.toThrow()
    expect(map.transform.destroyed).toBe(true)
  })

  it('map.destroy 级联销毁 manager', () => {
    const map = new Map3D({ container: 'map-container' })
    map.destroy()
    expect(map.transform.destroyed).toBe(true)
  })
})
