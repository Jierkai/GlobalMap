import type { CesiumViewerHandle } from '@cgx/adapter-cesium';

export type { CesiumViewerHandle };

export enum WeatherType {
  Rain = 'rain',
  Snow = 'snow',
  Fog = 'fog',
  Cloud = 'cloud',
  Lightning = 'lightning',
  Custom = 'custom',
}

export enum WeatherState {
  Idle = 'idle',
  Initializing = 'initializing',
  Running = 'running',
  Paused = 'paused',
  Stopping = 'stopping',
  Stopped = 'stopped',
  Error = 'error',
}

export interface WeatherBaseConfig {
  intensity?: number;
  speed?: number;
  radius?: number;
  altitude?: number;
  opacity?: number;
  enabled?: boolean;
}

export interface RainConfig extends WeatherBaseConfig {
  dropSize?: number;
  dropColor?: string;
  windDirection?: number;
  windSpeed?: number;
}

export interface SnowConfig extends WeatherBaseConfig {
  flakeSize?: number;
  flakeTexture?: string;
  accumulation?: number;
  windDirection?: number;
  windSpeed?: number;
}

export interface FogConfig extends WeatherBaseConfig {
  density?: number;
  color?: string;
  minHeight?: number;
  maxHeight?: number;
}

export interface CloudConfig extends WeatherBaseConfig {
  coverage?: number;
  driftSpeed?: number;
  cloudColor?: string;
}

export interface LightningConfig extends WeatherBaseConfig {
  interval?: number;
  flashDuration?: number;
  flashColor?: string;
  branchCount?: number;
}

export type WeatherEffectConfig =
  | ({ type: WeatherType.Rain } & RainConfig)
  | ({ type: WeatherType.Snow } & SnowConfig)
  | ({ type: WeatherType.Fog } & FogConfig)
  | ({ type: WeatherType.Cloud } & CloudConfig)
  | ({ type: WeatherType.Lightning } & LightningConfig)
  | WeatherEffect<WeatherBaseConfig>;

export type WeatherStateListener = (
  previousState: WeatherState,
  currentState: WeatherState,
) => void;

export type WeatherConfigListener = (changedKeys: string[]) => void;

export type Off = () => void;

export abstract class WeatherEffect<TConfig extends WeatherBaseConfig> {
  abstract readonly type: WeatherType;

  private _state: WeatherState = WeatherState.Idle;
  private readonly _stateListeners = new Set<WeatherStateListener>();
  private readonly _configListeners = new Set<WeatherConfigListener>();

  constructor(
    protected readonly viewer: CesiumViewerHandle,
    protected config: TConfig,
  ) {}

  get state(): WeatherState {
    return this._state;
  }

  get currentConfig(): Readonly<TConfig> {
    return { ...this.config };
  }

  async init(): Promise<void> {
    if (this._state !== WeatherState.Idle && this._state !== WeatherState.Stopped) {
      throw new Error(
        `[WeatherEffect] 不能在 "${this._state}" 状态下执行 init()，` +
        `仅允许在 "${WeatherState.Idle}" 或 "${WeatherState.Stopped}" 状态下调用`,
      );
    }

    this._transitionTo(WeatherState.Initializing);
    try {
      await this._onInit();
      this._transitionTo(WeatherState.Idle);
    } catch (error) {
      this._transitionTo(WeatherState.Error);
      throw error;
    }
  }

  async start(): Promise<void> {
    if (this._state === WeatherState.Running) return;
    if (this._state === WeatherState.Initializing) {
      throw new Error(`[WeatherEffect] 不能在 "${WeatherState.Initializing}" 状态下执行 start()`);
    }
    if (this._state === WeatherState.Stopping) {
      throw new Error(`[WeatherEffect] 不能在 "${WeatherState.Stopping}" 状态下执行 start()`);
    }
    if (this._state === WeatherState.Error) {
      throw new Error(`[WeatherEffect] 不能在 "${WeatherState.Error}" 状态下执行 start()`);
    }
    if (this._state === WeatherState.Idle) {
      await this.init();
    }

    this._onStart();
    this._transitionTo(WeatherState.Running);
  }

