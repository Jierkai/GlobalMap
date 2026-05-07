import {
  WeatherEffect,
  WeatherBaseConfig,
  WeatherEffectManager,
  WeatherEffectConfig,
  WeatherTransitionOptions,
  WeatherState,
  WeatherType,
  CesiumViewerHandle,
} from '../types';

/**
 * @fileoverview 天气效果管理器实现
 *
 * @module effect/manager
 */

/**
 * 天气效果管理器
 *
 * @description
 * 实现 `WeatherEffectManager` 接口，作为核心管理器被 `CesiumViewerHandle` 直接持有。
 *
 * **核心功能：**
 * - `initFromConfigs()` — 从配置数组批量创建并注册天气效果
 * - `addEffect()` / `removeEffect()` — 添加/移除单个效果实例
 * - `enableEffect()` / `disableEffect()` — 按类型启用/禁用效果
 * - `apply()` — 同时激活多个天气效果（叠加渲染）
 * - `transition()` — 在效果之间平滑过渡（先停旧，再启新）
 * - `dismiss()` — 停用效果但不释放资源
 * - `getActiveEffects()` — 查询当前运行中的效果
 * - `getEffectByType()` — 按类型查询效果
 * - `getAllEffects()` — 获取所有已注册效果
 * - `disposeAll()` — 停止并销毁所有效果
 *
 * **冲突处理：**
 * - 同类型效果互斥：添加同类型新效果时，自动移除旧效果
 * - 不同类型效果可叠加渲染
 *
 * @example
 * ```typescript
 * const manager = new WeatherEffectManagerImpl();
 *
 * // 设置 viewer 引用（在 CesiumViewerHandle 构造完成后）
 * manager.setViewer(viewerHandle);
 *
 * // 从配置初始化
 * await manager.initFromConfigs([
 *   { type: WeatherType.Rain, intensity: 0.8 },
 *   { type: WeatherType.Fog, density: 0.0003 },
 * ]);
 *
 * // 按类型操作
 * await manager.enableEffect(WeatherType.Rain);
 * manager.disableEffect(WeatherType.Fog);
 *
 * // 切换
 * await manager.transition(rainEffect, snowEffect, { duration: 3000 });
 *
 * // 清理全部
 * manager.disposeAll();
 * ```
 */
export class WeatherEffectManagerImpl implements WeatherEffectManager {
  /** 所有已注册的效果实例，按类型索引 */
  private _effects = new Map<WeatherType, WeatherEffect<WeatherBaseConfig>>();

  /** 当前激活的效果集合 */
  private _activeEffects = new Set<WeatherEffect<WeatherBaseConfig>>();

  /** 所属的 Viewer 句柄（延迟设置） */
  private _viewer: CesiumViewerHandle | null = null;

  /**
   * 设置 Viewer 句柄引用
   *
   * @description
   * 由于 `CesiumViewerHandle` 和 `WeatherEffectManagerImpl` 存在循环引用，
   * 需要在两者都创建完成后调用此方法建立关联。
   */
  setViewer(viewer: CesiumViewerHandle): void {
    this._viewer = viewer;
  }

  /**
   * 获取当前关联的 Viewer 句柄
   */
  get viewer(): CesiumViewerHandle | null {
    return this._viewer;
  }

  // ───────── 配置驱动初始化 ─────────

  /**
   * 从配置数组批量创建并注册天气效果实例
   *
   * @description
   * 遍历配置数组，对每个配置项：
   * - 如果是已实例化的 `WeatherEffect` 对象，直接注册
   * - 如果是配置对象，通过类型映射表创建对应实例后注册
   * 注册完成后自动启动所有效果。
   */
  async initFromConfigs(configs: WeatherEffectConfig[]): Promise<void> {
    for (const config of configs) {
      // 已实例化的效果对象，直接添加
      if (config instanceof WeatherEffect) {
        this.addEffect(config);
        continue;
      }

      // 配置对象，通过工厂创建
      const effect = this._createEffectFromConfig(config);
      if (effect) {
        this.addEffect(effect);
      }
    }

    // 启动所有已注册但未运行的效果
    await this._startAllIdle();
  }

  // ───────── 单个效果管理 ─────────

  /**
   * 添加一个天气效果实例到管理器
   *
   * @description
   * 如果已存在同类型效果，会自动移除旧效果（同类型互斥）。
   * 添加后不会自动启动，需手动调用 `enableEffect` 或 `apply`。
   */
  addEffect(effect: WeatherEffect<WeatherBaseConfig>): void {
    // 同类型互斥：移除旧的同类型效果
    const existing = this._effects.get(effect.type);
    if (existing) {
      this._removeEffectInternal(existing);
    }

    this._effects.set(effect.type, effect);
  }

  /**
   * 移除并销毁指定的天气效果实例
   */
  removeEffect(effect: WeatherEffect<WeatherBaseConfig>): void {
    this._removeEffectInternal(effect);
  }

  /**
   * 启用指定类型的天气效果（启动渲染）
   */
  async enableEffect(type: WeatherType): Promise<boolean> {
    const effect = this._effects.get(type);
    if (!effect) return false;

    if (effect.state !== WeatherState.Running) {
      await effect.start();
      this._activeEffects.add(effect);
    }
    return true;
  }

  /**
   * 禁用指定类型的天气效果（停止渲染但保留资源）
   */
  disableEffect(type: WeatherType): boolean {
    const effect = this._effects.get(type);
    if (!effect) return false;

    if (effect.state === WeatherState.Running || effect.state === WeatherState.Paused) {
      effect.stop();
      this._activeEffects.delete(effect);
    }
    return true;
  }

