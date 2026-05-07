/**
 * @fileoverview 动画循环工具模块
 * 提供可组合的 requestAnimationFrame 动画循环，供各天气效果复用
 *
 * @module effect/utils/animator
 */

/**
 * 动画循环组件
 *
 * @description
 * 封装 requestAnimationFrame 循环，提供统一的帧步进回调。
 * 该组件通过组合方式注入到各天气效果中，避免每个效果类重复实现动画调度逻辑。
 *
 * 每次帧回调会传入自上一帧以来的时间增量（秒），
 * 方便粒子系统根据真实时间差计算运动轨迹。
 *
 * @example
 * ```typescript
 * const animator = new AnimationLoop();
 * animator.start((dt) => {
 *   console.log(`帧时间: ${dt}s`);
 * });
 * animator.stop();
 * ```
 */
export class AnimationLoop {
  /** requestAnimationFrame 返回的帧 ID */
  private _rafId = 0;

  /** 上一帧的时间戳（毫秒） */
  private _lastTime = 0;

  /** 帧回调函数 */
  private _callback: ((dt: number) => void) | null = null;

  /**
   * 启动动画循环
   *
   * @param callback - 每帧的回调函数，接收时间增量（秒）
   */
  start(callback: (dt: number) => void): void {
    this._callback = callback;
    this._lastTime = performance.now();
    this._tick();
  }

  /**
   * 停止动画循环
   */
  stop(): void {
    if (this._rafId) {
      cancelAnimationFrame(this._rafId);
      this._rafId = 0;
    }
    this._callback = null;
    this._lastTime = 0;
  }

  /**
   * 动画循环是否正在运行
   */
  get isRunning(): boolean {
    return this._rafId !== 0;
  }

  /**
   * 单帧步进
   *
   * @internal
   */
  private _tick = (): void => {
    this._rafId = requestAnimationFrame(this._tick);
    const now = performance.now();
    const dt = Math.min((now - this._lastTime) / 1000, 0.1);
    this._lastTime = now;
    this._callback?.(dt);
  };
}
