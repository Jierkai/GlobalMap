import type { Off, ReadonlySignal, Signal } from '@cgx/reactive';
import type { WeatherEffectSpec as CoreWeatherEffectSpec } from '@cgx/core';

export type WeatherEffectSpec = CoreWeatherEffectSpec;

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

export type WeatherEffectInput =
  | ({ type: WeatherType.Rain } & RainConfig)
  | ({ type: WeatherType.Snow } & SnowConfig)
  | ({ type: WeatherType.Fog } & FogConfig)
  | ({ type: WeatherType.Cloud } & CloudConfig)
  | ({ type: WeatherType.Lightning } & LightningConfig)
  | { type: WeatherType.Custom; config?: Record<string, unknown> }
  | { type: string; config?: Record<string, unknown> };

export type WeatherStateListener = (
  previousState: WeatherState,
  currentState: WeatherState,
) => void;

export type WeatherConfigListener = (changedKeys: string[]) => void;

export interface WeatherEffectLike<TConfig extends WeatherBaseConfig = WeatherBaseConfig> {
  readonly id: string;
  readonly type: WeatherType | string;
  readonly state: Signal<WeatherState>;
  readonly enabled: Signal<boolean>;
  readonly config: Signal<TConfig>;
  readonly spec: ReadonlySignal<WeatherEffectSpec>;
  readonly currentConfig: Readonly<TConfig>;
  init(): Promise<void>;
  start(): Promise<void>;
  stop(): void;
  pause(): void;
  resume(): void;
  updateConfig(partialConfig: Partial<TConfig>): void;
  dispose(): void;
  onStateChange(listener: WeatherStateListener): Off;
  onConfigChange(listener: WeatherConfigListener): Off;
  toSpec(): WeatherEffectSpec;
  raw(): unknown;
}

export type WeatherEffectConfig =
  | WeatherEffectInput
  | WeatherEffectLike<WeatherBaseConfig>;

export interface WeatherTransitionOptions {
  duration?: number;
  keepBase?: boolean;
}

export interface WeatherManager {
  apply(effects: WeatherEffectLike<WeatherBaseConfig>[]): Promise<void>;
  dismiss(effects: WeatherEffectLike<WeatherBaseConfig>[]): void;
  transition(
    from: WeatherEffectLike<WeatherBaseConfig> | null,
    to: WeatherEffectLike<WeatherBaseConfig>,
    options?: WeatherTransitionOptions,
  ): Promise<void>;
  getActiveEffects(): WeatherEffectLike<WeatherBaseConfig>[];
  disposeAll(): void;
}

export interface WeatherEffectManager extends WeatherManager {
  initFromConfigs(configs: WeatherEffectConfig[]): Promise<void>;
  addEffect(effect: WeatherEffectLike<WeatherBaseConfig>): void;
  removeEffect(effect: WeatherEffectLike<WeatherBaseConfig>): void;
  enableEffect(type: WeatherType | string): Promise<boolean>;
  disableEffect(type: WeatherType | string): boolean;
  getEffectByType(type: WeatherType | string): WeatherEffectLike<WeatherBaseConfig> | undefined;
  getAllEffects(): WeatherEffectLike<WeatherBaseConfig>[];
}
