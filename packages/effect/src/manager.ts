import { WeatherEffect } from './base.js';
import {
  WeatherState,
  WeatherType,
  type WeatherBaseConfig,
  type WeatherEffectConfig,
  type WeatherEffectLike,
  type WeatherEffectManager,
  type WeatherTransitionOptions,
} from './types.js';
import { FogWeatherEffect } from './fog.js';
import { CloudWeatherEffect } from './cloud.js';
import { LightningWeatherEffect } from './lightning.js';
import { RainWeatherEffect } from './rain.js';
import { SnowWeatherEffect } from './snow.js';

class GenericWeatherEffect extends WeatherEffect<WeatherBaseConfig> {
  constructor(
    readonly type: string,
    config: WeatherBaseConfig,
    id?: string,
  ) {
    super(config, id);
  }

  protected createUniforms(config: WeatherBaseConfig): Record<string, unknown> {
    return { ...config };
  }
}

export class WeatherEffectManagerImpl implements WeatherEffectManager {
  private _effects = new Map<string, WeatherEffectLike<WeatherBaseConfig>>();
  private _activeEffects = new Set<WeatherEffectLike<WeatherBaseConfig>>();

  async initFromConfigs(configs: WeatherEffectConfig[]): Promise<void> {
    for (const config of configs) {
      if (this._isWeatherEffect(config)) {
        this.addEffect(config);
        continue;
      }

      const effect = this._createEffectFromConfig(config);
      if (effect) {
        this.addEffect(effect);
      }
    }

    await this._startAllIdle();
  }

  addEffect(effect: WeatherEffectLike<WeatherBaseConfig>): void {
    const existing = this._effects.get(effect.type);
    if (existing) {
      this._removeEffectInternal(existing);
    }

    this._effects.set(effect.type, effect);
  }

  removeEffect(effect: WeatherEffectLike<WeatherBaseConfig>): void {
    this._removeEffectInternal(effect);
  }

  async enableEffect(type: WeatherType | string): Promise<boolean> {
    const effect = this._effects.get(type);
    if (!effect) return false;

    if (effect.state.get() !== WeatherState.Running) {
      await effect.start();
      this._activeEffects.add(effect);
    }
    return true;
  }

  disableEffect(type: WeatherType | string): boolean {
    const effect = this._effects.get(type);
    if (!effect) return false;

    if (effect.state.get() === WeatherState.Running || effect.state.get() === WeatherState.Paused) {
      effect.stop();
      this._activeEffects.delete(effect);
    }
    return true;
  }

  getEffectByType(type: WeatherType | string): WeatherEffectLike<WeatherBaseConfig> | undefined {
    return this._effects.get(type);
  }

  getAllEffects(): WeatherEffectLike<WeatherBaseConfig>[] {
    return Array.from(this._effects.values());
  }

  async apply(effects: WeatherEffectLike<WeatherBaseConfig>[]): Promise<void> {
    for (const effect of effects) {
      if (effect.state.get() === WeatherState.Running) continue;
      await effect.start();
      this._activeEffects.add(effect);
      if (!this._effects.has(effect.type)) {
        this._effects.set(effect.type, effect);
      }
    }
  }

  dismiss(effects: WeatherEffectLike<WeatherBaseConfig>[]): void {
    for (const effect of effects) {
      effect.stop();
      this._activeEffects.delete(effect);
    }
  }

  async transition(
    from: WeatherEffectLike<WeatherBaseConfig> | null,
    to: WeatherEffectLike<WeatherBaseConfig>,
    options?: WeatherTransitionOptions,
  ): Promise<void> {
    const duration = options?.duration ?? 1000;
    const keepBase = options?.keepBase ?? false;

    if (from && from.state.get() === WeatherState.Running) {
      if (duration > 0) {
        await this._fadeTransition(from, to, duration);
      } else {
        from.stop();
        this._activeEffects.delete(from);
      }
    }

    await to.start();
    this._activeEffects.add(to);

    if (!this._effects.has(to.type)) {
      this._effects.set(to.type, to);
    }

    if (!keepBase && from) {
      this._removeEffectInternal(from);
    }
  }

