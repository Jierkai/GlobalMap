import type { LayerInitItem } from '../type'
import type { BaseLayer } from '../layer/BaseLayer'
import { TdtLayer } from '../layer/TdtLayer'
import { BaiduLayer } from '../layer/BaiduLayer'
import { AmapLayer } from '../layer/AmapLayer'
import { GoogleLayer } from '../layer/GoogleLayer'
import { OsmLayer } from '../layer/OsmLayer'
import { BingLayer } from '../layer/BingLayer'
import { ArcGisLayer } from '../layer/ArcGisLayer'
import { GraphicLayer } from '../layer/GraphicLayer'

/**
 * 图层工厂：根据 LayerInitItem 创建对应图层实例（图层域设计文档 §4.4）。
 *
 * layer 与 basemapsLayer 共用此工厂。
 */
export function createLayerFromInitItem(item: LayerInitItem): BaseLayer {
  switch (item.type) {
    case 'tdt':
      return new TdtLayer(item.options)
    case 'baidu':
      return new BaiduLayer(item.options)
    case 'amap':
      return new AmapLayer(item.options)
    case 'google':
      return new GoogleLayer(item.options)
    case 'osm':
      return new OsmLayer(item.options)
    case 'bing':
      return new BingLayer(item.options)
    case 'arcgis':
      return new ArcGisLayer(item.options)
    case 'graphic':
      return new GraphicLayer(item.options)
    default: {
      const exhaustive: never = item
      throw new Error(
        `[GlobalMap] 未知图层类型: ${(exhaustive as { type: string }).type}`,
      )
    }
  }
}
