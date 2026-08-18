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
import { PrimitiveLayer } from '../../layer/PrimitiveLayer'
import { LayerGroup } from '../../layer/LayerGroup'
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

  it('type=primitive 创建 PrimitiveLayer', () => {
    const layer = createLayerFromInitItem({ type: 'primitive', options: {} })
    expect(layer).toBeInstanceOf(PrimitiveLayer)
    expect(layer.type).toBe('primitive')
  })

  it('group 模式：tdt + group 展开为 LayerGroup，成员为同 type 瓦片图层且继承父项 token', () => {
    const layer = createLayerFromInitItem({
      type: 'tdt',
      options: {
        id: 'tdt-group-1',
        token: 'tk',
        group: [
          { layer: 'img', id: 'sub-img', name: '影像' },
          { layer: 'cia', id: 'sub-cia', name: '注记', zIndex: 1 },
        ],
      },
    })
    expect(layer).toBeInstanceOf(LayerGroup)
    expect(layer.id).toBe('tdt-group-1')
    const members = (layer as LayerGroup).getAllLayers()
    expect(members).toHaveLength(2)
    expect(members[0]).toBeInstanceOf(TdtLayer)
    expect(members[0].id).toBe('sub-img')
    expect((members[0] as TdtLayer).layerType).toBe('img')
    expect(members[1].id).toBe('sub-cia')
    expect((members[1] as TdtLayer).layerType).toBe('cia')
    // zIndex 排序：未声明按 0，注记 zIndex=1 在上
    expect(members[1].zIndex).toBe(1)
  })

  it('group 为空数组时退化为单图层（不建组）', () => {
    const layer = createLayerFromInitItem({
      type: 'tdt',
      options: { token: 'tk', group: [] },
    })
    expect(layer).toBeInstanceOf(TdtLayer)
    expect(layer).not.toBeInstanceOf(LayerGroup)
  })

  it('group 子项 show 缺省继承父项 show', () => {
    const layer = createLayerFromInitItem({
      type: 'tdt',
      options: {
        token: 'tk',
        show: false,
        group: [{ layer: 'img' }, { layer: 'cia', show: true }],
      },
    })
    const members = (layer as LayerGroup).getAllLayers()
    expect(members[0].show).toBe(false) // 继承父项
    expect(members[1].show).toBe(true) // 子项覆盖
  })
})
