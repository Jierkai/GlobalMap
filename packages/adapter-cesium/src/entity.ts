import * as Cesium from 'cesium';
import { CesiumViewerHandle } from './types';
import { _getInternalViewer } from './viewer';

/**
 * 实体生命周期选项
 */
export interface EntityLifecycleOptions {
  /** 是否在 `init()` 后自动挂载到 Viewer.entities，默认 true */
  autoAttach?: boolean;
}

/**
 * 实体基类
 *
 * @description
 * 提供 Cesium `Entity` 的通用生命周期管理和配置更新能力。
 * 子类只需要实现 `_createEntityOptions()`，并可按需覆写事件钩子。
 */
export abstract class EntityBase<
  TOptions extends Cesium.Entity.ConstructorOptions = Cesium.Entity.ConstructorOptions,
  TEntity extends Cesium.Entity = Cesium.Entity,
> {
  private _entity: TEntity | null = null;
  private _attached = false;
  private _options: TOptions | null = null;
  private readonly _autoAttach: boolean;

  constructor(protected readonly viewer: CesiumViewerHandle, options: EntityLifecycleOptions = {}) {
    this._autoAttach = options.autoAttach ?? true;
  }

  /**
   * 当前实体实例
   */
  get entity(): TEntity | null {
    return this._entity;
  }

  /**
   * 当前实体配置
   */
  get currentOptions(): Readonly<TOptions> {
    return (this._options ? { ...this._options } : {}) as Readonly<TOptions>;
  }

  /**
   * 是否已完成初始化
   */
  get isInitialized(): boolean {
    return this._options !== null;
  }

  /**
   * 是否已挂载到 Viewer.entities
   */
  get isAttached(): boolean {
    return this._attached;
  }

  /**
   * 初始化实体配置，并按需自动挂载
   */
  async init(): Promise<TOptions> {
    if (!this._options) {
      this._options = await this._createEntityOptions();
      this._onInit(this._options);
    }

    if (this._autoAttach) {
      this.attach();
    }

    return this._options;
  }

  /**
   * 将实体挂载到 Viewer.entities
   */
  attach(): boolean {
    const viewer = _getInternalViewer(this.viewer);
    if (!viewer || !this._options) return false;
    if (this._attached) return true;

    this._entity = viewer.entities.add(this._options as Cesium.Entity.ConstructorOptions) as TEntity;
    this._attached = true;
    this._onAttach(viewer, this._entity);
    return true;
  }

  /**
   * 从 Viewer.entities 卸载实体
   */
  detach(): boolean {
    const viewer = _getInternalViewer(this.viewer);
    const entity = this._entity;
    if (!viewer || !entity || !this._attached) return false;

    viewer.entities.remove(entity);
    this._attached = false;
    this._entity = null;
    this._onDetach(viewer, entity);
    return true;
  }

  /**
   * 更新实体配置并同步到已挂载实例
   */
  update(options: Partial<TOptions>): void {
    this._options = {
      ...(this._options ?? ({} as TOptions)),
      ...options,
    };

    if (this._entity) {
      this._applyEntityUpdate(this._entity, options as Partial<Cesium.Entity.ConstructorOptions>);
    }

    this._onUpdate(options);
  }

  /**
   * 销毁实体并释放资源
   */
  dispose(): void {
    const entity = this._entity;
    if (!entity) {
      this._options = null;
      this._attached = false;
      return;
    }

    if (this._attached) {
      this.detach();
    }

    this._onDispose(entity);
    this._entity = null;
    this._options = null;
    this._attached = false;
  }

  /**
   * 创建实体配置
   */
  protected abstract _createEntityOptions(): TOptions | Promise<TOptions>;

  /**
   * 初始化完成后的钩子
   */
  protected _onInit(_options: TOptions): void {
    // 默认无操作
  }

  /**
   * 挂载完成后的钩子
   */
  protected _onAttach(_viewer: Cesium.Viewer, _entity: TEntity): void {
    // 默认无操作
  }

  /**
   * 卸载完成后的钩子
   */
  protected _onDetach(_viewer: Cesium.Viewer, _entity: TEntity): void {
    // 默认无操作
  }

  /**
   * 配置更新后的钩子
   */
  protected _onUpdate(_options: Partial<TOptions>): void {
    // 默认无操作
  }

  /**
   * 销毁前的钩子
   */
  protected _onDispose(_entity: TEntity): void {
    // 默认无操作
  }

  /**
   * 将部分更新应用到现有实体
   */
  private _applyEntityUpdate(entity: Cesium.Entity, options: Partial<Cesium.Entity.ConstructorOptions>): void {
    if (options.position) {
      entity.position = options.position as any;
    }
    if (options.point) {
      this._mergeEntityProperty(entity, 'point', options.point);
    }
    if (options.polyline) {
      this._mergeEntityProperty(entity, 'polyline', options.polyline);
    }
    if (options.polygon) {
      this._mergeEntityProperty(entity, 'polygon', options.polygon);
    }
    if (options.model) {
      this._mergeEntityProperty(entity, 'model', options.model);
    }
    if (options.properties) {
      entity.properties = options.properties as any;
    }
  }

  /**
   * 合并实体属性对象
   */
  private _mergeEntityProperty(entity: Cesium.Entity, key: string, value: any): void {
    if (!entity[key as keyof Cesium.Entity]) {
      (entity as any)[key] = value;
      return;
    }

    const prop = entity[key as keyof Cesium.Entity] as any;
    for (const k of Object.keys(value)) {
      prop[k] = value[k];
    }
  }
}
