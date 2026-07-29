import { BingMapsImageryProvider, BingMapsStyle, ImageryLayer } from 'cesium'
import type { ImageryProvider } from 'cesium'
import { BaseLayer } from './BaseLayer'
import { ChinaCRS, LayerState } from '../type'
import type { BingLayerOptions, BingLayerTypeString } from '../type'
import { getMapKey } from '../util/keys'

/**
 * Bing Maps 图层（图层域设计文档 §4.2.6）。
 *
 * - 使用 Cesium `BingMapsImageryProvider`（非 `UrlTemplateImageryProvider`）
 * - 直接 `extends BaseLayer`，不走 `UrlTemplateLayer`
 * - `BingMapsImageryProvider.fromUrl` 为异步方法，`addToMap` 需处理异步
 * - `credit` 默认 `'Bing Maps'`
 * - key 缺省时从全局 key 存储读取（`setMapKey('bing', ...)`）
 */
export class BingLayer extends BaseLayer {
  readonly type = 'bing'
  protected _imageryLayer?: ImageryLayer
  protected _provider?: BingMapsImageryProvider
  private _bingType: BingLayerTypeString
  private _bingKey?: string
  private _bingCulture: string

  constructor(options: BingLayerOptions = {}) {
    super(options)
    this._bingType = options.type ?? 'aerial'
    this._bingKey = options.key
    this._bingCulture = options.culture ?? 'zh-CN'
  }

  /** Bing Maps 图层类型 */
  get layerType(): BingLayerTypeString {
    return this._bingType
  }

  /** 能否设置透明度：Bing 图层 true */
  get hasOpacity(): boolean {
    return true
  }

  /** 能否设置 zIndex：Bing 图层 true */
  get hasZIndex(): boolean {
    return true
  }

  /** 图层坐标系：Bing 使用 WGS84 */
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

  /** 映射 BingLayerTypeString -> BingMapsStyle */
  private _mapStyle(): BingMapsStyle {
    switch (this._bingType) {
      case 'aerial':
        return BingMapsStyle.AERIAL
      case 'road':
        return BingMapsStyle.ROAD
      case 'collins':
        return BingMapsStyle.COLLINS_BART
      case 'hybrid':
        return BingMapsStyle.AERIAL_WITH_LABELS
      default:
        return BingMapsStyle.AERIAL
    }
  }

  /** 同步透明度到 ImageryLayer.alpha */
  protected _applyOpacity(): void {
    if (this._imageryLayer) this._imageryLayer.alpha = this._opacity
  }

  addToMap(): void {
    this._state = LayerState.ADDING
    const key = this._bingKey ?? getMapKey('bing') ?? ''

    // BingMapsImageryProvider.fromUrl 是异步的，先标记 adding，
    // Promise resolve 后创建 provider + imageryLayer 并标记 added。
    BingMapsImageryProvider.fromUrl('https://dev.virtualearth.net', {
      key,
      mapStyle: this._mapStyle(),
      culture: this._bingCulture,
    }).then((provider) => {
      if (this.destroyed || !this._viewer) return
      this._provider = provider
      this._imageryLayer = this._viewer.imageryLayers.addImageryProvider(provider)
      this._applyOpacity()
      this._state = LayerState.ADDED
    })
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
