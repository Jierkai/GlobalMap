/**
 * @module @cgx/analysis
 *
 * Cgx 空间分析工具集（L3 Feature API）
 *
 * 所有耗时计算在 Worker 中执行（或主线程异步），支持 AbortController 中止。
 * Worker 模块禁止 import 'cesium'，输入/输出均为纯数据。
 *
 * @example
 * ```ts
 * import { createAnalysisRunner } from '@cgx/analysis';
 *
 * const runner = createAnalysisRunner();
 *
 * // 缓冲区分析
 * const buffer = await runner.run('buffer', {
 *   geojson: { type: 'Point', coordinates: [116.4, 39.9] },
 *   distance: 1000,
 * });
 *
 * // 带中止
 * const ac = new AbortController();
 * const result = await runner.run('profile', input, { signal: ac.signal });
 * ```
 */

export { createAnalysisRunner } from './runner.js';
export type { AnalysisRunner, AnalysisRunnerOptions } from './runner.js';

export type {
  TaskKind,
  TaskInput,
  TaskOutput,
  TaskInputMap,
  TaskOutputMap,
  BufferInput,
  BufferOutput,
  BooleanOpInput,
  BooleanOpOutput,
  ProfileInput,
  ProfileOutput,
  ViewshedInput,
  ViewshedOutput,
  GeoJSONInput,
  TaskRequest,
  TaskResponse,
  TaskSuccessResponse,
  TaskErrorResponse,
  TaskAbortResponse,
  AbortMessage,
} from './protocol.js';
