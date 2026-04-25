/**
 * @cgx/edit 单元测试
 *
 * 覆盖：
 * - createFeatureEditor 工厂创建
 * - 选择/取消选择
 * - 顶点拖动（startDrag/updateDrag/endDrag）
 * - 顶点插入/删除
 * - 批量变换（translate/rotate/scale）
 * - undo/redo 通过 history 回滚
 * - diff 事件
 * - dispose 销毁
 */

import { describe, it, expect, vi } from 'vitest';
import { createHistory } from '@cgx/history';
import { createFeatureEditor } from '../src/FeatureEditor';
import type { EditableFeature } from '../src/types';
import type { Point2D } from '@cgx/core';

// ---------------------------------------------------------------------------
// 辅助
// ---------------------------------------------------------------------------

function p(x: number, y: number): Point2D {
  return { x, y };
}

function makeFeature(id: string, vertices: Point2D[]): EditableFeature {
  return { id, kind: 'polygon', vertices };
}

// ---------------------------------------------------------------------------
// 工厂创建
// ---------------------------------------------------------------------------

describe('createFeatureEditor', () => {
  it('创建编辑器实例', () => {
    const history = createHistory({ data: null });
    const editor = createFeatureEditor({
      history,
      features: [makeFeature('f1', [p(0, 0), p(1, 1)])],
    });
    expect(editor.state.get().phase).toBe('idle');
    expect(editor.selection).toHaveLength(0);
    expect(editor.disposed).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 选择
// ---------------------------------------------------------------------------

describe('Editor 选择', () => {
  it('select 选中要素', () => {
    const history = createHistory({ data: null });
    const editor = createFeatureEditor({
      history,
      features: [makeFeature('f1', [p(0, 0)]), makeFeature('f2', [p(1, 1)])],
    });
    editor.select('f1');
    expect(editor.selection).toEqual(['f1']);
    expect(editor.state.get().phase).toBe('selecting');
  });

  it('select 批量选中', () => {
    const history = createHistory({ data: null });
    const editor = createFeatureEditor({
      history,
      features: [makeFeature('f1', [p(0, 0)]), makeFeature('f2', [p(1, 1)])],
    });
    editor.select(['f1', 'f2']);
    expect(editor.selection).toEqual(['f1', 'f2']);
  });

  it('select 忽略不存在的 ID', () => {
    const history = createHistory({ data: null });
    const editor = createFeatureEditor({
      history,
      features: [makeFeature('f1', [p(0, 0)])],
    });
    editor.select(['f1', 'nonexistent']);
    expect(editor.selection).toEqual(['f1']);
  });

  it('unselectAll 取消所有选中', () => {
    const history = createHistory({ data: null });
    const editor = createFeatureEditor({
      history,
      features: [makeFeature('f1', [p(0, 0)])],
    });
    editor.select('f1');
    editor.unselectAll();
    expect(editor.selection).toHaveLength(0);
    expect(editor.state.get().phase).toBe('idle');
  });

  it('selection-changed 事件', () => {
    const history = createHistory({ data: null });
    const editor = createFeatureEditor({
      history,
      features: [makeFeature('f1', [p(0, 0)])],
    });
    const handler = vi.fn();
    editor.on('selection-changed', handler);
    editor.select('f1');
    expect(handler).toHaveBeenCalledWith({ selected: ['f1'] });
  });
});

// ---------------------------------------------------------------------------
// 顶点拖动
// ---------------------------------------------------------------------------

describe('Editor 顶点拖动', () => {
  it('拖动顶点改变坐标', async () => {
    const vertices = [p(0, 0), p(10, 10)];
    const history = createHistory({ data: null });
    const editor = createFeatureEditor({
      history,
      features: [makeFeature('f1', vertices)],
    });

    editor.startDrag('f1', 0);
    expect(editor.state.get().phase).toBe('dragging');

    editor.updateDrag(p(5, 5));
    expect(vertices[0]).toEqual(p(5, 5));

    await editor.endDrag();
    expect(editor.state.get().phase).toBe('selecting');
  });

  it('拖动后可通过 undo 回滚', async () => {
    const vertices = [p(0, 0), p(10, 10)];
    const history = createHistory({ data: null });
    const editor = createFeatureEditor({
      history,
      features: [makeFeature('f1', vertices)],
    });

    editor.startDrag('f1', 0);
    editor.updateDrag(p(5, 5));
    await editor.endDrag();

    expect(vertices[0]).toEqual(p(5, 5));
    expect(history.undoDepth).toBe(1);

    await editor.undo();
    expect(vertices[0]).toEqual(p(0, 0));
  });

  it('拖动后可通过 redo 重现', async () => {
    const vertices = [p(0, 0), p(10, 10)];
    const history = createHistory({ data: null });
    const editor = createFeatureEditor({
      history,
      features: [makeFeature('f1', vertices)],
    });

    editor.startDrag('f1', 0);
    editor.updateDrag(p(5, 5));
    await editor.endDrag();

    await editor.undo();
    expect(vertices[0]).toEqual(p(0, 0));

    await editor.redo();
    expect(vertices[0]).toEqual(p(5, 5));
  });

  it('位置未改变时不提交 Command', async () => {
    const vertices = [p(0, 0)];
    const history = createHistory({ data: null });
    const editor = createFeatureEditor({
      history,
      features: [makeFeature('f1', vertices)],
    });

    editor.startDrag('f1', 0);
    editor.updateDrag(p(0, 0)); // 位置不变
    await editor.endDrag();

    expect(history.undoDepth).toBe(0);
  });

  it('vertex-dragged 事件', async () => {
    const vertices = [p(0, 0)];
    const history = createHistory({ data: null });
    const editor = createFeatureEditor({
      history,
      features: [makeFeature('f1', vertices)],
    });
    const handler = vi.fn();
    editor.on('vertex-dragged', handler);

    editor.startDrag('f1', 0);
    editor.updateDrag(p(5, 5));
    await editor.endDrag();

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0]![0].before.vertices[0]).toEqual(p(0, 0));
    expect(handler.mock.calls[0]![0].after.vertices[0]).toEqual(p(5, 5));
  });

  it('startDrag 无效索引不操作', () => {
    const vertices = [p(0, 0)];
    const history = createHistory({ data: null });
    const editor = createFeatureEditor({
      history,
      features: [makeFeature('f1', vertices)],
    });

    editor.startDrag('f1', -1);
    expect(editor.state.get().phase).toBe('idle');

    editor.startDrag('f1', 99);
    expect(editor.state.get().phase).toBe('idle');
  });

  it('startDrag 无效要素 ID 不操作', () => {
    const history = createHistory({ data: null });
    const editor = createFeatureEditor({
      history,
      features: [makeFeature('f1', [p(0, 0)])],
    });

    editor.startDrag('nonexistent', 0);
    expect(editor.state.get().phase).toBe('idle');
  });
});

// ---------------------------------------------------------------------------
// 顶点插入/删除
// ---------------------------------------------------------------------------

describe('Editor 顶点插入/删除', () => {
  it('insertVertex 在指定位置后插入顶点', async () => {
    const vertices = [p(0, 0), p(10, 10)];
    const history = createHistory({ data: null });
    const editor = createFeatureEditor({
      history,
      features: [makeFeature('f1', vertices)],
    });

    await editor.insertVertex('f1', 0, p(5, 5));
    expect(vertices).toHaveLength(3);
    expect(vertices[1]).toEqual(p(5, 5));
  });

  it('insertVertex 后可通过 undo 回滚', async () => {
    const vertices = [p(0, 0), p(10, 10)];
    const history = createHistory({ data: null });
    const editor = createFeatureEditor({
      history,
      features: [makeFeature('f1', vertices)],
    });

    await editor.insertVertex('f1', 0, p(5, 5));
    expect(vertices).toHaveLength(3);

    await editor.undo();
    expect(vertices).toHaveLength(2);
  });

  it('deleteVertex 删除指定顶点', async () => {
    const vertices = [p(0, 0), p(5, 5), p(10, 10)];
    const history = createHistory({ data: null });
    const editor = createFeatureEditor({
      history,
      features: [makeFeature('f1', vertices)],
    });

    await editor.deleteVertex('f1', 1);
    expect(vertices).toHaveLength(2);
    expect(vertices[0]).toEqual(p(0, 0));
    expect(vertices[1]).toEqual(p(10, 10));
  });

  it('deleteVertex 后可通过 undo 回滚', async () => {
    const vertices = [p(0, 0), p(5, 5), p(10, 10)];
    const history = createHistory({ data: null });
    const editor = createFeatureEditor({
      history,
      features: [makeFeature('f1', vertices)],
    });

    await editor.deleteVertex('f1', 1);
    expect(vertices).toHaveLength(2);

    await editor.undo();
    expect(vertices).toHaveLength(3);
    expect(vertices[1]).toEqual(p(5, 5));
  });
});

// ---------------------------------------------------------------------------
// 批量变换
// ---------------------------------------------------------------------------

describe('Editor 批量变换', () => {
  it('translate 平移所有选中要素', async () => {
    const vertices = [p(0, 0), p(10, 10)];
    const history = createHistory({ data: null });
    const editor = createFeatureEditor({
      history,
      features: [makeFeature('f1', vertices)],
    });

    editor.select('f1');
    await editor.translate(5, 3);

    expect(vertices[0]).toEqual(p(5, 3));
    expect(vertices[1]).toEqual(p(15, 13));
  });

  it('translate 后可通过 undo 回滚', async () => {
    const vertices = [p(0, 0), p(10, 10)];
    const history = createHistory({ data: null });
    const editor = createFeatureEditor({
      history,
      features: [makeFeature('f1', vertices)],
    });

    editor.select('f1');
    await editor.translate(5, 3);

    await editor.undo();
    expect(vertices[0]).toEqual(p(0, 0));
    expect(vertices[1]).toEqual(p(10, 10));
  });

  it('rotate 旋转选中要素', async () => {
    const vertices = [p(1, 0), p(0, 1)];
    const history = createHistory({ data: null });
    const editor = createFeatureEditor({
      history,
      features: [makeFeature('f1', vertices)],
    });

    editor.select('f1');
    await editor.rotate(Math.PI / 2, p(0, 0)); // 90°

    // (1,0) → (0,1), (0,1) → (-1,0)
    expect(vertices[0]!.x).toBeCloseTo(0);
    expect(vertices[0]!.y).toBeCloseTo(1);
    expect(vertices[1]!.x).toBeCloseTo(-1);
    expect(vertices[1]!.y).toBeCloseTo(0);
  });

  it('scale 缩放选中要素', async () => {
    const vertices = [p(2, 4)];
    const history = createHistory({ data: null });
    const editor = createFeatureEditor({
      history,
      features: [makeFeature('f1', vertices)],
    });

    editor.select('f1');
    await editor.scale(2, p(0, 0));

    expect(vertices[0]).toEqual(p(4, 8));
  });

  it('batch-transformed 事件', async () => {
    const vertices = [p(0, 0)];
    const history = createHistory({ data: null });
    const editor = createFeatureEditor({
      history,
      features: [makeFeature('f1', vertices)],
    });
    const handler = vi.fn();
    editor.on('batch-transformed', handler);

    editor.select('f1');
    await editor.translate(1, 2);

    expect(handler).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// dispose
// ---------------------------------------------------------------------------

describe('Editor dispose', () => {
  it('dispose 后 disposed 为 true', () => {
    const history = createHistory({ data: null });
    const editor = createFeatureEditor({
      history,
      features: [makeFeature('f1', [p(0, 0)])],
    });
    editor.dispose();
    expect(editor.disposed).toBe(true);
  });

  it('dispose 后操作抛异常', () => {
    const history = createHistory({ data: null });
    const editor = createFeatureEditor({
      history,
      features: [makeFeature('f1', [p(0, 0)])],
    });
    editor.dispose();

    expect(() => editor.select('f1')).toThrow('disposed');
    expect(() => editor.startDrag('f1', 0)).toThrow('disposed');
  });

  it('重复 dispose 不抛异常', () => {
    const history = createHistory({ data: null });
    const editor = createFeatureEditor({
      history,
      features: [makeFeature('f1', [p(0, 0)])],
    });
    editor.dispose();
    editor.dispose();
  });
});
