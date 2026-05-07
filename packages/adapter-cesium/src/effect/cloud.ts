import * as Cesium from 'cesium';
import {
  WeatherEffect,
  WeatherType,
  WeatherBaseConfig,
} from '../types';
import { _getInternalViewer } from '../viewer';
import { GLSLPostProcess } from './utils/glsl-post-process';
import { CLOUD_FRAGMENT_SHADER } from './shaders';

/**
 * @fileoverview 云天天气效果实现（GLSL 后处理版）
 *
 * @module effect/cloud
 */

/** 云层配置接口（扩展基础配置） */
export interface CloudConfig extends WeatherBaseConfig {
  /** 云层覆盖率 (0-1) */
  coverage?: number;
  /** 云层移动速度（米/秒） */
  driftSpeed?: number;
  /** 云颜色 (CSS 颜色字符串) */
  cloudColor?: string;
}

/** 默认配置 */
const DEFAULT_CONFIG = {
  intensity: 0.5,
  opacity: 0.7,
  coverage: 0.5,
  driftSpeed: 10,
  cloudColor: 'rgba(255,255,255,0.9)',
} as const;

/**
 * 云天天气效果
 *
 * @description
 * 基于 GLSL 后处理（PostProcessStage）实现体积云效果。
 * 使用分形噪声在屏幕空间生成云层，随时间缓慢漂移。
 * 通过组合 `GLSLPostProcess` 组件管理后处理阶段的生命周期，
 * 遵循**组合优于继承**原则。
 *
 * **组合关系：**
 * - `GLSLPostProcess` — 封装 Cesium PostProcessStage 的创建、uniform 更新和销毁
 *
 * **配置映射：**
 * - `intensity` → `u_intensity`（云层强度）
 * - `opacity` → `u_opacity`（整体透明度）
 * - `coverage` → `u_coverage`（云层覆盖率）
 * - `driftSpeed` → `u_driftSpeed`（漂移速度）
 * - `cloudColor` → `u_cloudColor`（云颜色）
 *
 * @example
 * ```typescript
 * const cloud = new CloudWeatherEffect(viewerHandle, {
 *   coverage: 0.5,
 *   driftSpeed: 10,
 * });
 * await cloud.start();
 * ```
 */
export class CloudWeatherEffect extends WeatherEffect<CloudConfig> {
  readonly type = WeatherType.Cloud;

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

    this._postProcess = new GLSLPostProcess({
      fragmentShader: CLOUD_FRAGMENT_SHADER,
      uniforms: {
        u_intensity: () => this.config.intensity ?? DEFAULT_CONFIG.intensity,
        u_opacity: () => this.config.opacity ?? DEFAULT_CONFIG.opacity,
        u_time: () => (performance.now() - this._startTime) / 1000,
        u_coverage: () => this.config.coverage ?? DEFAULT_CONFIG.coverage,
        u_cloudColor: () => {
          const color = Cesium.Color.fromCssColorString(
            this.config.cloudColor ?? DEFAULT_CONFIG.cloudColor,
          );
          return new Cesium.Cartesian3(color.red, color.green, color.blue);
        },
        u_driftSpeed: () => this.config.driftSpeed ?? DEFAULT_CONFIG.driftSpeed,
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
   * 响应配置变更（uniform 通过工厂函数自动更新）
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
      throw new Error('[CloudWeatherEffect] 无法获取原生 Cesium Viewer');
    }
    return viewer;
  }
}
