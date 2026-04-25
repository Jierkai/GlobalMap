/**
 * @module @cgx/analysis/tasks/boolean
 *
 * 布尔运算任务（union / intersect / difference）。
 *
 * 纯函数实现，可在主线程或 Worker 中运行。
 * 首版使用简化算法，后续可接入 @turf/boolean-ops。
 */

import type { BooleanOpInput, BooleanOpOutput, GeoJSONInput } from '../protocol';

/**
 * 执行并集运算。
 */
export function executeUnion(
  input: BooleanOpInput,
  signal?: AbortSignal
): BooleanOpOutput {
  checkAborted(signal);
  // 简化实现：返回两个多边形的合并（取外边界）
  return simplifyUnion(input.a, input.b);
}

/**
 * 执行交集运算。
 */
export function executeIntersect(
  input: BooleanOpInput,
  signal?: AbortSignal
): BooleanOpOutput {
  checkAborted(signal);
  // 简化实现：检查是否有重叠，返回重叠区域近似
  return simplifyIntersection(input.a, input.b);
}

/**
 * 执行差集运算。
 */
export function executeDifference(
  input: BooleanOpInput,
  signal?: AbortSignal
): BooleanOpOutput {
  checkAborted(signal);
  // 简化实现：返回 a 减去 b 的近似
  return simplifyDifference(input.a, input.b);
}

// ---------------------------------------------------------------------------
// 简化算法（首版）
// ---------------------------------------------------------------------------

/** 简化并集：合并两个多边形的坐标 */
function simplifyUnion(a: GeoJSONInput, b: GeoJSONInput): GeoJSONInput {
  if (a.type !== 'Polygon' || b.type !== 'Polygon') {
    return a; // 简化：非多边形直接返回第一个
  }

  const coordsA = a.coordinates as number[][][];
  const coordsB = b.coordinates as number[][][];
  const ringA = coordsA[0];
  const ringB = coordsB[0];
  if (!ringA || !ringB) return a;

  // 简化：取两个多边形的凸包近似
  const allPoints = [...ringA, ...ringB];
  const hull = convexHull2D(allPoints);

  return {
    type: 'Polygon',
    coordinates: [hull],
  };
}

/** 简化交集：检查重叠并返回近似 */
function simplifyIntersection(a: GeoJSONInput, b: GeoJSONInput): BooleanOpOutput {
  if (a.type !== 'Polygon' || b.type !== 'Polygon') {
    return null;
  }

  const coordsA = a.coordinates as number[][][];
  const coordsB = b.coordinates as number[][][];
  const ringA = coordsA[0];
  const ringB = coordsB[0];
  if (!ringA || !ringB) return null;

  // 简化：检查两个多边形的边界框是否重叠
  const bboxA = getBBox(ringA);
  const bboxB = getBBox(ringB);

  const overlapX = Math.max(0, Math.min(bboxA.maxX, bboxB.maxX) - Math.max(bboxA.minX, bboxB.minX));
  const overlapY = Math.max(0, Math.min(bboxA.maxY, bboxB.maxY) - Math.max(bboxA.minY, bboxB.minY));

  if (overlapX <= 0 || overlapY <= 0) return null;

  // 返回重叠矩形
  return {
    type: 'Polygon',
    coordinates: [[
      [Math.max(bboxA.minX, bboxB.minX), Math.max(bboxA.minY, bboxB.minY)],
      [Math.min(bboxA.maxX, bboxB.maxX), Math.max(bboxA.minY, bboxB.minY)],
      [Math.min(bboxA.maxX, bboxB.maxX), Math.min(bboxA.maxY, bboxB.maxY)],
      [Math.max(bboxA.minX, bboxB.minX), Math.min(bboxA.maxY, bboxB.maxY)],
      [Math.max(bboxA.minX, bboxB.minX), Math.max(bboxA.minY, bboxB.minY)],
    ]],
  };
}

/** 简化差集：返回 a 减去重叠部分 */
function simplifyDifference(a: GeoJSONInput, b: GeoJSONInput): BooleanOpOutput {
  // 简化：如果没有交集，返回 a；否则返回 a（首版不做精确差集）
  const intersection = simplifyIntersection(a, b);
  if (!intersection) return a;

  // 首版简化：直接返回 a
  return a;
}

// ---------------------------------------------------------------------------
// 工具函数
// ---------------------------------------------------------------------------

interface BBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

function getBBox(ring: number[][]): BBox {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const coord of ring) {
    const x = coord[0]!;
    const y = coord[1]!;
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }

  return { minX, minY, maxX, maxY };
}

/** 简化 2D 凸包（Graham scan） */
function convexHull2D(points: number[][]): number[][] {
  if (points.length <= 3) return [...points, points[0]!];

  // 找到最下方的点
  let lowest = 0;
  for (let i = 1; i < points.length; i++) {
    const pi = points[i]!;
    const pl = points[lowest]!;
    if (pi[1]! < pl[1]! || (pi[1]! === pl[1]! && pi[0]! < pl[0]!)) {
      lowest = i;
    }
  }

  // 按极角排序
  const pivot = points[lowest]!;
  const sorted = points
    .filter((_, i) => i !== lowest)
    .sort((a, b) => {
      const angleA = Math.atan2(a[1]! - pivot[1]!, a[0]! - pivot[0]!);
      const angleB = Math.atan2(b[1]! - pivot[1]!, b[0]! - pivot[0]!);
      return angleA - angleB;
    });

  // Graham scan
  const hull: number[][] = [pivot];
  for (const p of sorted) {
    while (hull.length >= 2) {
      const a = hull[hull.length - 2]!;
      const b = hull[hull.length - 1]!;
      const cross = (b[0]! - a[0]!) * (p[1]! - a[1]!) - (b[1]! - a[1]!) * (p[0]! - a[0]!);
      if (cross <= 0) {
        hull.pop();
      } else {
        break;
      }
    }
    hull.push(p);
  }

  // 闭合
  hull.push(hull[0]!);
  return hull;
}

function checkAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw new DOMException('Analysis aborted', 'AbortError');
  }
}