  /**
   * 按类型获取天气效果实例
   */
  getEffectByType(type: WeatherType): WeatherEffect<WeatherBaseConfig> | undefined {
    return this._effects.get(type);
  }

  /**
   * 获取所有已注册的天气效果实例（包括未激活的）
   */
  getAllEffects(): WeatherEffect<WeatherBaseConfig>[] {
    return Array.from(this._effects.values());
  }

  // ───────── WeatherManager 接口实现 ─────────

  /**
   * 激活一组天气效果（叠加模式）
   */
  async apply(effects: WeatherEffect<WeatherBaseConfig>[]): Promise<void> {
    for (const effect of effects) {
      if (effect.state === WeatherState.Running) continue;
      await effect.start();
      this._activeEffects.add(effect);
      // 确保已注册到管理器
      if (!this._effects.has(effect.type)) {
        this._effects.set(effect.type, effect);
      }
    }
  }

  /**
   * 停用一组天气效果
   */
  dismiss(effects: WeatherEffect<WeatherBaseConfig>[]): void {
    for (const effect of effects) {
      effect.stop();
      this._activeEffects.delete(effect);
    }
  }

  /**
   * 天气效果切换
   */
  async transition(
    from: WeatherEffect<WeatherBaseConfig> | null,
    to: WeatherEffect<WeatherBaseConfig>,
    options?: WeatherTransitionOptions,
  ): Promise<void> {
    const duration = options?.duration ?? 1000;
    const keepBase = options?.keepBase ?? false;

    if (from && from.state === WeatherState.Running) {
      if (duration > 0) {
        await this._fadeTransition(from, to, duration);
      } else {
        from.stop();
        this._activeEffects.delete(from);
      }
    }

    await to.start();
    this._activeEffects.add(to);

    // 确保目标效果已注册
    if (!this._effects.has(to.type)) {
      this._effects.set(to.type, to);
    }

    if (!keepBase && from) {
      this._removeEffectInternal(from);
    }
  }

  /**
   * 获取当前处于运行状态的所有天气效果
   */
  getActiveEffects(): WeatherEffect<WeatherBaseConfig>[] {
    return Array.from(this._activeEffects).filter(
      (e) => e.state === WeatherState.Running,
    );
  }

  /**
   * 停止并销毁所有天气效果
   */
  disposeAll(): void {
    for (const effect of this._effects.values()) {
      effect.dispose();
    }
    this._effects.clear();
    this._activeEffects.clear();
  }

  // ───────── 内部方法 ─────────

  /**
   * 从配置对象创建天气效果实例
   *
   * @description
   * 根据配置中的 `type` 字段，映射到对应的天气效果类并实例化。
   * 使用延迟导入以避免循环依赖。
   */
  private _createEffectFromConfig(
    config: WeatherEffectConfig,
  ): WeatherEffect<WeatherBaseConfig> | null {
    // 排除已实例化的情况（已在 initFromConfigs 中处理）
    if (config instanceof WeatherEffect) return null;

    if (!this._viewer) {
      console.warn('[WeatherEffectManager] 尚未设置 Viewer 引用，无法创建天气效果实例');
      return null;
    }

    const { type, ...restConfig } = config as { type: WeatherType } & WeatherBaseConfig;

    // 延迟导入避免循环依赖
    const effectMap: Record<string, () => WeatherEffect<WeatherBaseConfig>> = {
      [WeatherType.Rain]: () => {
        const { RainWeatherEffect } = require('./rain');
        return new RainWeatherEffect(this._viewer!, restConfig as any);
      },
      [WeatherType.Snow]: () => {
        const { SnowWeatherEffect } = require('./snow');
        return new SnowWeatherEffect(this._viewer!, restConfig as any);
      },
      [WeatherType.Fog]: () => {
        const { FogWeatherEffect } = require('./fog');
        return new FogWeatherEffect(this._viewer!, restConfig as any);
      },
      [WeatherType.Cloud]: () => {
        const { CloudWeatherEffect } = require('./cloud');
        return new CloudWeatherEffect(this._viewer!, restConfig as any);
      },
      [WeatherType.Lightning]: () => {
        const { LightningWeatherEffect } = require('./lightning');
        return new LightningWeatherEffect(this._viewer!, restConfig as any);
      },
    };

    const factory = effectMap[type];
    if (!factory) {
      console.warn(`[WeatherEffectManager] 未知的天气效果类型: "${type}"，已跳过`);
      return null;
    }

    return factory();
  }

  /**
   * 内部移除效果（停止 + 从集合中删除）
   */
  private _removeEffectInternal(effect: WeatherEffect<WeatherBaseConfig>): void {
    if (effect.state === WeatherState.Running || effect.state === WeatherState.Paused) {
      effect.stop();
    }
    effect.dispose();
    this._effects.delete(effect.type);
    this._activeEffects.delete(effect);
  }

  /**
   * 启动所有处于 Idle 状态的效果
   */
  private async _startAllIdle(): Promise<void> {
    for (const effect of this._effects.values()) {
      if (effect.state === WeatherState.Idle || effect.state === WeatherState.Stopped) {
        await effect.start();
        this._activeEffects.add(effect);
      }
    }
  }

  /**
   * 淡入淡出过渡
   *
   * @description
   * 通过逐步调整旧效果的透明度实现平滑退出，
   * 同时启动新效果。
   */
  private async _fadeTransition(
    from: WeatherEffect<WeatherBaseConfig>,
    to: WeatherEffect<WeatherBaseConfig>,
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
}
