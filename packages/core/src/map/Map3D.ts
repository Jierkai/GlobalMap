import { Viewer } from 'cesium'
import { EventBus } from '../event'
import { GraphicManager } from '../graphic'
import { LayerManager } from '../layer'
import { setCesiumBaseUrl } from '../util'
import type { Disposable, Map3DOptions } from '../type'

/**
 * Map3D 组合根（设计文档 §5.1 / §5.2）。
 *
 * 构造函数两阶段：
 * ① `setCesiumBaseUrl` → 创建 `Cesium.Viewer` → 实例化 `EventBus`（→ 实例化各 Manager）；
 * ② `init()` 建立跨域关联（任务 20+ 逐步填充 Manager）。
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
  private _destroyed = false
  /** 销毁栈（不含 eventBus；eventBus 逻辑上最先注册、最后单独销毁） */
  private _disposers: Array<() => void> = []

  constructor(options: Map3DOptions) {
    setCesiumBaseUrl(options.cesiumBaseUrl)
    this._viewer = new Viewer(options.container, options.viewerOptions)
    this._eventBus = new EventBus()
    this._layer = new LayerManager(this)
    this._graphic = new GraphicManager(this)
    this._disposers.push(() => this._viewer.destroy())
    this._disposers.push(() => this._layer.destroy())
    this._disposers.push(() => this._graphic.destroy())
    this.init()
    this._eventBus.emit('map3d:ready')
  }

  /** 建立跨域关联：全部 Manager 实例化后逐个 init（任务 21-23 陆续接入） */
  private init(): void {
    this._layer.init()
    this._graphic.init()
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
