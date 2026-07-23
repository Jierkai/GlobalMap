import { Viewer } from 'cesium'
import { EventBus } from '../event'
import { GraphicManager } from '../graphic'
import { LayerManager } from '../layer'
import { PrimitiveManager } from '../primitive'
import { PlotManager } from '../plot'
import { MeasureManager } from '../measure'
import { RoamManager } from '../roam'
import { EffectManager } from '../effect'
import { MaterialManager } from '../material'
import { setCesiumBaseUrl } from '../util'
import type { Disposable, Map3DOptions } from '../type'

/**
 * Map3D 组合根（设计文档 §5.1 / §5.2）。
 *
 * 构造函数两阶段：
 * ① `setCesiumBaseUrl` → 创建 `Cesium.Viewer` → 实例化 `EventBus` → 实例化全部 Manager；
 * ② `init()` 逐个调用 Manager.init() 建立跨域关联。
 * 全部初始化完成后 emit `map3d:ready`——外部消费者判断地图就绪的唯一信号。
 *
 * 销毁采用"显式注册 + 逆序销毁"：eventBus 最先创建、最后销毁；
 * 每个销毁回调 try-catch 兜底，单个失败不阻断后续；
 * 全部销毁动作完成后、eventBus 自身销毁前 emit `map3d:destroyed`。
 */
export class Map3D implements Disposable {
  private _viewer: Viewer
  private _eventBus: EventBus
  private _layer: LayerManager
  private _graphic: GraphicManager
  private _primitive: PrimitiveManager
  private _plot: PlotManager
  private _measure: MeasureManager
  private _roam: RoamManager
  private _effect: EffectManager
  private _material: MaterialManager
  private _destroyed = false
  /** 销毁栈（不含 eventBus；eventBus 逻辑上最先注册、最后单独销毁） */
  private _disposers: Array<() => void> = []

  constructor(options: Map3DOptions) {
    setCesiumBaseUrl(options.cesiumBaseUrl)
    this._viewer = new Viewer(options.container, options.viewerOptions)
    this._eventBus = new EventBus()
    // 阶段①：按固定顺序实例化全部 Manager
    this._layer = new LayerManager(this)
    this._graphic = new GraphicManager(this)
    this._primitive = new PrimitiveManager(this)
    this._plot = new PlotManager(this)
    this._measure = new MeasureManager(this)
    this._roam = new RoamManager(this)
    this._effect = new EffectManager(this)
    this._material = new MaterialManager(this)
    // 注册销毁栈（逆序销毁时 Manager 先于 Viewer）
    this._disposers.push(() => this._viewer.destroy())
    this._disposers.push(() => this._layer.destroy())
    this._disposers.push(() => this._graphic.destroy())
    this._disposers.push(() => this._primitive.destroy())
    this._disposers.push(() => this._plot.destroy())
    this._disposers.push(() => this._measure.destroy())
    this._disposers.push(() => this._roam.destroy())
    this._disposers.push(() => this._effect.destroy())
    this._disposers.push(() => this._material.destroy())
    // 阶段②：建立跨域关联，全部完成后 emit ready
    this.init()
    this._eventBus.emit('map3d:ready')
  }

  /** 建立跨域关联：全部 Manager 实例化后逐个 init */
  private init(): void {
    this._layer.init()
    this._graphic.init()
    this._primitive.init()
    this._plot.init()
    this._measure.init()
    this._roam.init()
    this._effect.init()
    this._material.init()
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

  get graphic(): GraphicManager {
    return this._graphic
  }

  get primitive(): PrimitiveManager {
    return this._primitive
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

  get material(): MaterialManager {
    return this._material
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
