import { signal, type ReadonlySignal } from '@cgx/reactive';
import {
  createCesiumRuntime,
  createViewer as createCesiumViewer,
  type CesiumRuntime,
  type CesiumViewerHandle,
  type CesiumViewerOptions,
} from '@cgx/adapter-cesium';
import type { LayerRenderSpec } from '../spec/layer.js';
import { TypedEmitter, type Off } from '../typed-events/Emitter.js';
import { CgxError, ErrorCodes } from '../errors/CgxError.js';
import type { Capability } from '../capability/Capability.js';
import type { BasemapSpec, SceneOptions, TerrainOptions, ViewerOptions } from '../types.js';

/**
 * 创建 CgxViewer 实例的配置项。
 */
export interface CgxViewerOptions {
  /** Viewer 容器元素或元素 ID。 */
  container: string | HTMLElement;
  /** Cesium Viewer 原生构造配置。 */
  cesium?: CesiumViewerOptions;
  /** 场景初始化配置。 */
  scene?: SceneOptions;
  /** 地形初始化配置。 */
  terrain?: TerrainOptions;
  /** 初始化底图配置。 */
  basemaps?: BasemapSpec[];
  /** 初始化图层配置。 */
  layers?: LayerRenderSpec[];
}

/** 表示视图生命周期的状态。 */
export type ViewerStatus = 'idle' | 'ready' | 'disposing' | 'disposed';

/** 返回视图状态的响应式信号。 */
export type ViewerStatusSignal = ReadonlySignal<ViewerStatus>;

/** 视图派发的强类型事件。 */
export interface TypedEvents {
  /** 当视图成功挂载并初始化时触发。 */
  ready: { viewer: CgxViewer };
  /** 在视图开始卸载和销毁之前触发。 */
  dispose: { viewer: CgxViewer };
  /** 初始化过程中发生严重错误时触发。 */
  error: { error: Error };
  [key: string]: unknown;
}

interface InstalledCapabilityRecord {
  instance: unknown;
  dispose?: () => void;
  exposedKey?: string;
}

/**
 * Cgx 框架的核心 Viewer 实例。
 * 提供响应式生命周期、强类型的事件派发以及基于能力组合的插件系统。
 */
export class CgxViewer {
  /** 视图实例的唯一标识符。 */
  readonly id: string;
  /** 持有当前生命周期状态的响应式信号。 */
  readonly status: ViewerStatusSignal;
  /** Cesium runtime 实例。 */
  private readonly runtime: CesiumRuntime;
  private readonly handle: CesiumViewerHandle;

  private readonly emitter: TypedEmitter<TypedEvents>;
  private readonly installedCapabilities = new Map<string, InstalledCapabilityRecord>();
  private readonly uncaughtHandlers = new Set<(error: Error) => void>();
  readonly options: ViewerOptions;
  private readonly _status = signal<ViewerStatus>('idle');

  private readyPromise: Promise<void> | null = null;
  private disposePromise: Promise<void> | null = null;
  private isDisposed = false;
  private isDisposing = false;

  constructor(opts: CgxViewerOptions) {
    const { container } = opts;
    if (typeof container !== 'string' && !(container instanceof HTMLElement)) {
      throw new CgxError(ErrorCodes.INVALID_ARGUMENT, 'Container must be an HTMLElement or a string ID');
    }
    if (typeof container === 'string' && container.trim() === '') {
      throw new CgxError(ErrorCodes.INVALID_ARGUMENT, 'Container must be an HTMLElement or a string ID');
    }
    this.id = crypto.randomUUID();
    this.status = this._status;
    this.options = this.normalizeOptions(opts);
    this.validateBaseOptions();

    this.handle = createCesiumViewer(container, opts.cesium);
    this.runtime = createCesiumRuntime(this.handle);
    this.emitter = new TypedEmitter<TypedEvents>((_event, error) => {
      this.notifyUncaught(error);
    });
  }

