import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createLayerFromInitItem } from '../../util/layerFactory'
import { TdtLayer } from '../../layer/TdtLayer'
import { BaiduLayer } from '../../layer/BaiduLayer'
import { AmapLayer } from '../../layer/AmapLayer'
import { GoogleLayer } from '../../layer/GoogleLayer'
import { OsmLayer } from '../../layer/OsmLayer'
import { BingLayer } from '../../layer/BingLayer'
import { ArcGisLayer } from '../../layer/ArcGisLayer'
import { GraphicLayer } from '../../layer/GraphicLayer'
import { _clearMapKeys } from '../../util/keys'

vi.mock('cesium')

beforeEach(() => {
  _clearMapKeys()
})

describe('createLayerFromInitItem', () => {
  it('type=tdt 创建 TdtLayer', () => {
    const layer = createLayerFromInitItem({ type: 'tdt', options: { token: 'tk' } })
    expect(layer).toBeInstanceOf(TdtLayer)
    expect(layer.type).toBe('tdt')
  })

  it('type=baidu 创建 BaiduLayer', () => {
    const layer = createLayerFromInitItem({ type: 'baidu', options: { type: 'img' } })
    expect(layer).toBeInstanceOf(BaiduLayer)
  })

  it('type=amap 创建 AmapLayer', () => {
    const layer = createLayerFromInitItem({ type: 'amap', options: { type: 'img' } })
    expect(layer).toBeInstanceOf(AmapLayer)
  })

  it('type=google 创建 GoogleLayer', () => {
    const layer = createLayerFromInitItem({ type: 'google', options: {} })
    expect(layer).toBeInstanceOf(GoogleLayer)
  })

  it('type=osm 创建 OsmLayer', () => {
    const layer = createLayerFromInitItem({ type: 'osm', options: {} })
    expect(layer).toBeInstanceOf(OsmLayer)
  })

  it('type=bing 创建 BingLayer', () => {
    const layer = createLayerFromInitItem({ type: 'bing', options: { key: 'k' } })
    expect(layer).toBeInstanceOf(BingLayer)
  })

  it('type=arcgis 创建 ArcGisLayer', () => {
    const layer = createLayerFromInitItem({
      type: 'arcgis',
      options: { url: 'https://example.com', useTileTemplate: true },
    })
    expect(layer).toBeInstanceOf(ArcGisLayer)
  })

  it('type=graphic 创建 GraphicLayer', () => {
    const layer = createLayerFromInitItem({ type: 'graphic', options: {} })
    expect(layer).toBeInstanceOf(GraphicLayer)
  })
})
