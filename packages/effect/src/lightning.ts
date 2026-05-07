import {
  WeatherEffect,
  WeatherType,
  type LightningConfig,
} from './types';
import { unsafeGetNativeViewer } from '@cgx/adapter-cesium';
import { Cesium, type Viewer } from './cesium-bridge';
import { GLSLPostProcess } from './utils/glsl-post-process';
import { LIGHTNING_FRAGMENT_SHADER } from './shaders';

/**
 * @fileoverview 闪电天气效果实现（GLSL 后处理版）
 *
 * @module effect/lightning
 */

/** 默认配置 */
const DEFAULT_CONFIG = {
  intensity: 0.5,
  opacity: 1.0,
  interval: 3,
  flashDuration: 0.3,
  flashColor: 'rgba(200,220,255,0.9)',
  branchCount: 3,
} as const;

/**
 * 闪电天气效果
 *
 * @description
 * 基于 GLSL 后处理（PostProcessStage）实现闪电闪烁效果。
 * 通过时间控制的亮度脉冲和噪声形状模拟闪电照亮场景。
 * 通过组合 `GLSLPostProcess` 组件管理后处理阶段的生命周期，
 * 遵循**组合优于继承**原则。
 *
 * **组合关系：**
 * - `GLSLPostProcess` — 封装 Cesium PostProcessStage 的创建、uniform 更新和销毁
 *
 * **配置映射：**
 * - `intensity` → `u_intensity`（闪电强度）
 * - `opacity` → `u_opacity`（整体透明度）
 * - `interval` → 控制闪烁间隔
 * - `flashDuration` → 控制闪烁持续时间
 * - `flashColor` → `u_flashColor`（闪电颜色）
 * - `branchCount` → `u_branchCount`（分支数量）
 *
 * @example
 * ```typescript
 * const lightning = new LightningWeatherEffect(viewerHandle, {
 *   interval: 3,
 *   flashDuration: 0.3,
 *   intensity: 0.7,
 * });
 * await lightning.start();
 * ```
 */
export class LightningWeatherEffect extends WeatherEffect<LightningConfig> {
  readonly type = WeatherType.Lightning;

  /** GLSL 后处理组合组件 */
  private _postProcess: GLSLPostProcess | null = null;

  /** 原生 Cesium Viewer */
  private _nativeViewer: Viewer | null = null;

  /** 自上次闪电以来的累计时间 */
  private _timeSinceLastStrike = 0;

  /** 当前闪电已持续时间 */
  private _currentFlashElapsed = 0;

  /** 是否正在闪烁 */
  private _isFlashing = false;

  /** 当前闪烁进度 0~1 */
  private _flashProgress = 0;

  /** 上一帧时间戳 */
  private _lastFrameTime = 0;

  /**
   * 初始化 GLSL 后处理阶段
   */
  protected async _onInit(): Promise<void> {
    this._nativeViewer = this._resolveViewer();
    const scene = this._nativeViewer.scene;

    this._postProcess = new GLSLPostProcess({
      fragmentShader: LIGHTNING_FRAGMENT_SHADER,
      uniforms: {
        u_intensity: () => this.config.intensity ?? DEFAULT_CONFIG.intensity,
        u_opacity: () => this.config.opacity ?? DEFAULT_CONFIG.opacity,
        u_time: () => performance.now() / 1000,
        u_flashProgress: () => this._flashProgress,
        u_flashColor: () => {
          const color = Cesium.Color.fromCssColorString(
            this.config.flashColor ?? DEFAULT_CONFIG.flashColor,
          );
          return new Cesium.Cartesian3(color.red, color.green, color.blue);
        },
        u_branchCount: () => this.config.branchCount ?? DEFAULT_CONFIG.branchCount,
      },
    });

    this._postProcess.init(scene);
  }

  /**
   * 将后处理阶段添加到场景并启用
   */
  protected _onStart(): void {
    if (!this._postProcess) return;
    this._timeSinceLastStrike = 0;
    this._isFlashing = false;
    this._flashProgress = 0;
    this._lastFrameTime = performance.now();
    this._postProcess.addToScene();
    this._postProcess.enable();
  }

  /**
   * 禁用后处理并从场景移除
   */
  protected _onStop(): void {
    this._postProcess?.disable();
    this._postProcess?.removeFromScene();
    this._isFlashing = false;
    this._flashProgress = 0;
  }

  /**
   * 销毁后处理阶段
   */
  protected _onDispose(): void {
    this._postProcess?.dispose();
    this._postProcess = null;
    this._nativeViewer = null;
  }

  /**
   * 暂停：禁用渲染
   */
  protected _onPause(): void {
    this._postProcess?.disable();
  }

  /**
   * 恢复：重新启用渲染
   */
  protected _onResume(): void {
    this._lastFrameTime = performance.now();
    this._postProcess?.enable();
  }

  /**
   * 响应配置变更（uniform 通过工厂函数自动更新）
   */
  protected _onConfigUpdate(_changedKeys: string[]): void {
    // uniform 值通过工厂函数动态获取，无需手动更新
  }

  // ───────── 内部方法 ─────────

  /**
   * 从句柄获取原生 Cesium Viewer
   */
  private _resolveViewer(): Viewer {
    const viewer = unsafeGetNativeViewer(this.viewer) as Viewer | undefined;
    if (!viewer) {
      throw new Error('[LightningWeatherEffect] 无法获取原生 Cesium Viewer');
    }
    return viewer;
  }
}