  stop(): void {
    if (this._state === WeatherState.Idle || this._state === WeatherState.Stopped) return;
    if (this._state === WeatherState.Initializing) {
      throw new Error(`[WeatherEffect] 不能在 "${WeatherState.Initializing}" 状态下执行 stop()`);
    }
    if (this._state === WeatherState.Stopping) return;

    this._transitionTo(WeatherState.Stopping);
    try {
      this._onStop();
      this._transitionTo(WeatherState.Stopped);
    } catch (error) {
      this._transitionTo(WeatherState.Error);
      throw error;
    }
  }

  pause(): void {
    if (this._state !== WeatherState.Running) return;
    this._onPause();
    this._transitionTo(WeatherState.Paused);
  }

  resume(): void {
    if (this._state !== WeatherState.Paused) return;
    this._onResume();
    this._transitionTo(WeatherState.Running);
  }

  updateConfig(partialConfig: Partial<TConfig>): void {
    const changedKeys: string[] = [];
    for (const key of Object.keys(partialConfig) as (keyof TConfig)[]) {
      if (partialConfig[key] !== undefined && partialConfig[key] !== this.config[key]) {
        (this.config as Record<keyof TConfig, unknown>)[key] = partialConfig[key]!;
        changedKeys.push(key as string);
      }
    }
    if (changedKeys.length === 0) return;

    this._onConfigUpdate(changedKeys);
    this._notifyConfigListeners(changedKeys);
  }

  dispose(): void {
    if (this._state === WeatherState.Idle) return;
    if (this._state === WeatherState.Running || this._state === WeatherState.Paused) {
      this._onStop();
    }
    this._onDispose();
    this._stateListeners.clear();
    this._configListeners.clear();
    this._transitionTo(WeatherState.Idle);
  }

  onStateChange(listener: WeatherStateListener): Off {
    this._stateListeners.add(listener);
    return () => {
      this._stateListeners.delete(listener);
    };
  }

  onConfigChange(listener: WeatherConfigListener): Off {
    this._configListeners.add(listener);
    return () => {
      this._configListeners.delete(listener);
    };
  }

  protected abstract _onInit(): Promise<void>;
  protected abstract _onStart(): void;
  protected abstract _onStop(): void;
  protected abstract _onDispose(): void;

  protected _onPause(): void {}
  protected _onResume(): void {}
  protected _onConfigUpdate(_changedKeys: string[]): void {}

  private _transitionTo(nextState: WeatherState): void {
    const previousState = this._state;
    this._state = nextState;
    this._notifyStateListeners(previousState, nextState);
  }

  private _notifyStateListeners(previousState: WeatherState, currentState: WeatherState): void {
    for (const listener of this._stateListeners) {
      try {
        listener(previousState, currentState);
      } catch {
        // Listener errors must not break lifecycle transitions.
      }
    }
  }

  private _notifyConfigListeners(changedKeys: string[]): void {
    for (const listener of this._configListeners) {
      try {
        listener(changedKeys);
      } catch {
        // Listener errors must not break config updates.
      }
    }
  }
}

export interface WeatherManager {
  apply(effects: WeatherEffect<WeatherBaseConfig>[]): Promise<void>;
  dismiss(effects: WeatherEffect<WeatherBaseConfig>[]): void;
  transition(
    from: WeatherEffect<WeatherBaseConfig> | null,
    to: WeatherEffect<WeatherBaseConfig>,
    options?: WeatherTransitionOptions,
  ): Promise<void>;
  getActiveEffects(): WeatherEffect<WeatherBaseConfig>[];
  disposeAll(): void;
}

export interface WeatherEffectManager extends WeatherManager {
  initFromConfigs(configs: WeatherEffectConfig[]): Promise<void>;
  addEffect(effect: WeatherEffect<WeatherBaseConfig>): void;
  removeEffect(effect: WeatherEffect<WeatherBaseConfig>): void;
  enableEffect(type: WeatherType): Promise<boolean>;
  disableEffect(type: WeatherType): boolean;
  getEffectByType(type: WeatherType): WeatherEffect<WeatherBaseConfig> | undefined;
  getAllEffects(): WeatherEffect<WeatherBaseConfig>[];
}

export interface WeatherTransitionOptions {
  duration?: number;
  keepBase?: boolean;
}
