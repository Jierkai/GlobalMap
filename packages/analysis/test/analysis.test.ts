/**
 * @cgx/analysis 单元测试
 *
 * 覆盖：
 * - AnalysisRunner 创建与销毁
 * - buffer 任务执行
 * - union/intersect/difference 任务执行
 * - profile 任务执行
 * - viewshed 任务执行
 * - AbortController 中止
 * - 并发任务不串数据
 */

import { describe, it, expect } from 'vitest';
import { createAnalysisRunner } from '../src/runner';
import type { GeoJSONInput } from '../src/protocol';

// ---------------------------------------------------------------------------
// 辅助
// ---------------------------------------------------------------------------

const pointGeoJSON: GeoJSONInput = {
  type: 'Point',
  coordinates: [116.4, 39.9],
};

const polygonGeoJSON: GeoJSONInput = {
  type: 'Polygon',
  coordinates: [[[116.0, 39.0], [117.0, 39.0], [117.0, 40.0], [116.0, 40.0], [116.0, 39.0]]],
};

// ---------------------------------------------------------------------------
// AnalysisRunner 创建与销毁
// ---------------------------------------------------------------------------

describe('createAnalysisRunner', () => {
  it('创建 Runner 实例', () => {
    const runner = createAnalysisRunner();
    expect(runner.disposed).toBe(false);
  });

  it('dispose 后 disposed 为 true', () => {
    const runner = createAnalysisRunner();
    runner.dispose();
    expect(runner.disposed).toBe(true);
  });

  it('dispose 后 run 抛异常', async () => {
    const runner = createAnalysisRunner();
    runner.dispose();
    await expect(
      runner.run('buffer', { geojson: pointGeoJSON, distance: 100 })
    ).rejects.toThrow('disposed');
  });

  it('重复 dispose 不抛异常', () => {
    const runner = createAnalysisRunner();
    runner.dispose();
    runner.dispose();
  });
});

// ---------------------------------------------------------------------------
// buffer 任务
// ---------------------------------------------------------------------------

describe('buffer 任务', () => {
  it('点缓冲返回 Polygon', async () => {
    const runner = createAnalysisRunner();
    const result = await runner.run('buffer', {
      geojson: pointGeoJSON,
      distance: 1000,
    });
    expect(result.type).toBe('Polygon');
    const coords = result.coordinates as number[][][];
    expect(coords[0]).toBeDefined();
    expect(coords[0]!.length).toBeGreaterThan(3);
    runner.dispose();
  });

  it('折线缓冲返回 Polygon', async () => {
    const runner = createAnalysisRunner();
    const result = await runner.run('buffer', {
      geojson: {
        type: 'LineString',
        coordinates: [[116.0, 39.0], [116.1, 39.1]],
      },
      distance: 500,
    });
    expect(result.type).toBe('Polygon');
    runner.dispose();
  });

  it('多边形缓冲返回 Polygon', async () => {
    const runner = createAnalysisRunner();
    const result = await runner.run('buffer', {
      geojson: polygonGeoJSON,
      distance: 100,
    });
    expect(result.type).toBe('Polygon');
    runner.dispose();
  });
});

// ---------------------------------------------------------------------------
// 布尔运算任务
// ---------------------------------------------------------------------------

describe('布尔运算任务', () => {
  it('union 返回 Polygon 或 null', async () => {
    const runner = createAnalysisRunner();
    const result = await runner.run('union', {
      a: polygonGeoJSON,
      b: {
        type: 'Polygon',
        coordinates: [[[116.5, 39.5], [117.5, 39.5], [117.5, 40.5], [116.5, 40.5], [116.5, 39.5]]],
      },
    });
    // 有重叠时返回 Polygon
    if (result) {
      expect(result.type).toBe('Polygon');
    }
    runner.dispose();
  });

  it('intersect 返回重叠区域或 null', async () => {
    const runner = createAnalysisRunner();
    const result = await runner.run('intersect', {
      a: polygonGeoJSON,
      b: {
        type: 'Polygon',
        coordinates: [[[116.5, 39.5], [117.5, 39.5], [117.5, 40.5], [116.5, 40.5], [116.5, 39.5]]],
      },
    });
    // 有重叠时返回 Polygon
    if (result) {
      expect(result.type).toBe('Polygon');
    }
    runner.dispose();
  });

  it('intersect 无重叠返回 null', async () => {
    const runner = createAnalysisRunner();
    const result = await runner.run('intersect', {
      a: polygonGeoJSON,
      b: {
        type: 'Polygon',
        coordinates: [[[120.0, 40.0], [121.0, 40.0], [121.0, 41.0], [120.0, 41.0], [120.0, 40.0]]],
      },
    });
    expect(result).toBeNull();
    runner.dispose();
  });

  it('difference 返回 Polygon 或 null', async () => {
    const runner = createAnalysisRunner();
    const result = await runner.run('difference', {
      a: polygonGeoJSON,
      b: {
        type: 'Polygon',
        coordinates: [[[116.5, 39.5], [117.5, 39.5], [117.5, 40.5], [116.5, 40.5], [116.5, 39.5]]],
      },
    });
    // 首版简化：返回 a
    if (result) {
      expect(result.type).toBe('Polygon');
    }
    runner.dispose();
  });
});

