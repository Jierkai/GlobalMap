import {
  UrlTemplateImageryProvider,
  ImageryLayer,
  ArcGisMapServerImageryProvider,
} from 'cesium'
import type { ImageryProvider } from 'cesium'
import { BaseLayer } from './BaseLayer'
import { ChinaCRS, LayerState } from '../type'
import type { ArcGisLayerOptions } from '../type'

/**
 * ArcGIS Server 图层（图层域设计文档 §4.2.7）。
 *
 * - **模式一**（默认，`useTileTemplate=false`）：使用 `ArcGisMapServerImageryProvider.fromUrl(url)`
 *   （异步），获取服务元数据后创建 provider。
 * - **模式二**（`useTileTemplate=true`）：直接用瓦片模板
 *   `new UrlTemplateImageryProvider({ url: '${url}/tile/{z}/{y}/{x}' })`，
 *   同步构造，跳过元数据请求。
 *
 * ⚠️ `fromUrl` 模式下需请求 MapServer 元数据，网络不稳会失败；
 * 提供 `useTileTemplate` 直连模式规避。
 */
export class ArcGisLayer extends BaseLayer {
  readonly type = 'arcgis'
  protected _imageryLayer?: ImageryLayer
  protected _provider?: UrlTemplateImageryProvider | ArcGisMapServerImageryProvider
  private _arcgisOptions: ArcGisLayerOptions

  constructor(options: ArcGisLayerOptions) {
    super(options)
    this._arcgisOptions = options
  }

  /** 能否设置透明度：ArcGIS 图层 true */
  get hasOpacity(): boolean {
    return true
  }

  /** 能否设置 zIndex：ArcGIS 图层 true */
  get hasZIndex(): boolean {
    return true
  }

  /** 图层坐标系：ArcGIS 使用 WGS84 */
  get crs(): ChinaCRS {
    return ChinaCRS.WGS84
  }

  /** 底层 Cesium ImageryProvider */
  get imageryProvider(): ImageryProvider | undefined {
    return this._provider as ImageryProvider | undefined
  }

  /** 底层 Cesium ImageryLayer */
  get layer(): ImageryLayer | undefined {
    return this._imageryLayer
  }

  /** 同步透明度到 ImageryLayer.alpha */
  protected _applyOpacity(): void {
    if (this._imageryLayer) this._imageryLayer.alpha = this._opacity
  }

  addToMap(): void {
    this._state = LayerState.ADDING
    if (this._arcgisOptions.useTileTemplate) {
      // 模式二：瓦片模板直连（同步）
      const tileUrl = `${this._arcgisOptions.url}/tile/{z}/{y}/{x}`
      this._provider = new UrlTemplateImageryProvider({
        url: tileUrl,
        maximumLevel: this._arcgisOptions.maximumLevel,
      })
      this._imageryLayer = this._viewer!.imageryLayers.addImageryProvider(this._provider)
      this._applyOpacity()
      this._state = LayerState.ADDED
    } else {
      // 模式一：fromUrl 异步元数据
      ArcGisMapServerImageryProvider.fromUrl(this._arcgisOptions.url).then(
        (provider) => {
          if (this.destroyed || !this._viewer) return
          this._provider = provider
          this._imageryLayer = this._viewer.imageryLayers.addImageryProvider(provider)
          this._applyOpacity()
          this._state = LayerState.ADDED
        },
      )
    }
  }

  removeFromMap(): void {
    if (this._state === LayerState.ADDED) {
      this._state = LayerState.REMOVING
    }
    if (this._imageryLayer) {
      this._viewer?.imageryLayers.remove(this._imageryLayer)
      this._imageryLayer = undefined
    }
    this._provider = undefined
    if (this._state === LayerState.REMOVING) {
      this._state = LayerState.REMOVED
    }
  }

  protected _updateShow(show: boolean): void {
    if (this._imageryLayer) this._imageryLayer.show = show
  }
}
