import * as Cesium from 'cesium';
import {
  WeatherEffect,
  WeatherType,
  RainConfig,
} from '../types';
import { _getInternalViewer } from '../viewer';
import { GLSLPostProcess } from './utils/glsl-post-process';
import { RAIN_FRAGMENT_SHADER } from './shaders';

/**
 * @fileoverview 雨天天气效果实现（GLSL 后处理版）
 *
 * @module effect/rain
 */

/** 默认配置 */
const DEFAULT_CONFIG = {
  intensity: 0.5,
  speed: 1.0,
  opacity: 0.6,
  dropColor: 'rgba(174,194,224,0.6)',
  windSpeed: 0,
} as const;

/**
 * 雨天天气效果
 *
 * @description
 * 基于 GLSL 后处理（PostProcessStage）实现全屏雨滴效果。
 * 通过组合 `GLSLPostProcess` 组件管理后处理阶段的生命周期，
 * 遵循**组合优于继承**原则。
 *
 * **组合关系：**
 * - `GLSLPostProcess` — 封装 Cesium PostProcessStage 的创建、uniform 更新和销毁
 *
 * **配置映射：**
 * - `intensity` → `u_intensity`（雨量密度）
 * - `speed` → `u_speed`（雨滴下落速度）
 * - `opacity` → `u_opacity`（整体透明度）
 * - `windSpeed` → `u_windSpeed`（水平风偏移）
 * - `dropColor` → `u_dropColor`（雨滴颜色）
 *
 * @example
 * ```typescript
 * const rain = new RainWeatherEffect(viewerHandle, {
 *   intensity: 0.8,
 *   speed: 1.2,
 *   windSpeed: 0.3,
 * });
 * await rain.start();
 * rain.updateConfig({ intensity: 0.3 });
 * rain.stop();
 * rain.dispose();
 * ```
 */
export class RainWeatherEffect extends WeatherEffect<RainConfig> {
  readonly type = WeatherType.Rain;

  /** GLSL 后处理组合组件 */
  private _postProcess: GLSLPostProcess | null = null;

  /** 原生 Cesium Viewer */
  private _nativeViewer: Cesium.Viewer | null = null;

  /** 动画起始时间 */
  private _startTime = 0;

  /**
   * 初始化 GLSL 后处理阶段
   */
  protected async _onInit(): Promise<void> {
    this._nativeViewer = this._resolveViewer();
    const scene = this._nativeViewer.scene;

    const c = this.config;
    const dropColor = this._parseColor(c.dropColor ?? DEFAULT_CONFIG.dropColor);

    this._postProcess = new GLSLPostProcess({
      fragmentShader: RAIN_FRAGMENT_SHADER,
      uniforms: {
        u_intensity: () => this.config.intensity ?? DEFAULT_CONFIG.intensity,
        u_speed: () => this.config.speed ?? DEFAULT_CONFIG.speed,
        u_opacity: () => this.config.opacity ?? DEFAULT_CONFIG.opacity,
        u_time: () => (performance.now() - this._startTime) / 1000,
        u_windSpeed: () => this.config.windSpeed ?? DEFAULT_CONFIG.windSpeed,
        u_dropColor: () => {
          const color = this._parseColor(this.config.dropColor ?? DEFAULT_CONFIG.dropColor);
          return new Cesium.Cartesian3(color.red, color.green, color.blue);
        },
      },
    });

    this._postProcess.init(scene);
  }

  /**
   * 将后处理阶段添加到场景并启用
   */
  protected _onStart(): void {
    if (!this._postProcess) return;
    this._startTime = performance.now();
    this._postProcess.addToScene();
    this._postProcess.enable();
  }

  /**
   * 禁用后处理并从场景移除
   */
  protected _onStop(): void {
    this._postProcess?.disable();
    this._postProcess?.removeFromScene();
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
    this._postProcess?.enable();
  }

  /**
   * 响应配置变更（uniform 通过工厂函数自动更新，无需额外处理）
   */
  protected _onConfigUpdate(_changedKeys: string[]): void {
    // uniform 值通过工厂函数动态获取，无需手动更新
  }

  // ───────── 内部方法 ─────────

  /**
   * 从句柄获取原生 Cesium Viewer
   */
  private _resolveViewer(): Cesium.Viewer {
    const viewer = _getInternalViewer(this.viewer);
    if (!viewer) {
      throw new Error('[RainWeatherEffect] 无法获取原生 Cesium Viewer');
    }
    return viewer;
  }

  /**
   * 解析 CSS 颜色字符串为 Cesium Color
   */
  private _parseColor(cssColor: string): Cesium.Color {
    return Cesium.Color.fromCssColorString(cssColor);
  }
}
