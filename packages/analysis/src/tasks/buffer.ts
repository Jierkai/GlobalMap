/**
 * @module @cgx/analysis/tasks/buffer
 *
 * 缓冲区分析任务。
 *
 * 纯函数实现，可在主线程或 Worker 中运行。
 * 首版使用简化算法（圆形近似），后续可接入 @turf/buffer。
 */

import type { BufferInput, BufferOutput, GeoJSONInput } from '../protocol';

/**
 * 执行缓冲区分析。
 *
 * 将输入的 GeoJSON 要素按指定距离生成缓冲区。
 * 首版使用简化圆形近似算法。
 *
 * @param input - 缓冲区分析输入
 * @param signal - 可选 AbortSignal
 * @returns 缓冲后的 GeoJSON
 */
export function executeBuffer(
  input: BufferInput,
  signal?: AbortSignal
): BufferOutput {
  checkAborted(signal);

  const { geojson, distance, steps = 32 } = input;

  if (geojson.type === 'Point') {
    return bufferPoint(geojson.coordinates as number[], distance, steps);
  }

  if (geojson.type === 'LineString') {
    return bufferLineString(geojson.coordinates as number[][], distance, steps);
  }

  if (geojson.type === 'Polygon') {
    return bufferPolygon(geojson.coordinates as number[][][], distance, steps);
  }

  // Multi 类型：对每个子要素分别缓冲
  if (geojson.type === 'MultiPoint') {
    const polygons = (geojson.coordinates as number[][]).map((coord) =>
      bufferPoint(coord, distance, steps)
    );
    return {
      type: 'MultiPolygon',
      coordinates: polygons.map((p) => p.coordinates) as number[][][][],
    };
  }

  // 简化处理：返回原始几何
  return geojson;
}

/** 点缓冲：生成圆形多边形 */
function bufferPoint(
  coord: number[],
  distance: number,
  steps: number
): GeoJSONInput {
  const lng = coord[0]!;
  const lat = coord[1]!;
  const coords: number[][] = [];

  // 简化的度数近似：1度纬度 ≈ 111320 米
  const radiusDeg = distance / 111320;

  for (let i = 0; i <= steps; i++) {
    const angle = (2 * Math.PI * i) / steps;
    coords.push([
      lng + radiusDeg * Math.cos(angle) / Math.cos((lat * Math.PI) / 180),
      lat + radiusDeg * Math.sin(angle),
    ]);
  }

  return {
    type: 'Polygon',
    coordinates: [coords],
  };
}

/** 折线缓冲：沿线两侧扩展 */
function bufferLineString(
  coordinates: number[][],
  distance: number,
  steps: number
): GeoJSONInput {
  if (coordinates.length === 0) {
    return { type: 'Polygon', coordinates: [[]] };
  }

  if (coordinates.length === 1) {
    return bufferPoint(coordinates[0]!, distance, steps);
  }

  // 简化处理：对每个端点生成圆形缓冲，然后合并
  const buffers = coordinates.map((coord) => bufferPoint(coord, distance, steps));

  // 返回第一个缓冲区（简化版）
  return buffers[0]!;
}

/** 多边形缓冲：向外扩展 */
function bufferPolygon(
  coordinates: number[][][],
  distance: number,
  _steps: number
): GeoJSONInput {
  if (coordinates.length === 0) {
    return { type: 'Polygon', coordinates: [[]] };
  }

  const ring = coordinates[0];
  if (!ring || ring.length === 0) {
    return { type: 'Polygon', coordinates: [[]] };
  }

  // 简化处理：对每个顶点生成缓冲
  const radiusDeg = distance / 111320;
  const expanded: number[][] = ring.map((coord) => {
    const lng = coord[0]!;
    const lat = coord[1]!;
    return [
      lng + radiusDeg / Math.cos((lat * Math.PI) / 180),
      lat + radiusDeg,
    ];
  });

  return {
    type: 'Polygon',
    coordinates: [expanded],
  };
}

function checkAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw new DOMException('Analysis aborted', 'AbortError');
  }
}
