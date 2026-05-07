import { Cesium } from '../cesium-bridge';

/**
 * @fileoverview GLSL 后处理组合组件
 * 封装 Cesium PostProcessStage 的生命周期管理，供各天气效果组合使用
 *
 * @module effect/utils/glsl-post-process
 */

/** Uniform 值类型（兼容 Cesium PostProcessStage.uniforms） */
type UniformValue = InstanceType<typeof Cesium.PostProcessStage>["uniforms"][string];

/** GLSL 后处理配置 */
export interface GLSLPostProcessConfig {
  /** Fragment shader 源码 */
  fragmentShader: string;
  /** 是否需要深度纹理（雾效果等需要读取深度） */
  depthTexture?: boolean;
  /** uniform 值或返回值的工厂函数 */
  uniforms?: Record<string, UniformValue>;
}

/**
 * GLSL 后处理组合组件
 *
 * @description
 * 封装 Cesium `PostProcessStage` 的创建、场景管理、uniform 更新和销毁。
 * 天气效果类通过组合此组件来实现基于 GLSL 的全屏后处理渲染，
 * 遵循**组合优于继承**原则。
 *
 * **职责：**
 * - 管理 `PostProcessStage` 的完整生命周期
 * - 提供 uniform 动态更新接口
 * - 支持启用/禁用渲染
 *
 * @example
 * ```typescript
 * const postProcess = new GLSLPostProcess({
 *   fragmentShader: rainShaderSource,
 *   uniforms: {
 *     u_intensity: () => 0.8,
 *     u_time: () => performance.now() / 1000,
 *   },
 * });
 * postProcess.init(scene);
 * postProcess.addToScene();
 * postProcess.enable();
 * ```
 */
export class GLSLPostProcess {
  /** Cesium 后处理阶段实例 */
  private _stage: InstanceType<typeof Cesium.PostProcessStage> | null = null;

  /** Cesium 场景引用 */
  private _scene: InstanceType<typeof Cesium.Scene> | null = null;

  /** 是否已启用渲染 */
  private _enabled = false;

  /** 配置 */
  private readonly _config: GLSLPostProcessConfig;

  constructor(config: GLSLPostProcessConfig) {
    this._config = config;
  }

  /**
   * 初始化后处理阶段
   *
   * @param scene - Cesium 场景对象
   */
  init(scene: InstanceType<typeof Cesium.Scene>): void {
    this._scene = scene;
    this._stage = new Cesium.PostProcessStage({
      fragmentShader: this._config.fragmentShader,
      uniforms: this._config.uniforms ?? {},
    });
    this._stage.enabled = this._enabled;
  }

  /**
   * 将后处理阶段添加到场景
   */
  addToScene(): void {
    if (!this._scene || !this._stage) return;
    if (!this._scene.postProcessStages.contains(this._stage)) {
      this._scene.postProcessStages.add(this._stage);
    }
  }

  /**
   * 从场景中移除后处理阶段
   */
  removeFromScene(): void {
    if (!this._scene || !this._stage) return;
    if (this._scene.postProcessStages.contains(this._stage)) {
      this._scene.postProcessStages.remove(this._stage);
    }
  }

  /**
   * 启用渲染
   */
  enable(): void {
    this._enabled = true;
    if (this._stage) {
      this._stage.enabled = true;
    }
  }

  /**
   * 禁用渲染
   */
  disable(): void {
    this._enabled = false;
    if (this._stage) {
      this._stage.enabled = false;
    }
  }

  /**
   * 更新单个 uniform 值
   *
   * @param name - uniform 名称
   * @param value - 新的 uniform 值或工厂函数
   */
  updateUniform(name: string, value: UniformValue): void {
    if (this._stage?.uniforms) {
      (this._stage.uniforms as Record<string, UniformValue>)[name] = value;
    }
  }

  /**
   * 批量更新 uniform 值
   *
   * @param uniforms - 要更新的 uniform 键值对
   */
  updateUniforms(uniforms: Record<string, UniformValue>): void {
    if (!this._stage?.uniforms) return;
    const stageUniforms = this._stage.uniforms as Record<string, UniformValue>;
    for (const [name, value] of Object.entries(uniforms)) {
      stageUniforms[name] = value;
    }
  }

  /**
   * 销毁后处理阶段并释放资源
   */
  dispose(): void {
    this.disable();
    this.removeFromScene();
    if (this._stage && !this._stage.isDestroyed()) {
      this._stage.destroy();
      this._stage = null;
    }
    this._scene = null;
  }

  /** 是否已初始化且可用 */
  get isReady(): boolean {
    return this._stage !== null && this._scene !== null;
  }

  /** 是否已启用渲染 */
  get isEnabled(): boolean {
    return this._enabled;
  }
}
