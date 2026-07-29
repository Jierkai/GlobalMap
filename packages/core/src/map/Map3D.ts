import {
  Viewer,
  ImageryLayer,
  UrlTemplateImageryProvider,
  OpenStreetMapImageryProvider,
  ProviderViewModel,
} from 'cesium'
import type { ImageryProvider } from 'cesium'
import { EventBus } from '../event'
import { LayerManager } from '../layer'
import { PlotManager } from '../plot'
import { MeasureManager } from '../measure'
import { RoamManager } from '../roam'
import { EffectManager } from '../effect'
import { AnalyseManager } from '../analyse'
import { ControlManager } from '../control'
import { SceneManager } from '../scene'
import { resolveCesiumBaseUrl, createLayerFromInitItem } from '../util'
import type { Disposable, Map3DOptions } from '../type'
import type { BaseLayer } from '../layer'

/**
 * Map3D 组合根（设计文档 §5.1 / §5.2）。
 *
 * 构造函数两阶段：
 * ① `resolveCesiumBaseUrl()`（自动识别 §5.7）-> 创建 `Cesium.Viewer` -> 实例化 `EventBus` -> 实例化全部 8 个 Manager；
 * ② `init()` 逐个调用 Manager.init() 建立跨域关联。
 * 全部初始化完成后才 emit `map3d:ready`--外部消费者判断地图就绪的唯一信号，
 * 不得因 Manager 增减而把 ready 提前（时序由测试守护）。
 *
 * 销毁采用"显式注册 + 逆序销毁"：eventBus 最先创建、最后销毁；
 * 每个销毁回调 try-catch 兜底，单个失败不阻断后续；
 * 全部销毁动作完成后、eventBus 自身销毁前 emit `map3d:destroyed`。
 *
 * 图层域扩展（设计文档 §4.3 / §4.4）：
 * - `basemapsLayer`：构造时解析为 `viewerOptions.imageryProviderViewModels` + `selectedImageryProviderViewModel` + `baseLayer`。
 * - `layer`：`map3d:ready` 之前按序 `addLayer`。
 *
 * 注：图元统一由 GraphicLayer（layer 域，§5.8）管理，不再设全局 GraphicManager。
 * material/transform/resource 不满足 Manager 充要条件（§5.1），降级为工具函数，无 Manager。
 */
export class Map3D implements Disposable {
  private _viewer: Viewer
  private _eventBus: EventBus
  private _layer: LayerManager
  private _plot: PlotManager
  private _measure: MeasureManager
  private _roam: RoamManager
  private _effect: EffectManager
  private _analyse: AnalyseManager
  private _control: ControlManager
  private _scene: SceneManager
  private _destroyed = false
  /** 销毁栈（不含 eventBus；eventBus 逻辑上最先注册、最后单独销毁） */
  private _disposers: Array<() => void> = []

