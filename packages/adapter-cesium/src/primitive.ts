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
 * - 延迟创建
 * - 挂载 / 卸载
 * - 销毁
 */
export abstract class PrimitiveBase<TPrimitive extends Cesium.Primitive = Cesium.Primitive> {
  private _primitive: TPrimitive | null = null;
  private _attached = false;
  private readonly _autoAttach: boolean;

  constructor(protected readonly viewer: CesiumViewerHandle, options: PrimitiveLifecycleOptions = {}) {
    this._autoAttach = options.autoAttach ?? true;
  }

  /**
   * 获取当前原语实例
   */
  get primitive(): TPrimitive | null {
    return this._primitive;
  }

  /**
   * 是否已完成初始化
   */
  get isInitialized(): boolean {
    return this._primitive !== null;
  }

  /**
   * 是否已挂载到场景
   */
  get isAttached(): boolean {
    return this._attached;
  }

  /**
   * 初始化原语
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
   * 创建 Cesium 原语实例
   */
  protected abstract _createPrimitive(): TPrimitive | Promise<TPrimitive>;

  /**
   * 初始化完成后的钩子
   */
  protected _onInit(_primitive: TPrimitive): void {
    // 默认无操作
  }

  /**
   * 挂载完成后的钩子
   */
  protected _onAttach(_viewer: Cesium.Viewer, _primitive: TPrimitive): void {
    // 默认无操作
  }

  /**
   * 卸载完成后的钩子
   */
  protected _onDetach(_viewer: Cesium.Viewer, _primitive: TPrimitive): void {
    // 默认无操作
  }

  /**
   * 销毁前的钩子
   */
  protected _onDispose(_primitive: TPrimitive): void {
    // 默认无操作
  }
}
