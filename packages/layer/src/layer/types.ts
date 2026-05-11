import { signal, type Signal } from '@cgx/reactive';
import { TypedEmitter, type Off, type EngineAdapter, type LayerRenderSpec } from '@cgx/core';

/**
 * 图层类型枚举
 */
export type LayerType = 'imagery' | 'terrain' | 'graphic' | 'data' | 'vector' | 'tileset';

/**
 * 图层事件映射
 */
export interface LayerEvents {
  mounted: unknown;
  removed: unknown;
}

/**
 * 图层管理器引用接口（内部使用）
 */
export interface LayerManagerRef {
  remove(id: string): void;
}

/**
 * 图层公共接口
 *
 * @description
 * 所有图层类型实现的公共契约。定义了图层的标识、类型、
 * 响应式状态（可见性、透明度、层级）、渲染描述输出和生命周期方法。
 */
export interface Layer {
  /** 图层唯一标识 */
  readonly id: string;
  /** 图层类型 */
  readonly type: LayerType;
  /** 可见性信号 */
  readonly visible: Signal<boolean>;
  /** 透明度信号 (0.0 - 1.0) */
  readonly opacity: Signal<number>;
  /** 层级顺序信号 */
  readonly zIndex: Signal<number>;
  /** 输出渲染描述，供 EngineAdapter 消费 */
  toRenderSpec(): LayerRenderSpec;
  /** 返回底层原生对象（已挂载时）或 null */
  raw(): unknown;
  /** 显示图层 */
  show(): void;
  /** 隐藏图层 */
  hide(): void;
  /** 从管理器中移除图层 */
  remove(): void;
  /** 订阅图层事件 */
  on(event: 'mounted' | 'removed', cb: () => void): Off;
}

/**
 * 图层基类（内部抽象）
 *
 * @description
 * 封装所有图层类型共享的状态管理、响应式信号、事件派发和生命周期钩子。
 * 此类不作为公开 API 导出，仅用于内部继承实现。
 *
 * 子类需实现：
 * - {@link BaseLayer.buildSpec} — 构建当前图层的渲染描述
 * - {@link BaseLayer.mount} — 挂载到引擎适配器
 * - {@link BaseLayer.unmount} — 从引擎适配器卸载
 */
export abstract class BaseLayer implements Layer {
  /** 图层唯一标识 */
  readonly id: string;

  /** 图层类型 */
  readonly type: LayerType;

  /** 可见性信号 */
  readonly visible: Signal<boolean>;

  /** 透明度信号 (0.0 - 1.0) */
  readonly opacity: Signal<number>;

  /** 层级顺序信号 */
  readonly zIndex: Signal<number>;

  /** @internal 事件派发器 */
  protected readonly _emitter = new TypedEmitter<LayerEvents>();

  /** @internal 图层管理器引用 */
  protected _managerRef: LayerManagerRef | null = null;

  /**
   * 构造基类图层
   *
   * @param id - 图层唯一标识，缺省时自动生成 UUID
   * @param type - 图层类型
   */
  constructor(id: string | undefined, type: LayerType) {
    this.id = id || crypto.randomUUID();
    this.type = type;
    this.visible = signal(true);
    this.opacity = signal(1);
    this.zIndex = signal(0);
  }

  /** 显示图层 */
  show(): void {
    this.visible(true);
  }

  /** 隐藏图层 */
  hide(): void {
    this.visible(false);
  }

  /** 从管理器中移除图层 */
  remove(): void {
    if (this._managerRef) {
      this._managerRef.remove(this.id);
    }
  }

  /**
   * 订阅图层事件
   *
   * @param event - 事件名称
   * @param cb - 事件回调
   * @returns 取消订阅函数
   */
  on(event: 'mounted' | 'removed', cb: () => void): Off {
    return this._emitter.on(event, cb);
  }

  /**
   * 输出渲染描述
   *
   * @returns 当前图层状态对应的渲染描述对象
   */
  toRenderSpec(): LayerRenderSpec {
    return this.buildSpec();
  }

  /**
   * 返回底层原生对象
   *
   * @returns 已挂载时返回底层对象，否则返回 null
   */
  raw(): unknown {
    return null;
  }

  // ─── 内部生命周期方法（供 LayerManager 调用） ───

  /**
   * @internal 设置图层管理器引用
   * @param manager - 管理器实例或 null
   */
  _setManager(manager: LayerManagerRef | null): void {
    this._managerRef = manager;
  }

  /**
   * @internal 挂载到引擎适配器
   * @param adapter - 引擎适配器实例
   */
  _mount(adapter: EngineAdapter): void | Promise<void> {
    return this.mount(adapter);
  }

  /**
   * @internal 从引擎适配器卸载
   * @param adapter - 引擎适配器实例
   */
  _unmount(adapter: EngineAdapter): void | Promise<void> {
    return this.unmount(adapter);
  }

  /**
   * @internal 触发 mounted 事件
   */
  _emitMounted(): void {
    this._emitter.emit('mounted', {});
  }

  /**
   * @internal 触发 removed 事件
   */
  _emitRemoved(): void {
    this._emitter.emit('removed', {});
  }

  // ─── 抽象方法（子类必须实现） ───

  /**
   * 构建当前图层状态的渲染描述
   *
   * @returns 渲染描述对象
   */
  protected abstract buildSpec(): LayerRenderSpec;

  /**
   * 挂载到引擎适配器的实现
   *
   * @param adapter - 引擎适配器实例
   */
  protected abstract mount(adapter: EngineAdapter): void | Promise<void>;

  /**
   * 从引擎适配器卸载的实现
   *
   * @param adapter - 引擎适配器实例
   */
  protected abstract unmount(adapter: EngineAdapter): void | Promise<void>;
}