  constructor(options: Map3DOptions) {
    // Cesium 静态资源自动识别（设计文档 §5.7）：打包器插件注入 > script 探测 > /cesium 兜底
    ;(window as { CESIUM_BASE_URL?: string }).CESIUM_BASE_URL = resolveCesiumBaseUrl()

    // -- 消费 basemapsLayer 配置项（设计文档 §4.3） --
    const viewerOptions: Record<string, unknown> = { ...options.viewerOptions }

    if (options.basemapsLayer?.length) {
      const basemapLayers = options.basemapsLayer.map((item) => {
        const layer = createLayerFromInitItem(item)
        return { item, layer }
      })

      // 首项作为默认底图：同步创建 provider，确保地球初始即有影像
      const firstLayer = basemapLayers[0].layer as BaseLayer & {
        _provider?: unknown
        _buildProviderConfig?: () => unknown
      }
      // 首项图层在 Viewer 构造前同步创建 provider（仅 UrlTemplateLayer 支持）
      // BingLayer/ArcGisLayer 走异步，首项底图需用 UrlTemplateLayer 类型
      this._createBasemapProvider(firstLayer)

      if (firstLayer._provider) {
        viewerOptions.baseLayer = new ImageryLayer(
          firstLayer._provider as ImageryProvider,
        )
      }

      // 组装 ProviderViewModel（底图选择器列表）
      const viewModels = basemapLayers.map(({ item, layer }) => {
        const bl = layer as BaseLayer & { _provider?: unknown }
        return new ProviderViewModel({
          name: item.name ?? (layer as { name?: string }).name ?? item.type,
          iconUrl: item.iconUrl ?? '',
          tooltip: item.tooltip ?? '',
          creationFunction: (() => {
            // 切换底图时创建 provider 并返回
            this._createBasemapProvider(bl)
            return bl._provider
          }) as ProviderViewModel.CreationFunction,
        })
      })
      viewerOptions.imageryProviderViewModels = viewModels
      viewerOptions.selectedImageryProviderViewModel = viewModels[0]
    }

    // 兜底：未传 basemapsLayer 且未配 baseLayer -> OSM
    if (!viewerOptions.baseLayer && viewerOptions.baseLayerPicker !== false) {
      viewerOptions.baseLayer = new ImageryLayer(
        new OpenStreetMapImageryProvider({ url: 'https://tile.openstreetmap.org/' }),
      )
    }

    this._viewer = new Viewer(options.container, viewerOptions)
    this._eventBus = new EventBus()
    // 阶段①：按固定顺序实例化全部 8 个 Manager
    this._layer = new LayerManager(this)
    this._plot = new PlotManager(this)
    this._measure = new MeasureManager(this)
    this._roam = new RoamManager(this)
    this._effect = new EffectManager(this)
    this._analyse = new AnalyseManager(this)
    this._control = new ControlManager(this)
    this._scene = new SceneManager(this)
    // 注册销毁栈（逆序销毁时 Manager 先于 Viewer）
    this._disposers.push(() => this._viewer.destroy())
    this._disposers.push(() => this._layer.destroy())
    this._disposers.push(() => this._plot.destroy())
    this._disposers.push(() => this._measure.destroy())
    this._disposers.push(() => this._roam.destroy())
    this._disposers.push(() => this._effect.destroy())
    this._disposers.push(() => this._analyse.destroy())
    this._disposers.push(() => this._control.destroy())
    this._disposers.push(() => this._scene.destroy())
    // 阶段②：建立跨域关联，全部完成后才调度 ready
    this.init()

    // -- 消费 layer 配置项（设计文档 §4.4）：ready 之前按序 addLayer --
    if (options.layer?.length) {
      for (const item of options.layer) {
        const layer = createLayerFromInitItem(item)
        this._layer.addLayer(layer)
      }
    }

    // map3d:ready 以微任务触发（仍由构造函数调度、仍在全部 init 之后）：
    // 外部消费者在 new 之后同步 on 订阅即可收到（Vue onMounted 场景），
    // 这是消费者判断地图就绪的唯一信号。
    queueMicrotask(() => {
      if (!this._destroyed) this._eventBus.emit('map3d:ready')
    })
  }

  /**
   * 同步创建底图 provider（仅 UrlTemplateLayer 子类支持同步创建）。
   * BingLayer/ArcGisLayer 走异步，首项底图不推荐使用。
   */
  private _createBasemapProvider(
    layer: BaseLayer & { _provider?: unknown; _buildProviderConfig?: () => unknown },
  ): void {
    if (layer._provider) return
    if (layer._buildProviderConfig) {
      // UrlTemplateLayer 子类：同步构造 provider
      const config = layer._buildProviderConfig()
      layer._provider = new UrlTemplateImageryProvider(
        config as UrlTemplateImageryProvider.ConstructorOptions,
      )
    }
  }

  /** 建立跨域关联：全部 Manager 实例化后逐个 init */
  private init(): void {
    this._layer.init()
    this._plot.init()
    this._measure.init()
    this._roam.init()
    this._effect.init()
    this._analyse.init()
    this._control.init()
    this._scene.init()
  }

  get viewer(): Viewer {
    return this._viewer
  }

  get eventBus(): EventBus {
    return this._eventBus
  }

  get layer(): LayerManager {
    return this._layer
  }

  get plot(): PlotManager {
    return this._plot
  }

  get measure(): MeasureManager {
    return this._measure
  }

  get roam(): RoamManager {
    return this._roam
  }

  get effect(): EffectManager {
    return this._effect
  }

  get analyse(): AnalyseManager {
    return this._analyse
  }

  get control(): ControlManager {
    return this._control
  }

  get scene(): SceneManager {
    return this._scene
  }

  get destroyed(): boolean {
    return this._destroyed
  }

  destroy(): void {
    if (this._destroyed) return
    this._destroyed = true
    // 逆序销毁栈内回调，单个失败不阻断后续
    for (let i = this._disposers.length - 1; i >= 0; i--) {
      try {
        this._disposers[i]()
      } catch {
        // 兜底：继续销毁其余
      }
    }
    // 完成销毁动作后、eventBus 自身销毁前通知
    try {
      this._eventBus.emit('map3d:destroyed')
    } catch {
      // 兜底：handler 异常不影响 eventBus 销毁
    }
    try {
      this._eventBus.destroy()
    } catch {
      // 兜底：保持幂等返回
    }
  }
}
