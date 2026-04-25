/**
 * @cgx/sketch 单元测试
 *
 * 覆盖：
 * - 6 种 Sketcher 工厂创建
 * - FSM 状态转移（idle → drawing → finished/cancelled）
 * - 顶点添加/撤销/完成
 * - 约束系统应用
 * - 事件派发
 * - dispose 销毁
 */

import { describe, it, expect, vi } from 'vitest';
import {
  createPointSketcher,
  createPolylineSketcher,
  createPolygonSketcher,
  createRectangleSketcher,
  createCircleSketcher,
  createFreehandSketcher,
} from '../src/sketchers';
import { orthoConstraint, lengthLockConstraint } from '@cgx/core';
import type { Point2D } from '@cgx/core';

// ---------------------------------------------------------------------------
// 辅助
// ---------------------------------------------------------------------------

function p(x: number, y: number): Point2D {
  return { x, y };
}

// ---------------------------------------------------------------------------
// 工厂创建
// ---------------------------------------------------------------------------

describe('Sketcher 工厂创建', () => {
  it('createPointSketcher 创建点标绘工具', () => {
    const s = createPointSketcher();
    expect(s.kind).toBe('point');
    expect(s.state.get().phase).toBe('idle');
    expect(s.vertices).toHaveLength(0);
    expect(s.disposed).toBe(false);
  });

  it('createPolylineSketcher 创建折线标绘工具', () => {
    const s = createPolylineSketcher();
    expect(s.kind).toBe('polyline');
  });

  it('createPolygonSketcher 创建多边形标绘工具', () => {
    const s = createPolygonSketcher();
    expect(s.kind).toBe('polygon');
  });

  it('createRectangleSketcher 创建矩形标绘工具', () => {
    const s = createRectangleSketcher();
    expect(s.kind).toBe('rectangle');
  });

  it('createCircleSketcher 创建圆标绘工具', () => {
    const s = createCircleSketcher();
    expect(s.kind).toBe('circle');
  });

  it('createFreehandSketcher 创建自由绘制工具', () => {
    const s = createFreehandSketcher();
    expect(s.kind).toBe('freehand');
  });
});

// ---------------------------------------------------------------------------
// FSM 状态转移
// ---------------------------------------------------------------------------

