import { UrlTemplateLayer } from './UrlTemplateLayer'
import type { AmapLayerOptions, AmapLayerType } from '../type'
import { ChinaCRS } from '../type'
import { getMapKey } from '../util/keys'

/**
 * 高德地图图层（图层域设计文档 §4.2.3）。
 *
 * - 高德瓦片使用 GCJ02 坐标系，但瓦片服务支持标准 TMS 坐标
 *   （`x/y/z` 直接使用），瓦片渲染不会错位
 * - 影像 URL 模板：`https://webst0{s}.is.autonavi.com/appmaptile?style=6&x={x}&y={y}&z={z}`
 *   - `style=6` 影像，`style=7` 矢量路网，`style=8` 标注
 *   - 子域名 `1-4`
 * - 矢量底图 URL 模板：`https://webrd0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}`
 * - `maximumLevel` 默认 20
 *
 * ⚠️ GCJ02 偏移：高德瓦片直接用标准 TMS 渲染不会错位，
 * 但叠加 WGS84 坐标图元时会出现 ~50-500m 偏移。
 * 偏移修正由坐标转换工具函数处理（coordTransform.ts）。
 */
export class AmapLayer extends UrlTemplateLayer {
  readonly type = 'amap'
  private _amapType: AmapLayerType

  constructor(options: AmapLayerOptions = {}) {
    const amapType: AmapLayerType = options.type ?? 'img'
    const key = options.key ?? getMapKey('amap')

    // 根据 type 映射到高德瓦片 URL
    let url: string
    let style: string
    switch (amapType) {
      case 'img':
        style = '6'
        url = `https://webst0{s}.is.autonavi.com/appmaptile?style=${style}&x={x}&y={y}&z={z}`
        break
      case 'vec':
      case 'road':
      case 'label':
        style = '8'
        url = `https://webrd0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=${style}&x={x}&y={y}&z={z}`
        break
      case 'traffic':
        url = `https://traffic{s}.amap.com/traffic?x={x}&y={y}&z={z}`
        break
      default:
        style = '6'
        url = `https://webst0{s}.is.autonavi.com/appmaptile?style=${style}&x={x}&y={y}&z={z}`
    }

    // 附加 key（如有）
    if (key) {
      url += `&key=${key}`
    }

    super({
      id: options.id,
      show: options.show,
      url,
      subdomains: '1234',
      maximumLevel: 20,
      chinaCRS: ChinaCRS.GCJ02,
    })
    this._amapType = amapType
  }

  /** 高德地图图层类型 */
  get layerType(): AmapLayerType {
    return this._amapType
  }
}
