/**
 * @module @cgx/sketch
 *
 * Cgx 矢量标绘工具集（L3 Feature API）
 *
 * 提供 6 种标绘工具，每个工具是 FSM 实例（idle → drawing → finished），
 * 产出纯数据顶点，通过 @cgx/history Command 提交。
 *
 * @example
 * ```ts
 * import { createPolygonSketcher } from '@cgx/sketch';
 *
 * const sketcher = createPolygonSketcher();
 * sketcher.start();
 * sketcher.addVertex({ x: 116.4, y: 39.9 });
 * sketcher.addVertex({ x: 116.5, y: 39.9 });
 * sketcher.addVertex({ x: 116.5, y: 40.0 });
 * const vertices = sketcher.complete();
 * ```
 */

// Sketcher 工厂函数
export {
  createPointSketcher,
  createPolylineSketcher,
  createPolygonSketcher,
  createRectangleSketcher,
  createCircleSketcher,
  createFreehandSketcher,
} from './sketchers.js';

// Command 工厂函数
export {
  createAddVertexCommand,
  createRemoveVertexCommand,
  createMoveVertexCommand,
  createBatchTransformCommand,
} from './commands.js';

// 类型导出
export type {
  Sketcher,
  SketcherState,
  SketcherEvents,
  SketcherOptions,
  SketchFeatureData,
} from './types.js';

export type {
  AddVertexPayload,
  RemoveVertexPayload,
  MoveVertexPayload,
  BatchTransformPayload,
  TransformKind,
} from './commands.js';