describe('Sketcher FSM 状态转移', () => {
  it('idle → drawing（start）', () => {
    const s = createPolylineSketcher();
    s.start();
    expect(s.state.get().phase).toBe('drawing');
  });

  it('drawing → finished（complete，满足最小顶点数）', () => {
    const s = createPolylineSketcher();
    s.start();
    s.addVertex(p(0, 0));
    s.addVertex(p(1, 1));
    const result = s.complete();
    expect(s.state.get().phase).toBe('finished');
    expect(result).toHaveLength(2);
  });

  it('drawing → cancelled（cancel）', () => {
    const s = createPolylineSketcher();
    s.start();
    s.addVertex(p(0, 0));
    s.cancel();
    expect(s.state.get().phase).toBe('cancelled');
    expect(s.vertices).toHaveLength(0);
  });

  it('不满足最小顶点数时 complete 返回空', () => {
    const s = createPolygonSketcher(); // minVertices = 3
    s.start();
    s.addVertex(p(0, 0));
    const result = s.complete();
    expect(result).toHaveLength(0);
    expect(s.state.get().phase).toBe('drawing');
  });

  it('idle 状态下 addVertex 无效', () => {
    const s = createPolylineSketcher();
    s.addVertex(p(0, 0));
    expect(s.vertices).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// 顶点操作
// ---------------------------------------------------------------------------

describe('Sketcher 顶点操作', () => {
  it('addVertex 添加顶点', () => {
    const s = createPolylineSketcher();
    s.start();
    s.addVertex(p(1, 2));
    s.addVertex(p(3, 4));
    expect(s.vertices).toHaveLength(2);
    expect(s.vertices[0]).toEqual(p(1, 2));
    expect(s.vertices[1]).toEqual(p(3, 4));
  });

  it('undoVertex 撤销最后一个顶点', () => {
    const s = createPolylineSketcher();
    s.start();
    s.addVertex(p(1, 2));
    s.addVertex(p(3, 4));
    s.undoVertex();
    expect(s.vertices).toHaveLength(1);
    expect(s.vertices[0]).toEqual(p(1, 2));
  });

  it('undoVertex 空顶点列表不抛异常', () => {
    const s = createPolylineSketcher();
    s.start();
    s.undoVertex(); // 不应抛异常
    expect(s.vertices).toHaveLength(0);
  });

  it('point sketcher 添加 1 个顶点后自动完成', () => {
    const s = createPointSketcher();
    s.start();
    s.addVertex(p(5, 10));
    expect(s.state.get().phase).toBe('finished');
    expect(s.vertices).toHaveLength(1);
  });

  it('rectangle sketcher 添加 2 个顶点后自动完成', () => {
    const s = createRectangleSketcher();
    s.start();
    s.addVertex(p(0, 0));
    s.addVertex(p(10, 10));
    expect(s.state.get().phase).toBe('finished');
    expect(s.vertices).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// 约束系统
// ---------------------------------------------------------------------------

describe('Sketcher 约束系统', () => {
  it('正交约束修正顶点坐标', () => {
    const s = createPolylineSketcher({
      constraints: [orthoConstraint()],
    });
    s.start();
    s.addVertex(p(0, 0));
    s.addVertex(p(5, 3)); // dx=5, dy=3, dx>dy → 锁定水平轴
    expect(s.vertices[1]!.x).toBe(5);
    expect(s.vertices[1]!.y).toBe(0); // 锁定到 y=0
  });

  it('长度锁定约束修正距离', () => {
    const s = createPolylineSketcher({
      constraints: [lengthLockConstraint()],
    });
    s.start();
    s.addVertex(p(0, 0));
    s.addVertex(p(3, 4)); // 距离=5
    // 没有 params.lengthLock，不修正
    expect(s.vertices[1]!.x).toBe(3);
    expect(s.vertices[1]!.y).toBe(4);
  });

  it('无约束时顶点保持原样', () => {
    const s = createPolylineSketcher();
    s.start();
    s.addVertex(p(0, 0));
    s.addVertex(p(3.14, 2.72));
    expect(s.vertices[1]).toEqual(p(3.14, 2.72));
  });
});

// ---------------------------------------------------------------------------
// 事件
// ---------------------------------------------------------------------------

describe('Sketcher 事件', () => {
  it('vertex-added 事件在 addVertex 时触发', () => {
    const s = createPolylineSketcher();
    const handler = vi.fn();
    s.on('vertex-added', handler);
    s.start();
    s.addVertex(p(1, 2));
    expect(handler).toHaveBeenCalledWith({
      vertex: p(1, 2),
      index: 0,
    });
  });

  it('completed 事件在 complete 时触发', () => {
    const s = createPolylineSketcher();
    const handler = vi.fn();
    s.on('completed', handler);
    s.start();
    s.addVertex(p(0, 0));
    s.addVertex(p(1, 1));
    s.complete();
    expect(handler).toHaveBeenCalledWith({
      vertices: [p(0, 0), p(1, 1)],
    });
  });

  it('cancelled 事件在 cancel 时触发', () => {
    const s = createPolylineSketcher();
    const handler = vi.fn();
    s.on('cancelled', handler);
    s.start();
    s.cancel();
    expect(handler).toHaveBeenCalledWith({});
  });

  it('off 取消订阅', () => {
    const s = createPolylineSketcher();
    const handler = vi.fn();
    s.on('vertex-added', handler);
    s.off('vertex-added', handler);
    s.start();
    s.addVertex(p(1, 2));
    expect(handler).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// dispose
// ---------------------------------------------------------------------------

describe('Sketcher dispose', () => {
  it('dispose 后 disposed 为 true', () => {
    const s = createPolylineSketcher();
    s.dispose();
    expect(s.disposed).toBe(true);
  });

  it('dispose 后操作抛异常', () => {
    const s = createPolylineSketcher();
    s.dispose();
    expect(() => s.start()).toThrow('disposed');
    expect(() => s.addVertex(p(0, 0))).toThrow('disposed');
    expect(() => s.complete()).toThrow('disposed');
    expect(() => s.cancel()).toThrow('disposed');
  });

  it('重复 dispose 不抛异常', () => {
    const s = createPolylineSketcher();
    s.dispose();
    s.dispose(); // 不应抛异常
  });
});
