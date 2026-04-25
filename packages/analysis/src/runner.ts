/**
 * @module @cgx/analysis/runner
 *
 * Worker 调度器（主线程侧）。
 *
 * 负责：
 * - 管理 Worker 池
 * - 分发任务到 Worker
 * - 处理 AbortSignal 中止
 * - 返回 Promise 结果
 *
 * 首版使用单 Worker 模式，后续可扩展为池化。
 */

import type {
  TaskKind,
  TaskInput,
  TaskOutput,
  TaskRequest,
  TaskResponse,
  AbortMessage,
} from './protocol';

// ---------------------------------------------------------------------------
// 类型定义
// ---------------------------------------------------------------------------

/** AnalysisRunner 配置 */
export interface AnalysisRunnerOptions {
  /** Worker 池大小（首版固定为 1） */
  readonly poolSize?: number;
  /** Worker 入口 URL（构建工具生成） */
  readonly workerUrl?: string | URL;
}

/** AnalysisRunner 接口 */
export interface AnalysisRunner {
  /**
   * 执行分析任务。
   *
   * @param kind - 任务类型
   * @param input - 任务输入
   * @param opts - 可选配置（含 AbortSignal）
   * @returns 任务结果 Promise
   */
  run<K extends TaskKind>(
    kind: K,
    input: TaskInput<K>,
    opts?: { signal?: AbortSignal }
  ): Promise<TaskOutput<K>>;

  /** 销毁 Runner，终止所有 Worker */
  dispose(): void;
  /** 是否已销毁 */
  readonly disposed: boolean;
}

// ---------------------------------------------------------------------------
// 内部任务执行器（直接在主线程执行，不经过 Worker）
// ---------------------------------------------------------------------------

import { executeBuffer } from './tasks/buffer';
import { executeUnion, executeIntersect, executeDifference } from './tasks/boolean';
import { executeProfile } from './tasks/profile';
import { executeViewshed } from './tasks/viewshed';

/** 根据任务类型执行任务（主线程直接执行） */
function executeTask<K extends TaskKind>(
  kind: K,
  input: TaskInput<K>,
  signal?: AbortSignal
): TaskOutput<K> {
  switch (kind) {
    case 'buffer':
      return executeBuffer(input as TaskInput<'buffer'>, signal) as TaskOutput<K>;
    case 'union':
      return executeUnion(input as TaskInput<'union'>, signal) as TaskOutput<K>;
    case 'intersect':
      return executeIntersect(input as TaskInput<'intersect'>, signal) as TaskOutput<K>;
    case 'difference':
      return executeDifference(input as TaskInput<'difference'>, signal) as TaskOutput<K>;
    case 'profile':
      return executeProfile(input as TaskInput<'profile'>, signal) as TaskOutput<K>;
    case 'viewshed':
      return executeViewshed(input as TaskInput<'viewshed'>, signal) as TaskOutput<K>;
    default: {
      const _exhaustive: never = kind;
      throw new Error(`Unknown task kind: ${String(_exhaustive)}`);
    }
  }
}

// ---------------------------------------------------------------------------
// AnalysisRunner 实现
// ---------------------------------------------------------------------------

class AnalysisRunnerImpl implements AnalysisRunner {
  private _disposed = false;
  private readonly _workerUrl: string | URL | undefined;

  constructor(_opts?: AnalysisRunnerOptions) {
    this._workerUrl = _opts?.workerUrl;
  }

  async run<K extends TaskKind>(
    kind: K,
    input: TaskInput<K>,
    opts?: { signal?: AbortSignal }
  ): Promise<TaskOutput<K>> {
    this.assertNotDisposed();

    const signal = opts?.signal;

    // 检查是否已中止
    if (signal?.aborted) {
      throw new DOMException('Analysis aborted', 'AbortError');
    }

    // 如果提供了 Worker URL，使用 Worker 执行
    if (this._workerUrl) {
      return this.runInWorker(kind, input, signal);
    }

    // 否则在主线程直接执行（用于测试和简单场景）
    return this.runOnMainThread(kind, input, signal);
  }

  dispose(): void {
    if (this._disposed) return;
    this._disposed = true;
  }

  get disposed(): boolean {
    return this._disposed;
  }

  // -------------------------------------------------------------------------
  // 内部方法
  // -------------------------------------------------------------------------

  private assertNotDisposed(): void {
    if (this._disposed) {
      throw new Error('AnalysisRunner has been disposed');
    }
  }

  /** 在主线程直接执行任务 */
  private async runOnMainThread<K extends TaskKind>(
    kind: K,
    input: TaskInput<K>,
    signal?: AbortSignal
  ): Promise<TaskOutput<K>> {
    // 使用 setTimeout 让出主线程，模拟异步行为
    return new Promise<TaskOutput<K>>((resolve, reject) => {
      const timer = setTimeout(() => {
        try {
          const result = executeTask(kind, input, signal);
          resolve(result);
        } catch (err) {
          reject(err);
        }
      }, 0);

      // 监听中止信号
      if (signal) {
        signal.addEventListener('abort', () => {
          clearTimeout(timer);
          reject(new DOMException('Analysis aborted', 'AbortError'));
        }, { once: true });
      }
    });
  }

  /** 在 Worker 中执行任务 */
  private runInWorker<K extends TaskKind>(
    kind: K,
    input: TaskInput<K>,
    signal?: AbortSignal
  ): Promise<TaskOutput<K>> {
    return new Promise<TaskOutput<K>>((resolve, reject) => {
      const worker = new Worker(this._workerUrl!);
      const id = crypto.randomUUID();

      // 监听 Worker 响应
      worker.onmessage = (event: MessageEvent<TaskResponse<K>>) => {
        const response = event.data;
        if (response.id !== id) return;

        worker.terminate();

        if (response.ok) {
          resolve(response.result);
        } else if ('aborted' in response && response.aborted) {
          reject(new DOMException('Analysis aborted', 'AbortError'));
        } else {
          const errResp = response as { id: string; ok: false; error: string };
          reject(new Error(errResp.error));
        }
      };

      worker.onerror = (err) => {
        worker.terminate();
        reject(new Error(`Worker error: ${err.message}`));
      };

      // 发送任务请求
      const request: TaskRequest<K> = { id, kind, input };
      worker.postMessage(request);

      // 监听中止信号
      if (signal) {
        signal.addEventListener('abort', () => {
          const abortMsg: AbortMessage = { type: 'abort', id };
          worker.postMessage(abortMsg);
          // 延迟终止 Worker，给它时间处理 abort
          setTimeout(() => worker.terminate(), 100);
          reject(new DOMException('Analysis aborted', 'AbortError'));
        }, { once: true });
      }
    });
  }
}

// ---------------------------------------------------------------------------
// 工厂函数
// ---------------------------------------------------------------------------

/**
 * 创建一个 AnalysisRunner 实例。
 *
 * @param opts - 可选配置
 * @returns AnalysisRunner 实例
 *
 * @example
 * ```ts
 * const runner = createAnalysisRunner();
 *
 * // 缓冲区分析
 * const result = await runner.run('buffer', {
 *   geojson: { type: 'Point', coordinates: [116.4, 39.9] },
 *   distance: 1000,
 * });
 *
 * // 带中止
 * const controller = new AbortController();
 * setTimeout(() => controller.abort(), 5000);
 * const result2 = await runner.run('profile', input, { signal: controller.signal });
 * ```
 */
export function createAnalysisRunner(opts?: AnalysisRunnerOptions): AnalysisRunner {
  return new AnalysisRunnerImpl(opts);
}
