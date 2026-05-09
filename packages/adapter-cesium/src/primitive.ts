/**
 * @fileoverview 原语基类模块
 * 提供 Cesium Primitive 的通用生命周期管理
 * 
 * @module primitive
 * @description
 * 该模块提供了 Cesium Primitive 的抽象基类，封装了：
 * - 延迟创建（Lazy Initialization）
 * - 自动/手动挂载到场景
 * - 从场景卸载
 * - 销毁和资源释放
 * 
 * 子类只需实现 `_createPrimitive()` 方法即可获得完整的生命周期管理。
 */

import * as Cesium from 'cesium';
import { CesiumViewerHandle } from './types';
import { _getInternalViewer } from './viewer';

/**
 * 原语生命周期选项
 */
export interface PrimitiveLifecycleOptions {
  /** 是否在 `init()` 后自动挂载到场景中，默认 true */
  autoAttach?: boolean;
}

/**
 * 原语基类
 *
 * @description
 * 提供 Cesium `Primitive` 的通用生命周期管理：
 * - 延迟创建：通过 `init()` 触发实际创建
 * - 挂载 / 卸载：通过 `attach()` / `detach()` 控制场景可见性
 * - 销毁：通过 `dispose()` 释放所有资源
 * 
 * @typeParam TPrimitive - Cesium Primitive 的具体类型
 */
export abstract class PrimitiveBase<TPrimitive extends Cesium.Primitive = Cesium.Primitive> {
  /** 当前原语实例，未初始化时为 null */
  private _primitive: TPrimitive | null = null;
  /** 是否已挂载到场景 */
  private _attached = false;
  /** 是否在 init() 后自动挂载 */
  private readonly _autoAttach: boolean;

  /**
   * 创建原语基类实例
   * 
   * @param viewer - Cesium Viewer 句柄
   * @param options - 生命周期选项
   */
  constructor(protected readonly viewer: CesiumViewerHandle, options: PrimitiveLifecycleOptions = {}) {
    this._autoAttach = options.autoAttach ?? true;
  }

  /**
   * 获取当前原语实例
   * 
   * @returns {TPrimitive | null} 原语实例，未初始化时返回 null
   */
  get primitive(): TPrimitive | null {
    return this._primitive;
  }

  /**
   * 是否已完成初始化
   * 
   * @returns {boolean} 已初始化返回 true
   */
  get isInitialized(): boolean {
    return this._primitive !== null;
  }

  /**
   * 是否已挂载到场景
   * 
   * @returns {boolean} 已挂载返回 true
   */
  get isAttached(): boolean {
    return this._attached;
  }

  /**
   * 初始化原语
   * 
   * @description
   * 调用子类实现的 `_createPrimitive()` 创建原语实例。
   * 如果已初始化则直接返回现有实例。
   * 初始化完成后，如果 `autoAttach` 为 true 则自动挂载到场景。
   * 
   * @returns {Promise<TPrimitive>} 创建的原语实例
   */
  async init(): Promise<TPrimitive> {
    if (this._primitive) {
      return this._primitive;
    }

    const primitive = await this._createPrimitive();
    this._primitive = primitive;
    this._onInit(primitive);

    if (this._autoAttach) {
      this.attach();
    }

    return primitive;
  }

  /**
   * 将原语挂载到场景
   * 
   * @description
   * 将原语添加到 viewer.scene.primitives 集合中。
   * 如果已挂载则直接返回 true。
   * 
   * @returns {boolean} 挂载成功返回 true，未初始化或 Viewer 无效返回 false
   */
  attach(): boolean {
    const viewer = _getInternalViewer(this.viewer);
    const primitive = this._primitive;
    if (!viewer || !primitive) return false;
    if (this._attached) return true;

    if (!viewer.scene.primitives.contains(primitive)) {
      viewer.scene.primitives.add(primitive);
    }
    this._attached = true;
    this._onAttach(viewer, primitive);
    return true;
  }

  /**
   * 从场景卸载原语
   * 
   * @description
   * 从 viewer.scene.primitives 集合中移除原语。
   * 如果未挂载则直接返回 false。
   * 
   * @returns {boolean} 卸载成功返回 true，未挂载或 Viewer 无效返回 false
   */
  detach(): boolean {
    const viewer = _getInternalViewer(this.viewer);
    const primitive = this._primitive;
    if (!viewer || !primitive || !this._attached) return false;

    if (viewer.scene.primitives.contains(primitive)) {
      viewer.scene.primitives.remove(primitive);
    }
    this._attached = false;
    this._onDetach(viewer, primitive);
    return true;
  }

  /**
   * 销毁原语并释放资源
   * 
   * @description
   * 先从场景卸载，然后调用原语的 destroy() 方法释放 GPU 资源。
   * 销毁后所有引用将被清除。
   */
  dispose(): void {
    const primitive = this._primitive;
    if (!primitive) return;

    if (this._attached) {
      this.detach();
    }

    this._onDispose(primitive);
    if (!primitive.isDestroyed()) {
      primitive.destroy();
    }

    this._primitive = null;
    this._attached = false;
  }

  /**
   * 创建 Cesium 原语实例（子类必须实现）
   * 
   * @returns {TPrimitive | Promise<TPrimitive>} 创建的原语实例
   */
  protected abstract _createPrimitive(): TPrimitive | Promise<TPrimitive>;

  /**
   * 初始化完成后的钩子
   * 
   * @param _primitive - 创建的原语实例
   */
  protected _onInit(_primitive: TPrimitive): void {
    // 默认无操作
  }

  /**
   * 挂载完成后的钩子
   * 
   * @param _viewer - Cesium Viewer 实例
   * @param _primitive - 挂载的原语实例
   */
  protected _onAttach(_viewer: Cesium.Viewer, _primitive: TPrimitive): void {
    // 默认无操作
  }

  /**
   * 卸载完成后的钩子
   * 
   * @param _viewer - Cesium Viewer 实例
   * @param _primitive - 卸载的原语实例
   */
  protected _onDetach(_viewer: Cesium.Viewer, _primitive: TPrimitive): void {
    // 默认无操作
  }

  /**
   * 销毁前的钩子
   * 
   * @param _primitive - 即将销毁的原语实例
   */
  protected _onDispose(_primitive: TPrimitive): void {
    // 默认无操作
  }
}
