import { signal, type ReadonlySignal } from '@cgx/reactive';
import type { LayerRenderSpec } from '../spec/layer.js';
import { TypedEmitter, type Off } from '../typed-events/Emitter.js';
import { CgxError, ErrorCodes } from '../errors/CgxError.js';
import type { Capability } from '../capability/Capability.js';
import type { BasemapSpec, SceneOptions, TerrainOptions, ViewerOptions } from '../types.js';
import type { EngineAdapter } from '../adapter/EngineAdapter.js';

export interface CgxViewerOptions {
  adapter: EngineAdapter;
  scene?: SceneOptions;
  terrain?: TerrainOptions;
  basemaps?: BasemapSpec[];
  layers?: LayerRenderSpec[];
}

export type ViewerStatus = 'idle' | 'ready' | 'disposing' | 'disposed';

export type ViewerStatusSignal = ReadonlySignal<ViewerStatus>;

export interface TypedEvents {
  ready: { viewer: CgxViewer };
  dispose: { viewer: CgxViewer };
  error: { error: Error };
  [key: string]: unknown;
}

interface InstalledCapabilityRecord {
  instance: unknown;
  dispose?: () => void;
  exposedKey?: string;
}

export class CgxViewer {
  readonly id: string;
  readonly status: ViewerStatusSignal;
  private readonly adapter: EngineAdapter;

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
    if (!opts.adapter) {
      throw new CgxError(ErrorCodes.INVALID_ARGUMENT, 'adapter is required');
    }
    this.id = crypto.randomUUID();
    this.status = this._status;
    this.options = this.normalizeOptions(opts);
    this.validateBaseOptions();

    this.adapter = opts.adapter;
    this.emitter = new TypedEmitter<TypedEvents>((_event, error) => {
      this.notifyUncaught(error);
    });
  }

  ready(): Promise<void> {
    if (this.isDisposed || this.isDisposing) {
      return Promise.reject(
        new CgxError(ErrorCodes.VIEWER_NOT_READY, 'Viewer is disposing or has been disposed')
      );
    }

    if (this.readyPromise) return this.readyPromise;

    this.readyPromise = (async () => {
      try {
        await this.adapter.bootstrap(this.options);

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
        await this.adapter.dispose();
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        this.reportError('Error disposing adapter', error);
      }

      this.isDisposed = true;
      this.isDisposing = false;
      this._status.set('disposed');
    })();

    return this.disposePromise;
  }

  getCesiumViewer(): unknown {
    return this.adapter.unsafeNative?.();
  }

  unsafeNative(): unknown {
    return this.getCesiumViewer();
  }

  on<K extends keyof TypedEvents>(event: K, handler: (payload: TypedEvents[K]) => void): Off {
    return this.emitter.on(event, handler);
  }

  once<K extends keyof TypedEvents>(event: K, handler: (payload: TypedEvents[K]) => void): Off {
    return this.emitter.once(event, handler);
  }

  off<K extends keyof TypedEvents>(event: K, handler?: (payload: TypedEvents[K]) => void): void {
    this.emitter.off(event, handler);
  }

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

export function getViewerRuntime(viewer: CgxViewer): EngineAdapter {
  return (viewer as unknown as { readonly adapter: EngineAdapter }).adapter;
}
