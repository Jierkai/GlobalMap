import { Cesium } from '../cesium-bridge';

/**
 * @fileoverview 粒子系统组件模块
 * 提供基于 BillboardCollection 的可组合粒子批处理封装，供雨、雪效果复用
 *
 * @module effect/utils/particle-batch
 */

/**
 * 粒子批次配置接口
 */
export interface ParticleBatchConfig {
  /** 粒子纹理图片 URL */
  image: string;
  /** 粒子发射率（个/秒） */
  emissionRate: number;
  /** 粒子生命周期（秒） */
  lifetime: number;
  /** 粒子宽度（像素） */
  width: number;
  /** 粒子高度（像素） */
  height: number;
  /** 粒子颜色 */
  color: InstanceType<typeof Cesium.Color>;
  /** 发射器半径（米） */
  emitterRadius: number;
  /** 粒子下落速度基准（米/秒） */
  fallSpeed: number;
  /** 粒子水平速度波动范围（米/秒） */
  horizontalSpeed: number;
}

/** 单个粒子的运行时状态 */
interface ParticleState {
  billboard: InstanceType<typeof Cesium.Billboard>;
  elapsed: number;
  velocityX: number;
  velocityZ: number;
  originX: number;
  originY: number;
  originZ: number;
}

/**
 * 粒子系统组件
 *
 * @description
 * 封装基于 Cesium BillboardCollection 的粒子系统，
 * 提供统一的创建、帧更新和销毁接口。
 * Rain 和 Snow 效果通过组合此组件来管理各自的粒子渲染。
 *
 * 每帧在动画循环中调用 `update(dt)` 推进粒子生命周期。
 *
 * @example
 * ```typescript
 * const batch = new ParticleBatch(viewer, {
 *   image: '/assets/rain.png',
 *   emissionRate: 1000,
 *   lifetime: 0.8,
 *   width: 2,
 *   height: 16,
 *   color: Cesium.Color.WHITE.withAlpha(0.6),
 *   emitterRadius: 5000,
 *   fallSpeed: 50,
 *   horizontalSpeed: 5,
 * });
 * await batch.init();
 * batch.addToScene();
 * animator.start((dt) => batch.update(dt));
 * ```
 */
export class ParticleBatch {
  /** Billboard 集合图元 */
  private _collection: InstanceType<typeof Cesium.BillboardCollection> | null = null;

  /** 活跃粒子列表 */
  private _particles: ParticleState[] = [];

  /** 待回收的粒子索引，避免每帧大量数组 splice */
  private _deadIndices: number[] = [];

  /** 自上次发射以来的累计时间 */
  private _emissionAccumulator = 0;

  /** 是否已暂停 */
  private _paused = false;

  /** 基准发射率（缓存用于暂停/恢复） */
  private _baseEmissionRate: number;

  /** 粒子纹理是否已加载 */
  private _ready = false;

  /** Cesium 场景引用 */
  private _scene: InstanceType<typeof Cesium.Scene> | null = null;

  /** 相机位置缓存 */
  private _cameraPos = new Cesium.Cartesian3();

  /** 临时向量（复用避免 GC） */
  private _scratch1 = new Cesium.Cartesian3();
  private _scratch2 = new Cesium.Cartesian3();

  /**
   * @param config - 粒子批次配置
   */
  constructor(private _config: ParticleBatchConfig) {
    this._baseEmissionRate = _config.emissionRate;
  }

  /**
   * 初始化粒子纹理和 BillboardCollection
   */
  async init(): Promise<void> {
    this._collection = new Cesium.BillboardCollection({
      scene: this._scene!,
    });
    this._ready = true;
  }

  /**
   * 设置场景引用（在 _onStart 中由天气效果注入）
   */
  setScene(scene: InstanceType<typeof Cesium.Scene>): void {
    this._scene = scene;
    if (this._collection) {
      this._collection = new Cesium.BillboardCollection({ scene });
    }
  }

  /**
   * 将粒子集合添加到场景
   */
  addToScene(): void {
    if (!this._scene || !this._collection) return;
    if (!this._scene.primitives.contains(this._collection)) {
      this._scene.primitives.add(this._collection);
    }
  }

  /**
   * 从场景中移除粒子集合
   */
  removeFromScene(): void {
    if (!this._scene || !this._collection) return;
    if (this._scene.primitives.contains(this._collection)) {
      this._scene.primitives.remove(this._collection);
    }
  }

  /**
   * 启动粒子发射
   */
  start(): void {
    this._paused = false;
    this._emissionAccumulator = 0;
  }

  /**
   * 停止粒子发射（保留已有粒子自然消散）
   */
  stop(): void {
    this._baseEmissionRate = 0;
  }

