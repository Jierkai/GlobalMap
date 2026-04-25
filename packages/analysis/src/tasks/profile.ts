/**
 * @module @cgx/analysis/tasks/profile
 *
 * 沿线剖面分析任务。
 *
 * 纯函数实现，可在主线程或 Worker 中运行。
 */

import type { ProfileInput, ProfileOutput } from '../protocol';

/**
 * 执行沿线剖面分析。
 *
 * 沿指定折线按固定间距采样高程，生成剖面数据。
 *
 * @param input - 剖面分析输入
 * @param signal - 可选 AbortSignal
 * @returns 剖面数据
 */
export function executeProfile(
  input: ProfileInput,
  signal?: AbortSignal
): ProfileOutput {
  checkAborted(signal);

  const { line, sampleDistance, elevation } = input;

  // line 是扁平数组 [lng0, lat0, lng1, lat1, ...]
  const pointCount = line.length / 2;
  if (pointCount < 2) {
    return {
      points: new Float64Array(0),
      elevations: new Float64Array(0),
      distances: new Float64Array(0),
    };
  }

  // 计算总长度
  const segments: number[] = [];
  let totalLength = 0;
  for (let i = 0; i < pointCount - 1; i++) {
    const lng0 = line[i * 2]!;
    const lat0 = line[i * 2 + 1]!;
    const lng1 = line[(i + 1) * 2]!;
    const lat1 = line[(i + 1) * 2 + 1]!;
    const dist = haversineDistance(lng0, lat0, lng1, lat1);
    segments.push(dist);
    totalLength += dist;
  }

  // 按 sampleDistance 采样
  const sampleCount = Math.max(2, Math.ceil(totalLength / sampleDistance) + 1);
  const points = new Float64Array(sampleCount * 2);
  const elevations = new Float64Array(sampleCount);
  const distances = new Float64Array(sampleCount);

  let segIndex = 0;
  let segProgress = 0;
  let accumulatedDist = 0;

  for (let i = 0; i < sampleCount; i++) {
    const targetDist = (i / (sampleCount - 1)) * totalLength;

    // 找到目标距离所在的线段
    while (segIndex < segments.length - 1 &&
           accumulatedDist + segments[segIndex]! < targetDist) {
      accumulatedDist += segments[segIndex]!;
      segIndex++;
    }

    const segLen = segments[segIndex]!;
    segProgress = segLen > 0 ? (targetDist - accumulatedDist) / segLen : 0;
    segProgress = Math.max(0, Math.min(1, segProgress));

    const lng0 = line[segIndex * 2]!;
    const lat0 = line[segIndex * 2 + 1]!;
    const lng1 = line[(segIndex + 1) * 2]!;
    const lat1 = line[(segIndex + 1) * 2 + 1]!;

    points[i * 2] = lng0 + (lng1 - lng0) * segProgress;
    points[i * 2 + 1] = lat0 + (lat1 - lat0) * segProgress;
    distances[i] = targetDist;

    // 高程：线性插值或固定值
    if (typeof elevation === 'number') {
      elevations[i] = elevation;
    } else {
      // 从 DEM 数组中插值
      const idx0 = Math.min(segIndex, elevation.length - 1);
      const idx1 = Math.min(segIndex + 1, elevation.length - 1);
      elevations[i] = elevation[idx0]! + (elevation[idx1]! - elevation[idx0]!) * segProgress;
    }

    checkAborted(signal);
  }

  return { points, elevations, distances };
}

/** Haversine 距离（米） */
function haversineDistance(
  lng0: number, lat0: number,
  lng1: number, lat1: number
): number {
  const R = 6371000; // 地球半径（米）
  const dLat = ((lat1 - lat0) * Math.PI) / 180;
  const dLng = ((lng1 - lng0) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat0 * Math.PI) / 180) *
      Math.cos((lat1 * Math.PI) / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function checkAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw new DOMException('Analysis aborted', 'AbortError');
  }
}
