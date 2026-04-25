/**
 * @module @cgx/analysis/tasks/viewshed
 *
 * 可视域分析任务。
 *
 * 纯函数实现，可在主线程或 Worker 中运行。
 * 首版使用简化矩形网格采样算法。
 */

import type { ViewshedInput, ViewshedOutput } from '../protocol';

/**
 * 执行可视域分析。
 *
 * 从观察点出发，按指定方向和视角范围，在网格上计算可见性。
 *
 * @param input - 可视域分析输入
 * @param signal - 可选 AbortSignal
 * @returns 可视性网格
 */
export function executeViewshed(
  input: ViewshedInput,
  signal?: AbortSignal
): ViewshedOutput {
  checkAborted(signal);

  const { observer, heading, fov, maxDistance, cellSize, elevation } = input;
  const [obsLng, obsLat, obsAlt] = observer;

  // 计算网格尺寸
  // 1度纬度 ≈ 111320 米
  const cellSizeDeg = cellSize / 111320;
  const radiusDeg = maxDistance / 111320;
  const width = Math.ceil((radiusDeg * 2) / cellSizeDeg);
  const height = width;

  // 网格原点（左下角）
  const originLng = obsLng - radiusDeg;
  const originLat = obsLat - radiusDeg;

  const grid = new Uint8Array(width * height);

  // 视角范围（弧度）
  const fovRad = (fov * Math.PI) / 180;
  const headingRad = (heading * Math.PI) / 180;
  const halfFov = fovRad / 2;

  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      checkAborted(signal);

      const cellLng = originLng + (col + 0.5) * cellSizeDeg;
      const cellLat = originLat + (row + 0.5) * cellSizeDeg;

      // 计算到观察点的距离和方向
      const dLng = cellLng - obsLng;
      const dLat = cellLat - obsLat;
      const distDeg = Math.sqrt(dLng * dLng + dLat * dLat);
      const distMeters = distDeg * 111320;

      // 超出最大距离
      if (distMeters > maxDistance) {
        grid[row * width + col] = 0;
        continue;
      }

      // 计算方位角
      const angle = Math.atan2(dLng, dLat);

      // 检查是否在视角范围内
      let angleDiff = angle - headingRad;
      // 归一化到 [-PI, PI]
      while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
      while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;

      if (Math.abs(angleDiff) > halfFov) {
        grid[row * width + col] = 0;
        continue;
      }

      // 获取目标点高程
      const cellAlt = getElevation(elevation, col, row, width, height);

      // 简化可视性判断：如果目标点高程低于观察点，则可见
      // 实际应用中需要沿线做射线投射
      if (cellAlt <= obsAlt) {
        grid[row * width + col] = 1;
      } else {
        // 考虑地球曲率和折射的简化模型
        const curvatureDrop = (distMeters * distMeters) / (2 * 6371000);
        const effectiveAlt = obsAlt - curvatureDrop * 0.13; // 折射系数 0.13
        grid[row * width + col] = cellAlt <= effectiveAlt ? 1 : 0;
      }
    }
  }

  return {
    grid,
    width,
    height,
    origin: [originLng, originLat],
    cellSizeDeg,
  };
}

/** 获取高程值 */
function getElevation(
  elevation: Float64Array | number,
  _col: number,
  _row: number,
  _width: number,
  _height: number
): number {
  if (typeof elevation === 'number') {
    return elevation;
  }
  // 从 DEM 数组中获取（简化：使用第一个值）
  return elevation[0] ?? 0;
}

function checkAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw new DOMException('Analysis aborted', 'AbortError');
  }
}
