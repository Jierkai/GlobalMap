import { metricsBus } from '@cgx/core';

/** 批处理器构造选项。 */
export interface UpdateBatcherOptions {
  /** 是否启用批处理，默认 true（可被环境变量 CGX_DISABLE_BATCHING=1 覆盖）。 */
  enabled?: boolean;
  /** 自定义调度器，默认使用 requestAnimationFrame（环境不支持时降级为 setTimeout 16ms）。 */
  scheduler?: (cb: () => void) => number;
}

/** 将补丁应用到 Cesium 对象的函数类型。 */
type ApplyFn<T> = (patch: T) => void;

/** 队列条目，保存合并后的补丁及其对应的应用函数。 */
interface QueueEntry<T> { patch: T; apply: ApplyFn<T>; }

/**
 * RAF 合并式更新批处理器。
 *
 * 在同一动画帧内，同一 handleId 的多次 `enqueue` 调用会将补丁浅合并，
 * 帧末 `flush` 时对每个 handle 只执行一次 Cesium 写入，
 * 从而大幅降低引擎原生调用频率。
 *
 * 提供两条逃生舱口：
 * - `opts.sync = true`：立即应用，绕过队列。
 * - `new UpdateBatcher({ enabled: false })`：完全禁用批处理，每次入队即写入。
 */
export class UpdateBatcher {
  private readonly enabled: boolean;
  private readonly scheduler: (cb: () => void) => number;
  private queue = new Map<string, QueueEntry<any>>();
  private rafHandle: number | null = null;
  private patchCount = 0;
  private writeCount = 0;

  constructor(options: UpdateBatcherOptions = {}) {
    const envDisable = typeof process !== 'undefined' && process.env?.CGX_DISABLE_BATCHING === '1';
    this.enabled = options.enabled ?? !envDisable;
    this.scheduler = options.scheduler ?? ((cb) => {
      if (typeof requestAnimationFrame === 'function') return requestAnimationFrame(cb);
      return setTimeout(cb, 16) as unknown as number;
    });
  }

  /**
   * 将一个补丁加入指定 handle 的批处理队列。
   *
   * - 若批处理已禁用或传入 `opts.sync = true`，则立即应用补丁。
   * - 否则与该 handle 队列中的已有补丁浅合并，并在下一帧统一写入。
   *
   * @param handleId  handle 唯一标识符
   * @param patch     本次变更的补丁对象
   * @param apply     将最终补丁写入 Cesium 的函数
   * @param opts      可选选项，`sync: true` 强制同步写入
   */
  enqueue<T>(handleId: string, patch: T, apply: ApplyFn<T>, opts?: { sync?: boolean }): void {
    if (!this.enabled || opts?.sync) {
      this.writeCount += 1;
      metricsBus.set('frameNativeWriteCount', this.writeCount);
      apply(patch);
      return;
    }
    this.patchCount += 1;
    metricsBus.set('framePatchCount', this.patchCount);
    const existing = this.queue.get(handleId);
    if (existing) {
      existing.patch = { ...existing.patch, ...patch };
    } else {
      this.queue.set(handleId, { patch: { ...patch }, apply });
    }
    this.scheduleFlush();
  }

  /**
   * 立即冲刷队列，对每个 handle 执行一次 Cesium 写入后清空队列。
   * 通常由调度器在帧末自动调用，也可在测试中手动调用。
   */
  flush(): void {
    this.rafHandle = null;
    for (const { patch, apply } of this.queue.values()) {
      this.writeCount += 1;
      apply(patch);
    }
    metricsBus.set('frameNativeWriteCount', this.writeCount);
    this.queue.clear();
  }

  /**
   * 返回当前帧的指标快照（不重置计数器）。
   * @returns 本批处理器累计的补丁入队次数与原生写入次数
   */
  snapshot(): { framePatchCount: number; frameNativeWriteCount: number } {
    return { framePatchCount: this.patchCount, frameNativeWriteCount: this.writeCount };
  }

  /** 重置内部指标计数器（通常在每帧开始前由外部调用）。 */
  resetMetrics(): void {
    this.patchCount = 0;
    this.writeCount = 0;
  }

  /** 若尚无待处理的 RAF 请求，则向调度器注册一次冲刷回调。 */
  private scheduleFlush(): void {
    if (this.rafHandle !== null) return;
    this.rafHandle = this.scheduler(() => this.flush());
  }
}