  /** 初始化视图及其适配器。当完全准备就绪时决议 Promise。 */
  ready(): Promise<void> {
    if (this.isDisposed || this.isDisposing) {
      return Promise.reject(
        new CgxError(ErrorCodes.VIEWER_NOT_READY, 'Viewer is disposing or has been disposed')
      );
    }

    if (this.readyPromise) return this.readyPromise;

    this.readyPromise = (async () => {
      try {
        await this.runtime.bootstrap?.(this.options);

        if (this.isDisposed || this.isDisposing) {
          throw new CgxError(ErrorCodes.VIEWER_NOT_READY, 'Viewer was disposed before initialization completed');
        }

        this._status.set('ready');
        this.emitter.emit('ready', { viewer: this });
      } catch (err) {
        const error = err instanceof CgxError
          ? err
          : new CgxError(ErrorCodes.INITIALIZATION_FAILED, 'Viewer initialization failed', err);
        this.reportError('Viewer initialization failed', error);
        throw error;
      }
    })();

    return this.readyPromise;
  }

  /** 幂等性地销毁视图、适配器及所有已安装的能力插件。 */
  dispose(): Promise<void> {
    if (this.disposePromise) return this.disposePromise;

    this.disposePromise = (async () => {
      if (this.isDisposed) return;

      this.isDisposing = true;
      this._status.set('disposing');

      if (this.readyPromise) {
        void this.readyPromise.catch(() => undefined);
      }

      this.emitter.emit('dispose', { viewer: this });

      for (const [capId, cap] of this.installedCapabilities.entries()) {
        if (typeof cap.dispose !== 'function') continue;

        try {
          cap.dispose();
        } catch (err) {
          const error = err instanceof Error ? err : new Error(String(err));
          this.reportError(`Error disposing capability ${capId}`, error);
        }
      }
      for (const cap of this.installedCapabilities.values()) {
        this.removeExposedCapability(cap.exposedKey);
      }
      this.installedCapabilities.clear();

      try {
        await this.runtime.dispose?.();
        this.handle.destroy();
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        this.reportError('Error disposing Cesium runtime', error);
      }

      this.isDisposed = true;
      this.isDisposing = false;
      this._status.set('disposed');
    })();

    return this.disposePromise;
  }

  /** 返回底层 Cesium Viewer 对象。 */
  getCesiumViewer(): unknown {
    return this.runtime.unsafeNative?.();
  }

  /** 返回底层 Cesium Viewer 对象。 */
  unsafeNative(): unknown {
    return this.getCesiumViewer();
  }

  /** 订阅一个强类型事件。 */
  on<K extends keyof TypedEvents>(event: K, handler: (payload: TypedEvents[K]) => void): Off {
    return this.emitter.on(event, handler);
  }

  /** 仅订阅一次强类型事件。 */
  once<K extends keyof TypedEvents>(event: K, handler: (payload: TypedEvents[K]) => void): Off {
    return this.emitter.once(event, handler);
  }

  /** 取消订阅一个强类型事件。如果未提供处理函数，则移除该事件下的所有处理函数。 */
  off<K extends keyof TypedEvents>(event: K, handler?: (payload: TypedEvents[K]) => void): void {
    this.emitter.off(event, handler);
  }

  /**
   * 将一个能力插件注入到视图中。
   * 如果该能力已被安装，将抛出错误。
   * @param capability 要安装的能力插件。
   */
  use<T>(capability: Capability<T>): T {
    this.assertActive();

    if (this.installedCapabilities.has(capability.id)) {
      throw new CgxError(ErrorCodes.CAPABILITY_ALREADY_INSTALLED, `Capability ${capability.id} is already installed`);
    }

    try {
      const instance = capability.install(this);
      const record: InstalledCapabilityRecord = { instance };

      if (capability.dispose) {
        record.dispose = capability.dispose.bind(capability);
      }
      const exposedKey = this.exposeCapability(capability.id, instance);
      if (exposedKey) {
        record.exposedKey = exposedKey;
      }

      this.installedCapabilities.set(capability.id, record);
      return instance;
    } catch (err) {
      const error = err instanceof CgxError
        ? err
        : new CgxError(ErrorCodes.INITIALIZATION_FAILED, `Failed to install capability ${capability.id}`, err);
      this.reportError(`Failed to install capability ${capability.id}`, error);
      throw error;
    }
  }

  /**
   * 注册一个用于捕获事件派发或渲染期间未被捕获错误的处理函数。
   * @param handler 错误回调函数。
   */
  onUncaught(handler: (error: Error) => void): Off {
    this.uncaughtHandlers.add(handler);
    return () => this.uncaughtHandlers.delete(handler);
  }

