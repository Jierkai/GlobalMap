import { computed, signal, type Off, type ReadonlySignal, type Signal } from '@cgx/reactive';
import type { WeatherEffectSpec } from '@cgx/core';
import {
  WeatherState,
  type WeatherBaseConfig,
  type WeatherConfigListener,
  type WeatherEffectLike,
  type WeatherStateListener,
} from './types.js';

export abstract class WeatherEffect<TConfig extends WeatherBaseConfig>
  implements WeatherEffectLike<TConfig> {
  abstract readonly type: string;

  readonly id: string;
  readonly state: Signal<WeatherState>;
  readonly enabled: Signal<boolean>;
  readonly config: Signal<TConfig>;
  readonly spec: ReadonlySignal<WeatherEffectSpec>;

  private _currentState: WeatherState = WeatherState.Idle;
  private readonly _stateListeners = new Set<WeatherStateListener>();
  private readonly _configListeners = new Set<WeatherConfigListener>();

  protected constructor(initialConfig: TConfig, id: string = crypto.randomUUID()) {
    this.id = id;
    this.state = signal<WeatherState>(WeatherState.Idle);
    this.enabled = signal(Boolean(initialConfig.enabled ?? false));
    this.config = signal({ ...initialConfig });
    this.spec = computed(() => this.toSpec());
  }

  get currentConfig(): Readonly<TConfig> {
    return this.config.get();
  }

  async init(): Promise<void> {
    if (this._currentState !== WeatherState.Idle && this._currentState !== WeatherState.Stopped) {
      throw new Error(
        `[WeatherEffect] 不能在 "${this._currentState}" 状态下执行 init()，` +
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
    if (this._currentState === WeatherState.Running) return;
    if (this._currentState === WeatherState.Initializing) {
      throw new Error(`[WeatherEffect] 不能在 "${WeatherState.Initializing}" 状态下执行 start()`);
    }
    if (this._currentState === WeatherState.Stopping) {
      throw new Error(`[WeatherEffect] 不能在 "${WeatherState.Stopping}" 状态下执行 start()`);
    }
    if (this._currentState === WeatherState.Error) {
      throw new Error(`[WeatherEffect] 不能在 "${WeatherState.Error}" 状态下执行 start()`);
    }
    if (this._currentState === WeatherState.Idle) {
      await this.init();
    }

    this._onStart();
    this.enabled.set(true);
    this._transitionTo(WeatherState.Running);
  }

  stop(): void {
    if (this._currentState === WeatherState.Idle || this._currentState === WeatherState.Stopped) return;
    if (this._currentState === WeatherState.Initializing) {
      throw new Error(`[WeatherEffect] 不能在 "${WeatherState.Initializing}" 状态下执行 stop()`);
    }
    if (this._currentState === WeatherState.Stopping) return;

    this._transitionTo(WeatherState.Stopping);
    try {
      this._onStop();
      this.enabled.set(false);
      this._transitionTo(WeatherState.Stopped);
    } catch (error) {
      this._transitionTo(WeatherState.Error);
      throw error;
    }
  }

  pause(): void {
    if (this._currentState !== WeatherState.Running) return;
    this._onPause();
    this.enabled.set(false);
    this._transitionTo(WeatherState.Paused);
  }

  resume(): void {
    if (this._currentState !== WeatherState.Paused) return;
    this._onResume();
    this.enabled.set(true);
    this._transitionTo(WeatherState.Running);
  }

  updateConfig(partialConfig: Partial<TConfig>): void {
    const changedKeys: string[] = [];
    const nextConfig = { ...this.config.get() } as TConfig;

    for (const key of Object.keys(partialConfig) as (keyof TConfig)[]) {
      const nextValue = partialConfig[key];
      if (nextValue !== undefined && nextValue !== nextConfig[key]) {
        (nextConfig as Record<keyof TConfig, unknown>)[key] = nextValue as TConfig[keyof TConfig];
        changedKeys.push(key as string);
      }
    }

    if (changedKeys.length === 0) return;

    this.config.set(nextConfig);
    if (typeof nextConfig.enabled === 'boolean') {
      this.enabled.set(nextConfig.enabled);
    }
    this._onConfigUpdate(changedKeys);
    this._notifyConfigListeners(changedKeys);
  }

  dispose(): void {
    if (this._currentState === WeatherState.Running || this._currentState === WeatherState.Paused) {
      this._onStop();
    }
    this._onDispose();
    this.enabled.set(false);
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

  toSpec(): WeatherEffectSpec {
    const config = this.config.get();
    const spec: WeatherEffectSpec = {
      id: this.id,
      kind: this.type,
      enabled: this.enabled.get(),
      uniforms: this.createUniforms(config),
      config: { ...(config as Record<string, unknown>) },
    };

    if (typeof config.opacity === 'number') {
      spec.opacity = config.opacity;
    }

    return spec;
  }

  raw(): unknown {
    return undefined;
  }

  protected abstract createUniforms(config: TConfig): Record<string, unknown>;

  protected _onInit(): Promise<void> | void {}
  protected _onStart(): void {}
  protected _onStop(): void {}
  protected _onPause(): void {}
  protected _onResume(): void {}
  protected _onConfigUpdate(_changedKeys: string[]): void {}
  protected _onDispose(): void {}

  private _transitionTo(nextState: WeatherState): void {
    const previousState = this._currentState;
    this._currentState = nextState;
    this.state.set(nextState);
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
