/**
 * @module @cgx/sketch/sketchers
 *
 * 6 种标绘工具工厂函数。
 *
 * 每个工厂返回一个 Sketcher 实例，内部使用 BaseSketcher + FSM。
 * 命名遵循 Cgx 规范（Sketcher 而非 Plot）。
 */

import { BaseSketcher } from './BaseSketcher';
import type { Sketcher, SketcherOptions } from './types';

/**
 * 创建点标绘工具。
 *
 * 只需一个顶点即完成。
 */
export function createPointSketcher(opts?: SketcherOptions): Sketcher {
  return new BaseSketcher('point', {
    ...opts,
    minVertices: 1,
    maxVertices: 1,
  });
}

/**
 * 创建折线标绘工具。
 *
 * 至少 2 个顶点，无上限（手动 complete）。
 */
export function createPolylineSketcher(opts?: SketcherOptions): Sketcher {
  return new BaseSketcher('polyline', {
    ...opts,
    minVertices: opts?.minVertices ?? 2,
  });
}

/**
 * 创建多边形标绘工具。
 *
 * 至少 3 个顶点，无上限（手动 complete）。
 */
export function createPolygonSketcher(opts?: SketcherOptions): Sketcher {
  return new BaseSketcher('polygon', {
    ...opts,
    minVertices: opts?.minVertices ?? 3,
  });
}

/**
 * 创建矩形标绘工具。
 *
 * 只需 2 个对角顶点即完成。
 */
export function createRectangleSketcher(opts?: SketcherOptions): Sketcher {
  return new BaseSketcher('rectangle', {
    ...opts,
    minVertices: 2,
    maxVertices: 2,
  });
}

/**
 * 创建圆标绘工具。
 *
 * 第一个顶点为圆心，第二个顶点确定半径。
 */
export function createCircleSketcher(opts?: SketcherOptions): Sketcher {
  return new BaseSketcher('circle', {
    ...opts,
    minVertices: 2,
    maxVertices: 2,
  });
}

/**
 * 创建自由绘制工具。
 *
 * 持续添加顶点，手动 complete 结束。
 */
export function createFreehandSketcher(opts?: SketcherOptions): Sketcher {
  return new BaseSketcher('freehand', {
    ...opts,
    minVertices: opts?.minVertices ?? 2,
  });
}
