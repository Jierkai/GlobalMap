import { UrlTemplateLayer } from './UrlTemplateLayer'
import type { GoogleLayerOptions, GoogleLayerType } from '../type'

/**
 * 谷歌地图图层（图层域设计文档 §4.2.4）。
 *
 * - 影像 URL 模板：`https://mt{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}&hl={language}&gl={region}`
 *   - `lyrs=s` 影像，`lyrs=m` 矢量路网，`lyrs=h` 标注，`lyrs=p` 地形
 *   - 子域名 `0-3`
 * - `maximumLevel` 默认 20
 * - 无需 API key
 *
 * ⚠️ 谷歌瓦片服务在国内可能无法直接访问，需用户自行代理。
 */
export class GoogleLayer extends UrlTemplateLayer {
  readonly type = 'google'
  private _googleType: GoogleLayerType

  constructor(options: GoogleLayerOptions = {}) {
    const googleType: GoogleLayerType = options.type ?? 'img'
    const language = options.language ?? 'zh-CN'
    const region = options.region ?? 'CN'

    // 根据 type 映射 lyrs 参数
    let lyrs: string
    switch (googleType) {
      case 'img':
        lyrs = 's'
        break
      case 'vec':
      case 'road':
        lyrs = 'm'
        break
      case 'label':
        lyrs = 'h'
        break
      case 'ter':
        lyrs = 'p'
        break
      default:
        lyrs = 's'
    }

    const url = `https://mt{s}.google.com/vt/lyrs=${lyrs}&x={x}&y={y}&z={z}&hl=${language}&gl=${region}`

    super({
      id: options.id,
      show: options.show,
      url,
      subdomains: '0123',
      maximumLevel: 20,
    })
    this._googleType = googleType
  }

  /** 谷歌地图图层类型 */
  get layerType(): GoogleLayerType {
    return this._googleType
  }
}