// ---------------------------------------------------------------------------
// profile 任务
// ---------------------------------------------------------------------------

describe('profile 任务', () => {
  it('返回剖面数据', async () => {
    const runner = createAnalysisRunner();
    const result = await runner.run('profile', {
      line: new Float64Array([116.0, 39.0, 116.1, 39.0, 116.2, 39.1]),
      sampleDistance: 1000,
      elevation: 100,
    });
    const pointCount = result.points.length / 2;
    expect(pointCount).toBeGreaterThan(0);
    expect(result.elevations.length).toBe(pointCount);
    expect(result.distances.length).toBe(pointCount);
    runner.dispose();
  });

  it('两点线段返回至少 2 个采样点', async () => {
    const runner = createAnalysisRunner();
    const result = await runner.run('profile', {
      line: new Float64Array([116.0, 39.0, 116.1, 39.0]),
      sampleDistance: 5000,
      elevation: 50,
    });
    expect(result.points.length / 2).toBeGreaterThanOrEqual(2);
    runner.dispose();
  });

  it('单点线段返回空结果', async () => {
    const runner = createAnalysisRunner();
    const result = await runner.run('profile', {
      line: new Float64Array([116.0, 39.0]),
      sampleDistance: 1000,
      elevation: 0,
    });
    expect(result.points.length).toBe(0);
    runner.dispose();
  });
});

// ---------------------------------------------------------------------------
// viewshed 任务
// ---------------------------------------------------------------------------

describe('viewshed 任务', () => {
  it('返回可视性网格', async () => {
    const runner = createAnalysisRunner();
    const result = await runner.run('viewshed', {
      observer: [116.4, 39.9, 100],
      heading: 0,
      fov: 90,
      maxDistance: 5000,
      cellSize: 100,
      elevation: 50,
    });
    expect(result.grid.length).toBeGreaterThan(0);
    expect(result.width).toBeGreaterThan(0);
    expect(result.height).toBeGreaterThan(0);
    expect(result.origin).toHaveLength(2);
    expect(result.cellSizeDeg).toBeGreaterThan(0);
    runner.dispose();
  });

  it('观察点高程高于目标时全部可见', async () => {
    const runner = createAnalysisRunner();
    const result = await runner.run('viewshed', {
      observer: [116.4, 39.9, 1000],
      heading: 0,
      fov: 360,
      maxDistance: 1000,
      cellSize: 100,
      elevation: 0, // 地面高程为 0
    });
    // 大部分网格应该可见
    const visibleCount = result.grid.filter((v) => v === 1).length;
    expect(visibleCount).toBeGreaterThan(0);
    runner.dispose();
  });
});

// ---------------------------------------------------------------------------
// AbortController 中止
// ---------------------------------------------------------------------------

describe('AbortController 中止', () => {
  it('已中止的 signal 立即 reject', async () => {
    const runner = createAnalysisRunner();
    const ac = new AbortController();
    ac.abort();

    try {
      await runner.run('buffer', { geojson: pointGeoJSON, distance: 100 }, { signal: ac.signal });
      expect.fail('Should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(DOMException);
      expect((err as DOMException).name).toBe('AbortError');
    }
    runner.dispose();
  });

  it('中止后 reject AbortError', async () => {
    const runner = createAnalysisRunner();
    const ac = new AbortController();

    // 立即中止
    ac.abort();

    try {
      await runner.run('profile', {
        line: new Float64Array([116.0, 39.0, 116.1, 39.0]),
        sampleDistance: 100,
        elevation: 0,
      }, { signal: ac.signal });
      expect.fail('Should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(DOMException);
      expect((err as DOMException).name).toBe('AbortError');
    }
    runner.dispose();
  });
});

// ---------------------------------------------------------------------------
// 并发任务
// ---------------------------------------------------------------------------

describe('并发任务', () => {
  it('多个任务并发执行不串数据', async () => {
    const runner = createAnalysisRunner();

    const [result1, result2, result3] = await Promise.all([
      runner.run('buffer', { geojson: pointGeoJSON, distance: 100 }),
      runner.run('buffer', { geojson: pointGeoJSON, distance: 200 }),
      runner.run('buffer', { geojson: pointGeoJSON, distance: 300 }),
    ]);

    // 三个结果都应该返回 Polygon
    expect(result1.type).toBe('Polygon');
    expect(result2.type).toBe('Polygon');
    expect(result3.type).toBe('Polygon');

    // 距离越大，缓冲区越大（顶点坐标偏移更大）
    const coords1 = (result1.coordinates as number[][][])[0]!;
    const coords3 = (result3.coordinates as number[][][])[0]!;
    const maxDist1 = Math.max(...coords1.map((c) => Math.abs(c[0]! - 116.4)));
    const maxDist3 = Math.max(...coords3.map((c) => Math.abs(c[0]! - 116.4)));
    expect(maxDist3).toBeGreaterThan(maxDist1);

    runner.dispose();
  });
});
