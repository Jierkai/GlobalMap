import * as Cesium from 'cesium';
import {
  WeatherEffect,
  WeatherType,
  FogConfig,
} from '../types';
import { _getInternalViewer } from '../viewer';
import { GLSLPostProcess } from './utils/glsl-post-process';
import { FOG_FRAGMENT_SHADER } from './shaders';

/**
 * @fileoverview 雾天天气效果实现（GLSL 后处理版）
 *
 * @module effect/fog
 */

/** 默认配置 */
const DEFAULT_CONFIG = {
  intensity: 0.5,
  density: 0.0003,
  color: 'rgba(200,210,220,0.7)',
  minHeight: 0,
  maxHeight: 500,
  opacity: 1.0,
} as const;

/**
 * 雾天天气效果
 *
 * @description
 * 基于 GLSL 后处理（PostProcessStage）实现距离雾效果。
 * 通过读取场景深度纹理，根据距离和高度计算雾浓度。
 * 通过组合 `GLSLPostProcess` 组件管理后处理阶段的生命周期，
 * 遵循**组合优于继承**原则。
 *
 * **组合关系：**
 * - `GLSLPostProcess` — 封装 Cesium PostProcessStage 的创建、uniform 更新和销毁
 *
 * **配置映射：**
 * - `intensity` → `u_intensity`（雾强度）
 * - `density` → `u_density`（雾密度，控制衰减速率）
 * - `opacity` → `u_opacity`（整体透明度）
 * - `color` → `u_fogColor`（雾颜色）
 * - `minHeight` → `u_minHeight`（雾底部高度）
 * - `maxHeight` → `u_maxHeight`（雾顶部高度）
 *
 * @example
 * ```typescript
 * const fog = new FogWeatherEffect(viewerHandle, {
 *   density: 0.0003,
 *   color: 'rgba(200,210,220,0.7)',
 *   intensity: 0.5,
 * });
 * await fog.start();
 * ```
 */
export class FogWeatherEffect extends WeatherEffect<FogConfig> {
  readonly type = WeatherType.Fog;

  /** GLSL 后处理组合组件 */
  private _postProcess: GLSLPostProcess | null = null;

  /** 原生 Cesium Viewer */
  private _nativeViewer: Cesium.Viewer | null = null;

  /**
   * 初始化 GLSL 后处理阶段
   */
  protected async _onInit(): Promise<void> {
    this._nativeViewer = this._resolveViewer();
    const scene = this._nativeViewer.scene;

    this._postProcess = new GLSLPostProcess({
      fragmentShader: FOG_FRAGMENT_SHADER,
      uniforms: {
        u_intensity: () => this.config.intensity ?? DEFAULT_CONFIG.intensity,
        u_density: () => this.config.density ?? DEFAULT_CONFIG.density,
        u_opacity: () => this.config.opacity ?? DEFAULT_CONFIG.opacity,
        u_fogColor: () => {
          const color = Cesium.Color.fromCssColorString(
            this.config.color ?? DEFAULT_CONFIG.color,
          );
          return new Cesium.Cartesian3(color.red, color.green, color.blue);
        },
        u_minHeight: () => this.config.minHeight ?? DEFAULT_CONFIG.minHeight,
        u_maxHeight: () => this.config.maxHeight ?? DEFAULT_CONFIG.maxHeight,
        u_cameraHeight: () => {
          if (!this._nativeViewer) return 0;
          const camera = this._nativeViewer.scene.camera;
          const cartographic = Cesium.Cartographic.fromCartesian(camera.position);
          return cartographic.height;
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
      throw new Error('[FogWeatherEffect] 无法获取原生 Cesium Viewer');
    }
    return viewer;
  }
}
