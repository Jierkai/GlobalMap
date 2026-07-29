import { describe, it, expect, vi } from 'vitest'
import { BaiduTilingScheme } from '../baidu'
import { Cartographic, Cartesian2 } from 'cesium'

vi.mock('cesium')

describe('BaiduTilingScheme', () => {
  it('继承 TilingScheme', () => {
    const scheme = new BaiduTilingScheme()
    expect(scheme).toBeInstanceOf(BaiduTilingScheme)
    expect(scheme.type).toBe('baidu')
  })

  it('positionToTileXY 返回 Cartesian2（带 x/y）', () => {
    const scheme = new BaiduTilingScheme()
    // 北京天安门 WGS84 弧度
    const lng = (116.397456 * Math.PI) / 180
    const lat = (39.908823 * Math.PI) / 180
    const result = scheme.positionToTileXY(new Cartographic(lng, lat), 10)
    expect(result).toBeInstanceOf(Cartesian2)
    expect(result.x).toBeGreaterThanOrEqual(0)
    expect(result.y).toBeGreaterThanOrEqual(0)
  })

  it('positionToTileXY 支持 result 参数复用', () => {
    const scheme = new BaiduTilingScheme()
    const lng = (116.397456 * Math.PI) / 180
    const lat = (39.908823 * Math.PI) / 180
    const result = new Cartesian2()
    const ret = scheme.positionToTileXY(new Cartographic(lng, lat), 5, result)
    expect(ret).toBe(result)
  })
})
