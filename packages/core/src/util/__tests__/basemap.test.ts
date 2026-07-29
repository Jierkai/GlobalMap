import { describe, it, expect, beforeEach } from 'vitest'
import {
  basemaps,
} from '../basemap'
import { LayerType, BingLayerType } from '../../type'
import { _clearMapKeys } from '../keys'

beforeEach(() => {
  _clearMapKeys()
})

describe('basemaps 工厂', () => {
  it('tdtImagery 返回正确结构', () => {
    const item = basemaps.tdtImagery('my-token')
    expect(item.type).toBe('tdt')
    expect(item.options.token).toBe('my-token')
    expect(item.options.type).toBe(LayerType.IMG)
    expect(item.name).toBe('天地图影像')
  })

  it('arcgisImagery 返回正确结构', () => {
    const item = basemaps.arcgisImagery()
    expect(item.type).toBe('arcgis')
    expect(item.options.url).toContain('arcgisonline.com')
    expect(item.options.maximumLevel).toBe(18)
    expect(item.name).toBe('ArcGIS World Imagery')
  })

  it('osm 返回正确结构', () => {
    const item = basemaps.osm()
    expect(item.type).toBe('osm')
    expect(item.name).toBe('OpenStreetMap')
  })

  it('googleImagery 返回正确结构', () => {
    const item = basemaps.googleImagery()
    expect(item.type).toBe('google')
    expect(item.options.type).toBe(LayerType.IMG)
    expect(item.name).toBe('谷歌影像')
  })

  it('amapImagery 返回正确结构', () => {
    const item = basemaps.amapImagery()
    expect(item.type).toBe('amap')
    expect(item.name).toBe('高德影像')
  })

  it('baiduImagery 返回正确结构', () => {
    const item = basemaps.baiduImagery('my-ak')
    expect(item.type).toBe('baidu')
    expect(item.options.ak).toBe('my-ak')
    expect(item.name).toBe('百度影像')
  })

  it('bingImagery 返回正确结构', () => {
    const item = basemaps.bingImagery('my-key')
    expect(item.type).toBe('bing')
    expect(item.options.key).toBe('my-key')
    expect(item.options.type).toBe(BingLayerType.AERIAL)
    expect(item.name).toBe('Bing 影像')
  })

  it('tdtVector 返回正确结构', () => {
    const item = basemaps.tdtVector('my-token')
    expect(item.type).toBe('tdt')
    expect(item.options.type).toBe(LayerType.VEC)
    expect(item.name).toBe('天地图矢量')
  })
})
