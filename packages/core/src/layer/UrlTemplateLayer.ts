import { UrlTemplateImageryProvider, ImageryLayer, Resource, DefaultProxy } from 'cesium'
import type { ImageryProvider } from 'cesium'
import { BaseLayer } from './BaseLayer'
import { ChinaCRS, LayerState } from '../type'
import type { UrlTemplateLayerOptions } from '../type'

/**
 * 瓦片模板图层基类（图层域设计文档 §4.1）。
 *
 * 统一封装 UrlTemplateImageryProvider + ImageryLayer 的创建与挂载逻辑。
 * 各厂商子类只需提供 URL 模板和默认参数，特殊逻辑覆写对应方法。
 * 视觉属性（alpha/brightness/contrast/hue/saturation/gamma/nightAlpha/dayAlpha）
 * 在 addToMap 后同步到 ImageryLayer。
 *
 * @internal 内部基类，不经 index.ts 导出
 */
export abstract class UrlTemplateLayer extends BaseLayer {
  protected _imageryLayer?: ImageryLayer
  protected _provider?: UrlTemplateImageryProvider
  protected _urlTemplateOptions: UrlTemplateLayerOptions

  constructor(options: UrlTemplateLayerOptions) {
    super(options)
    this._urlTemplateOptions = options
  }

  // -- Getter 覆写 --

  /** 能否设置透明度：瓦片图层始终 true */
  get hasOpacity(): boolean {
    return true
  }

  /** 能否设置 zIndex：瓦片图层始终 true */
  get hasZIndex(): boolean {
    return true
  }

  /** 图层坐标系（从 options.chinaCRS 读取，默认 WGS84） */
  get crs(): ChinaCRS {
    return this._urlTemplateOptions.chinaCRS ?? ChinaCRS.WGS84
  }

  /** 底层 Cesium ImageryProvider */
  get imageryProvider(): ImageryProvider | undefined {
    return this._provider as ImageryProvider | undefined
  }

  /** 底层 Cesium ImageryLayer */
  get layer(): ImageryLayer | undefined {
    return this._imageryLayer
  }

  /** 图层叠放顺序（options.zIndex；值越大越在上层，经 imageryLayers.raise 实现） */
  get zIndex(): number | undefined {
    return this._urlTemplateOptions.zIndex
  }

  // -- 内部方法 --

  /**
   * 子类可覆写：构造最终 provider 配置
   * （处理子域名、token、queryParameters、proxy、chinaCRS 等）
   */
  protected _buildProviderConfig(): UrlTemplateImageryProvider.ConstructorOptions {
    const opts = this._urlTemplateOptions
    const config: UrlTemplateImageryProvider.ConstructorOptions = {
      url: opts.url,
      subdomains: opts.subdomains,
      maximumLevel: opts.maximumLevel,
      minimumLevel: opts.minimumLevel,
      tileWidth: opts.tileWidth,
      tileHeight: opts.tileHeight,
      credit: opts.credit,
    }
    // proxy: 构造 Resource 代理
    if (opts.proxy) {
      config.url = new Resource({
        url: opts.url,
        proxy: new DefaultProxy(opts.proxy),
        queryParameters: opts.queryParameters,
        headers: opts.headers,
      })
    } else if (opts.queryParameters || opts.headers) {
      config.url = new Resource({
        url: opts.url,
        queryParameters: opts.queryParameters,
        headers: opts.headers,
      })
    }
    return config
  }

  /** 同步视觉属性到 ImageryLayer（在 addToMap 后调用） */
  protected _applyVisualProperties(): void {
    if (!this._imageryLayer) return
    const opts = this._urlTemplateOptions
    if (opts.alpha !== undefined) this._imageryLayer.alpha = opts.alpha
    if (opts.brightness !== undefined) this._imageryLayer.brightness = opts.brightness
    if (opts.contrast !== undefined) this._imageryLayer.contrast = opts.contrast
    if (opts.hue !== undefined) this._imageryLayer.hue = opts.hue
    if (opts.saturation !== undefined) this._imageryLayer.saturation = opts.saturation
    if (opts.gamma !== undefined) this._imageryLayer.gamma = opts.gamma
    if (opts.nightAlpha !== undefined) this._imageryLayer.nightAlpha = opts.nightAlpha
    if (opts.dayAlpha !== undefined) this._imageryLayer.dayAlpha = opts.dayAlpha
  }

  /** zIndex 实现：通过 imageryLayers.raise 调整顺序 */
  protected _applyZIndex(): void {
    if (!this._imageryLayer || this._urlTemplateOptions.zIndex === undefined) return
    const layers = this._viewer!.imageryLayers
    const z = this._urlTemplateOptions.zIndex
    for (let i = 0; i < z; i++) layers.raise(this._imageryLayer)
  }

  /** 同步透明度到 ImageryLayer.alpha */
  protected _applyOpacity(): void {
    if (this._imageryLayer) this._imageryLayer.alpha = this._opacity
  }

  addToMap(): void {
    this._state = LayerState.ADDING
    this._provider = new UrlTemplateImageryProvider(this._buildProviderConfig())
    this._imageryLayer = this._viewer!.imageryLayers.addImageryProvider(this._provider)
    this._applyVisualProperties()
    this._applyZIndex()
    this._state = LayerState.ADDED
  }

  removeFromMap(): void {
    if (this._state === LayerState.ADDED) {
      this._state = LayerState.REMOVING
    }
    if (this._imageryLayer) {
      this._viewer!.imageryLayers.remove(this._imageryLayer)
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