  private assertActive(): void {
    if (this.isDisposed || this.isDisposing) {
      throw new CgxError(ErrorCodes.VIEWER_NOT_READY, 'Viewer is disposing or has been disposed');
    }
  }

  private normalizeOptions(opts: CgxViewerOptions): ViewerOptions {
    if ('options' in opts && (opts as { options?: unknown }).options !== undefined) {
      throw new CgxError(
        ErrorCodes.INVALID_VIEWER_OPTIONS,
        'CgxViewer no longer accepts nested options. Use top-level scene/terrain/basemaps/layers fields.'
      );
    }

    const { scene, terrain, basemaps, layers } = opts;
    const normalized: ViewerOptions = {};
    if (scene !== undefined) normalized.scene = scene;
    if (terrain !== undefined) normalized.terrain = terrain;
    if (basemaps !== undefined) normalized.basemaps = basemaps;
    if (layers !== undefined) normalized.layers = layers;
    return normalized;
  }

  private validateBaseOptions(): void {


    const { scene, basemaps, layers } = this.options;
    if (scene?.center) {
      const { lng, lat } = scene.center;
      if (!Number.isFinite(lng) || !Number.isFinite(lat)) {
        throw new CgxError(ErrorCodes.INVALID_VIEWER_OPTIONS, 'scene.center requires finite lng/lat');
      }
    }
    if (scene?.resolutionScale !== undefined && (!Number.isFinite(scene.resolutionScale) || scene.resolutionScale <= 0)) {
      throw new CgxError(ErrorCodes.INVALID_VIEWER_OPTIONS, 'scene.resolutionScale must be a finite number > 0');
    }

    this.validateLayerSpecs('basemaps', basemaps);
    this.validateLayerSpecs('layers', layers);
  }

  private validateLayerSpecs(field: 'basemaps' | 'layers', value: ViewerOptions['basemaps'] | ViewerOptions['layers']): void {
    if (value === undefined) return;
    if (!Array.isArray(value)) {
      throw new CgxError(ErrorCodes.INVALID_VIEWER_OPTIONS, `${field} must be an array`);
    }
    for (const layer of value) {
      if (!layer || typeof layer !== 'object' || typeof layer.id !== 'string') {
        throw new CgxError(ErrorCodes.INVALID_VIEWER_OPTIONS, `${field} contains an invalid layer item`);
      }
      if (field === 'layers' && typeof (layer as LayerRenderSpec).kind !== 'string') {
        throw new CgxError(ErrorCodes.INVALID_VIEWER_OPTIONS, `${field} contains an invalid layer item`);
      }
      if (field === 'basemaps') {
        const basemap = layer as BasemapSpec;
        if ('kind' in basemap) {
          if (basemap.kind !== 'imagery') {
            throw new CgxError(ErrorCodes.INVALID_VIEWER_OPTIONS, 'basemaps only support imagery layers or preset basemaps');
          }
        } else if (typeof basemap.provider !== 'string') {
          throw new CgxError(ErrorCodes.INVALID_VIEWER_OPTIONS, 'basemaps preset items require a string provider');
        }
      }
    }
  }

  private exposeCapability(key: string, instance: unknown): string | undefined {
    if (key in this) return undefined;

    Object.defineProperty(this, key, {
      configurable: true,
      enumerable: false,
      value: instance,
    });
    return key;
  }

  private removeExposedCapability(key: string | undefined): void {
    if (!key) return;
    delete (this as unknown as Record<string, unknown>)[key];
  }

  private reportError(message: string, error: Error): void {
    console.error(message, error);
    this.emitter.emit('error', { error });
    this.notifyUncaught(error);
  }

  private notifyUncaught(error: Error): void {
    if (this.uncaughtHandlers.size === 0) return;

    for (const handler of Array.from(this.uncaughtHandlers)) {
      try {
        handler(error);
      } catch (err) {
        console.error('Error in onUncaught handler', err);
      }
    }
  }
}

export function getViewerRuntime(viewer: CgxViewer): CesiumRuntime {
  return (viewer as unknown as { readonly runtime: CesiumRuntime }).runtime;
}

/**
 * 创建一个新的 CgxViewer 实例。
 */
export function createViewer(opts: CgxViewerOptions): CgxViewer {
  return new CgxViewer(opts);
}