  /**
   * 暂停粒子发射
   */
  pause(): void {
    this._paused = true;
  }

  /**
   * 恢复粒子发射
   */
  resume(): void {
    this._paused = false;
  }

  /**
   * 每帧更新：发射新粒子 + 推进现有粒子
   *
   * @param dt - 帧时间增量（秒）
   * @param camera - Cesium 相机对象
   */
  update(dt: number, camera: InstanceType<typeof Cesium.Camera>): void {
    if (!this._collection || !this._ready) return;
    if (this._paused) {
      this._collection.update();
      return;
    }

    this._emissionAccumulator += dt;
    this._emit(camera);
    this._advanceParticles(dt);
    this._cleanupDeadParticles();

    this._collection.update();
  }

  /**
   * 根据累积时间发射新粒子
   */
  private _emit(camera: InstanceType<typeof Cesium.Camera>): void {
    if (this._baseEmissionRate <= 0) return;

    const interval = 1 / this._baseEmissionRate;
    const cfg = this._config;
    let emitCount = 0;

    while (this._emissionAccumulator >= interval) {
      this._emissionAccumulator -= interval;
      emitCount++;
    }

    if (emitCount === 0) return;

    Cesium.Cartesian3.clone(camera.position, this._cameraPos);

    for (let i = 0; i < emitCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * cfg.emitterRadius;
      const originX = this._cameraPos.x + Math.cos(angle) * dist;
      const originY = this._cameraPos.y + cfg.emitterRadius * 0.5 + Math.random() * cfg.emitterRadius;
      const originZ = this._cameraPos.z + Math.sin(angle) * dist;

      const position = Cesium.Cartesian3.fromElements(originX, originY, originZ, this._scratch1);
      const billboard = this._collection!.add({
        position,
        image: cfg.image,
        width: cfg.width,
        height: cfg.height,
        color: cfg.color,
      });

      this._particles.push({
        billboard,
        elapsed: 0,
        velocityX: (Math.random() - 0.5) * cfg.horizontalSpeed,
        velocityZ: (Math.random() - 0.5) * cfg.horizontalSpeed,
        originX,
        originY,
        originZ,
      });
    }
  }

  /**
   * 推进所有活跃粒子的位置和生命周期
   */
  private _advanceParticles(dt: number): void {
    const cfg = this._config;

    for (let i = 0; i < this._particles.length; i++) {
      const p = this._particles[i]!;
      p.elapsed += dt;

      if (p.elapsed >= cfg.lifetime) {
        this._deadIndices.push(i);
        continue;
      }

      const newY = p.originY - p.elapsed * cfg.fallSpeed;
      const newX = p.originX + p.elapsed * p.velocityX;
      const newZ = p.originZ + p.elapsed * p.velocityZ;

      Cesium.Cartesian3.fromElements(newX, newY, newZ, this._scratch2);
      p.billboard.position = this._scratch2;

      const alpha = cfg.color.alpha * (1 - p.elapsed / cfg.lifetime);
      p.billboard.color = cfg.color.withAlpha(alpha);
    }
  }

  /**
   * 清理已死亡的粒子
   */
  private _cleanupDeadParticles(): void {
    if (this._deadIndices.length === 0) return;

    for (let i = this._deadIndices.length - 1; i >= 0; i--) {
      const idx = this._deadIndices[i]!;
      const particle = this._particles[idx]!;
      this._collection?.remove(particle.billboard);
    }

    this._deadIndices.sort((a, b) => b - a);
    for (const idx of this._deadIndices) {
      this._particles.splice(idx, 1);
    }
    this._deadIndices.length = 0;
  }

  /**
   * 更新发射率
   */
  updateEmissionRate(rate: number): void {
    this._config.emissionRate = rate;
    this._baseEmissionRate = rate;
  }

  /**
   * 更新颜色
   */
  updateColor(color: InstanceType<typeof Cesium.Color>): void {
    this._config.color = color;
  }

  /**
   * 更新下落速度
   */
  updateFallSpeed(speed: number): void {
    this._config.fallSpeed = speed;
  }

  /**
   * 更新水平速度
   */
  updateHorizontalSpeed(speed: number): void {
    this._config.horizontalSpeed = speed;
  }

  /**
   * 销毁粒子系统
   */
  dispose(): void {
    this._baseEmissionRate = 0;
    for (const p of this._particles) {
      this._collection?.remove(p.billboard);
    }
    this._particles.length = 0;
    this._deadIndices.length = 0;
    if (this._collection && !this._collection.isDestroyed()) {
      this._collection.destroy();
      this._collection = null;
    }
    this._ready = false;
  }
}