  getActiveEffects(): WeatherEffectLike<WeatherBaseConfig>[] {
    return Array.from(this._activeEffects).filter(
      (effect) => effect.state.get() === WeatherState.Running,
    );
  }

  disposeAll(): void {
    for (const effect of this._effects.values()) {
      effect.dispose();
    }
    this._effects.clear();
    this._activeEffects.clear();
  }

  private _createEffectFromConfig(
    config: WeatherEffectConfig,
  ): WeatherEffectLike<WeatherBaseConfig> | null {
    if (this._isWeatherEffect(config)) return null;

    const { type, ...restConfig } = config as { type: string } & Record<string, unknown>;

    switch (type) {
      case WeatherType.Rain:
        return new RainWeatherEffect(restConfig as WeatherBaseConfig);
      case WeatherType.Snow:
        return new SnowWeatherEffect(restConfig as WeatherBaseConfig);
      case WeatherType.Fog:
        return new FogWeatherEffect(restConfig as WeatherBaseConfig);
      case WeatherType.Cloud:
        return new CloudWeatherEffect(restConfig as WeatherBaseConfig);
      case WeatherType.Lightning:
        return new LightningWeatherEffect(restConfig as WeatherBaseConfig);
      default:
        return new GenericWeatherEffect(type, restConfig as WeatherBaseConfig);
    }
  }

  private _removeEffectInternal(effect: WeatherEffectLike<WeatherBaseConfig>): void {
    if (effect.state.get() === WeatherState.Running || effect.state.get() === WeatherState.Paused) {
      effect.stop();
    }
    effect.dispose();
    this._effects.delete(effect.type);
    this._activeEffects.delete(effect);
  }

  private async _startAllIdle(): Promise<void> {
    for (const effect of this._effects.values()) {
      if (effect.state.get() === WeatherState.Idle || effect.state.get() === WeatherState.Stopped) {
        await effect.start();
        this._activeEffects.add(effect);
      }
    }
  }

  private async _fadeTransition(
    from: WeatherEffectLike<WeatherBaseConfig>,
    to: WeatherEffectLike<WeatherBaseConfig>,
    duration: number,
  ): Promise<void> {
    const fromConfig = from.currentConfig;
    const originalOpacity = fromConfig.opacity ?? 1;

    await to.start();

    const startTime = performance.now();

    return new Promise<void>((resolve) => {
      const tick = () => {
        const elapsed = performance.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);

        from.updateConfig({
          opacity: originalOpacity * (1 - progress),
        } as Partial<WeatherBaseConfig>);

        if (progress >= 1) {
          from.stop();
          this._activeEffects.delete(from);
          resolve();
        } else {
          requestAnimationFrame(tick);
        }
      };

      requestAnimationFrame(tick);
    });
  }

  private _isWeatherEffect(
    value: WeatherEffectConfig,
  ): value is WeatherEffectLike<WeatherBaseConfig> {
    return value instanceof WeatherEffect || (
      typeof value === 'object' &&
      value !== null &&
      typeof (value as WeatherEffectLike<WeatherBaseConfig>).start === 'function' &&
      typeof (value as WeatherEffectLike<WeatherBaseConfig>).stop === 'function' &&
      typeof (value as WeatherEffectLike<WeatherBaseConfig>).toSpec === 'function'
    );
  }
}

export function createWeatherEffectManager(): WeatherEffectManagerImpl {
  return new WeatherEffectManagerImpl();
}

export async function initWeatherEffects(
  configs: WeatherEffectConfig[],
): Promise<WeatherEffectManagerImpl> {
  const manager = createWeatherEffectManager();
  await manager.initFromConfigs(configs);
  return manager;
}
