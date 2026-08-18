import type { LayerInitItem, LayerSubLayerItem } from '../type'
import type { BaseLayer } from '../layer/BaseLayer'
import { LayerGroup } from '../layer/LayerGroup'
import { TdtLayer } from '../layer/TdtLayer'
import { BaiduLayer } from '../layer/BaiduLayer'
import { AmapLayer } from '../layer/AmapLayer'
import { GoogleLayer } from '../layer/GoogleLayer'
import { OsmLayer } from '../layer/OsmLayer'
import { BingLayer } from '../layer/BingLayer'
import { ArcGisLayer } from '../layer/ArcGisLayer'
import { GraphicLayer } from '../layer/GraphicLayer'
import { PrimitiveLayer } from '../layer/PrimitiveLayer'

/**
 * 图层工厂：根据 LayerInitItem 创建对应图层实例（图层域设计文档 §4.4）。
 *
 * layer 与 basemapsLayer 共用此工厂。
 *
 * **group 子图层集合**：瓦片类图层项的 options.group 存在且非空时，
 * 展开为 LayerGroup（成员为同 type 的多个瓦片图层，各取子项 layer 作为自身 type），
 * 父项的 id / show / token 等透传各成员；子项可覆盖 id / show / zIndex。
 * 典型用法：天地图影像 + 注记双层 `{ type: 'tdt', options: { token, group: [{ layer: 'img' }, { layer: 'cia' }] } }`。
 */
export function createLayerFromInitItem(item: LayerInitItem): BaseLayer {
  const options = item.options as { group?: LayerSubLayerItem[] } & Record<string, unknown>
  if (options.group && options.group.length > 0) {
    return createGroupFromInitItem(item, options.group)
  }
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
    case 'primitive':
      return new PrimitiveLayer(item.options)
    default: {
      const exhaustive: never = item
      throw new Error(`[GlobalMap] 未知图层类型: ${(exhaustive as { type: string }).type}`)
    }
  }
}

/** group 模式：展开为 LayerGroup（成员为同 type 的多个瓦片图层，剔除 group 字段后逐项创建） */
function createGroupFromInitItem(item: LayerInitItem, group: LayerSubLayerItem[]): LayerGroup {
  const parentOptions: Record<string, unknown> = { ...item.options }
  delete parentOptions.group
  const groupLayer = new LayerGroup({ id: item.options.id as string | undefined })
  for (const sub of group) {
    // 子项覆盖父项：layer 作为瓦片 type，id/show/zIndex 独立声明；其余（token 等）继承父项
    const memberOptions: Record<string, unknown> = {
      ...parentOptions,
      type: sub.layer,
      id: sub.id,
      show: sub.show ?? (parentOptions.show as boolean | undefined),
      zIndex: sub.zIndex,
    }
    if (memberOptions.id === undefined) delete memberOptions.id
    if (memberOptions.zIndex === undefined) delete memberOptions.zIndex
    const member = createLayerFromInitItem({ type: item.type, options: memberOptions } as LayerInitItem)
    groupLayer.addLayer(member)
  }
  return groupLayer
}
