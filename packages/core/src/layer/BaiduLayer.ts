import { UrlTemplateImageryProvider } from 'cesium'
import { UrlTemplateLayer } from './UrlTemplateLayer'
import type { BaiduLayerOptions, BaiduLayerType } from '../type'
import { ChinaCRS } from '../type'
import { getMapKey } from '../util/keys'
import { BaiduTilingScheme } from '../util/baidu'

/**
 * 百度地图图层（图层域设计文档 §4.2.2）。
 *
 * - 百度瓦片使用 BD09 坐标系 + 自有瓦片编号体系
 * - 影像 URL 模板：`https://shangetu{s}.map.bdimg.com/it/u=x={x};y={y};z={z};v=009;type=sate&fm=46`
 *   - 子域名 `0-2`
 * - `maximumLevel` 默认 19
 * - 使用自定义 `BaiduTilingScheme` 实现百度瓦片坐标转换
 *
 * ⚠️ 已知限制：百度 BD09 坐标系精确转换是已知难点。
 * 第一版支持百度瓦片渲染（瓦片编号转换），BD09->WGS84 图元坐标偏移修正
 * 由坐标转换工具函数处理（coordTransform.ts）。
 */
export class BaiduLayer extends UrlTemplateLayer {
  readonly type = 'baidu'
  private _baiduType: BaiduLayerType

  constructor(options: BaiduLayerOptions = {}) {
    const baiduType: BaiduLayerType = options.type ?? 'img'
    const ak = options.ak ?? getMapKey('baidu')

    // 影像与矢量使用不同的 URL 模板
    let url: string
    if (baiduType === 'img') {
      url = `https://shangetu{s}.map.bdimg.com/it/u=x={x};y={y};z={z};v=009;type=sate&fm=46${ak ? `&ak=${ak}` : ''}`
    } else {
      // 矢量 / 路况
      url = `https://online{s}.map.bdimg.com/onlinelabel/?qt=tile&x={x}&y={y}&z={z}&styles=pl&scaler=1&p=1${ak ? `&ak=${ak}` : ''}`
    }

    super({
      id: options.id,
      show: options.show,
      url,
      subdomains: '012',
      maximumLevel: 19,
      chinaCRS: ChinaCRS.BD09,
      zIndex: options.zIndex,
    })
    this._baiduType = baiduType
  }

  /** 百度地图图层类型 */
  get layerType(): BaiduLayerType {
    return this._baiduType
  }

  /**
   * 覆写：注入 BaiduTilingScheme 到 provider 配置
   */
  protected _buildProviderConfig(): UrlTemplateImageryProvider.ConstructorOptions {
    const config = super._buildProviderConfig()
    config.tilingScheme = new BaiduTilingScheme()
    return config
  }
}
