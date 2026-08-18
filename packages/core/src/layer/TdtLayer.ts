import { UrlTemplateLayer } from './UrlTemplateLayer'
import type { TdtLayerOptions, TdtLayerType } from '../type'
import { getMapKey } from '../util/keys'

/**
 * 天地图图层（图层域设计文档 §4.2.1）。
 *
 * - URL 模板：`https://t{s}.tianditu.gov.cn/DataServer?T={layerType}_w&x={x}&y={y}&l={z}&tk={token}`
 *   - `_w` 后缀 = Web 墨卡托投影（WGS84）
 *   - 子域名 `0-7`
 * - `maximumLevel` 默认 18
 * - `credit` 默认 `'Tianditu'`
 * - token 缺省时从全局 key 存储读取（`setMapKey('tdt', ...)`）
 */
export class TdtLayer extends UrlTemplateLayer {
  readonly type = 'tdt'
  private _tdtType: TdtLayerType

  constructor(options: TdtLayerOptions = {}) {
    const tdtType: TdtLayerType = options.type ?? 'img'
    const token = options.token ?? getMapKey('tdt') ?? ''
    const url = `https://t{s}.tianditu.gov.cn/DataServer?T=${tdtType}_w&x={x}&y={y}&l={z}&tk=${token}`

    super({
      id: options.id,
      show: options.show,
      url,
      subdomains: '01234567',
      maximumLevel: 18,
      credit: 'Tianditu',
      zIndex: options.zIndex,
    })
    this._tdtType = tdtType
  }

  /** 天地图图层类型 */
  get layerType(): TdtLayerType {
    return this._tdtType
  }
}
