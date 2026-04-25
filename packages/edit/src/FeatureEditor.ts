/**
 * @module @cgx/edit/FeatureEditor
 *
 * 要素编辑器实现。
 *
 * 基于 FSM 管理编辑状态，所有变更通过 @cgx/history Command 提交。
 * 支持顶点拖动、插入、删除、批量平移/旋转/缩放。
 */

import { signal, type Signal, type ReadonlySignal, type Off } from '@cgx/reactive';
import { TypedEmitter, defineFsm, composeConstraints, type Point2D, type Constraint, type FsmInstance } from '@cgx/core';
import type { History } from '@cgx/history';
import {
  createMoveVertexCommand,
  createAddVertexCommand,
  createRemoveVertexCommand,
  createBatchTransformCommand,
} from '@cgx/sketch';
import type {
  Editor,
  EditorState,
  EditorEvents,
  EditorOptions,
  EditableFeature,
  FeatureSnapshot,
} from './types';

// ---------------------------------------------------------------------------
// 内部类型
// ---------------------------------------------------------------------------

type EditFsmState = 'idle' | 'selecting' | 'dragging' | 'rotating' | 'scaling';
type EditFsmEvent = 'select' | 'startDrag' | 'endDrag' | 'rotate' | 'scale' | 'reset';

// ---------------------------------------------------------------------------
// 几何工具
// ---------------------------------------------------------------------------

/** 平移所有顶点 */
function translateVertices(
  vertices: Point2D[],
  dx: number,
  dy: number
): Point2D[] {
  return vertices.map((v) => ({ x: v.x + dx, y: v.y + dy }));
}

/** 绕中心点旋转所有顶点 */
function rotateVertices(
  vertices: Point2D[],
  angle: number,
  center: Point2D
): Point2D[] {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return vertices.map((v) => {
    const dx = v.x - center.x;
    const dy = v.y - center.y;
    return {
      x: center.x + dx * cos - dy * sin,
      y: center.y + dx * sin + dy * cos,
    };
  });
}

/** 绕中心点缩放所有顶点 */
function scaleVertices(
  vertices: Point2D[],
  factor: number,
  center: Point2D
): Point2D[] {
  return vertices.map((v) => ({
    x: center.x + (v.x - center.x) * factor,
    y: center.y + (v.y - center.y) * factor,
  }));
}

/** 计算顶点列表的中心点 */
function centroid(vertices: ReadonlyArray<Point2D>): Point2D {
  if (vertices.length === 0) return { x: 0, y: 0 };
  let sumX = 0;
  let sumY = 0;
  for (const v of vertices) {
    sumX += v.x;
    sumY += v.y;
  }
  return { x: sumX / vertices.length, y: sumY / vertices.length };
}

/** 创建要素快照 */
function snapshotFeature(feature: EditableFeature): FeatureSnapshot {
  return {
    featureId: feature.id,
    vertices: [...feature.vertices],
  };
}

// ---------------------------------------------------------------------------
// FeatureEditor 实现
// ---------------------------------------------------------------------------

/**
 * 要素编辑器。
 *
 * @internal 通过 `createFeatureEditor()` 工厂创建。
 */
class FeatureEditorImpl implements Editor {
  private readonly _state: Signal<EditorState>;
  private readonly _selection: string[] = [];
  private readonly _history: History;
  private readonly _features: Map<string, EditableFeature>;
  private readonly _constraints: ReadonlyArray<Constraint>;
  private readonly emitter = new TypedEmitter<EditorEvents>();
  private readonly fsm: FsmInstance<EditFsmState, EditFsmEvent>;
  private _disposed = false;

  // 拖动状态
  private _dragFeatureId: string | null = null;
  private _dragVertexIndex: number = -1;
  private _dragBefore: Point2D | null = null;

  constructor(opts: EditorOptions) {
    this._history = opts.history;
    this._features = new Map(opts.features.map((f) => [f.id, f]));
    this._constraints = opts.constraints ?? [];
    this._state = signal<EditorState>({ phase: 'idle' });

    this.fsm = defineFsm<EditFsmState, EditFsmEvent, FeatureEditorImpl>({
      id: 'feature-editor',
      initial: 'idle',
      states: ['idle', 'selecting', 'dragging', 'rotating', 'scaling'],
      transitions: [
        { from: 'idle', to: 'selecting', event: 'select' },
        { from: 'selecting', to: 'dragging', event: 'startDrag' },
        { from: 'dragging', to: 'selecting', event: 'endDrag' },
        { from: 'selecting', to: 'rotating', event: 'rotate' },
        { from: 'selecting', to: 'scaling', event: 'scale' },
        { from: 'rotating', to: 'selecting', event: 'endDrag' },
        { from: 'scaling', to: 'selecting', event: 'endDrag' },
        { from: 'selecting', to: 'idle', event: 'reset' },
        { from: 'dragging', to: 'idle', event: 'reset' },
        { from: 'rotating', to: 'idle', event: 'reset' },
        { from: 'scaling', to: 'idle', event: 'reset' },
      ],
      context: this,
    });
  }

  // -------------------------------------------------------------------------
  // 公开属性
  // -------------------------------------------------------------------------

  get state(): ReadonlySignal<EditorState> {
    return this._state as unknown as ReadonlySignal<EditorState>;
  }

  get selection(): ReadonlyArray<string> {
    return this._selection;
  }

  get history(): History {
    return this._history;
  }

  get disposed(): boolean {
    return this._disposed;
  }

  // -------------------------------------------------------------------------
  // 选择
  // -------------------------------------------------------------------------

  select(featureIds: string | string[]): void {
    this.assertNotDisposed();
    const ids = Array.isArray(featureIds) ? featureIds : [featureIds];
    this._selection.length = 0;
    for (const id of ids) {
      if (this._features.has(id)) {
        this._selection.push(id);
      }
    }
    this.fsm.send('select');
    this._state.set({ phase: 'selecting' });
    this.emitter.emit('selection-changed', { selected: [...this._selection] });
  }

  unselectAll(): void {
    this.assertNotDisposed();
    this._selection.length = 0;
    this.fsm.send('reset');
    this._state.set({ phase: 'idle' });
    this.emitter.emit('selection-changed', { selected: [] });
  }

  // -------------------------------------------------------------------------
  // 顶点拖动
  // -------------------------------------------------------------------------

  startDrag(featureId: string, vertexIndex: number): void {
    this.assertNotDisposed();
    const feature = this._features.get(featureId);
    if (!feature) return;
    if (vertexIndex < 0 || vertexIndex >= feature.vertices.length) return;

    this._dragFeatureId = featureId;
    this._dragVertexIndex = vertexIndex;
    this._dragBefore = { ...feature.vertices[vertexIndex]! };

    this.fsm.send('startDrag');
    this._state.set({ phase: 'dragging', vertexIndex });
  }

  updateDrag(raw: Point2D): void {
    this.assertNotDisposed();
    if (this._dragFeatureId === null) return;

    const feature = this._features.get(this._dragFeatureId);
    if (!feature) return;

    // 应用约束
    const constrained = this.applyConstraints(raw, feature.vertices);
    feature.vertices[this._dragVertexIndex] = constrained;
  }

  async endDrag(): Promise<void> {
    this.assertNotDisposed();
    if (this._dragFeatureId === null) return;

    const feature = this._features.get(this._dragFeatureId);
    if (!feature) return;

    const after = { ...feature.vertices[this._dragVertexIndex]! };
    const before = this._dragBefore!;

    // 只有位置真正改变时才提交 Command
    if (before.x !== after.x || before.y !== after.y) {
      const cmd = createMoveVertexCommand(
        feature.vertices,
        this._dragVertexIndex,
        before,
        after,
        this._dragFeatureId
      );
      await this._history.execute(cmd);

      this.emitter.emit('vertex-dragged', {
        before: { featureId: this._dragFeatureId, vertices: [before] },
        after: { featureId: this._dragFeatureId, vertices: [after] },
        diff: [`vertices[${this._dragVertexIndex}]`],
      });
    }

    this._dragFeatureId = null;
    this._dragVertexIndex = -1;
    this._dragBefore = null;

    this.fsm.send('endDrag');
    this._state.set({ phase: 'selecting' });
  }

  // -------------------------------------------------------------------------
  // 顶点插入/删除
  // -------------------------------------------------------------------------

  async insertVertex(featureId: string, afterIndex: number, vertex: Point2D): Promise<void> {
    this.assertNotDisposed();
    const feature = this._features.get(featureId);
    if (!feature) return;

    const insertIndex = afterIndex + 1;
    const cmd = createAddVertexCommand(feature.vertices, vertex, featureId, insertIndex);
    await this._history.execute(cmd);

    this.emitter.emit('vertex-inserted', {
      before: snapshotFeature(feature),
      after: { featureId, vertices: [...feature.vertices] },
      diff: [`vertices[${insertIndex}]`],
    });
  }

  async deleteVertex(featureId: string, vertexIndex: number): Promise<void> {
    this.assertNotDisposed();
    const feature = this._features.get(featureId);
    if (!feature) return;
    if (vertexIndex < 0 || vertexIndex >= feature.vertices.length) return;

    const beforeSnap = snapshotFeature(feature);
    const cmd = createRemoveVertexCommand(feature.vertices, vertexIndex, featureId);
    await this._history.execute(cmd);

    this.emitter.emit('vertex-deleted', {
      before: beforeSnap,
      after: { featureId, vertices: [...feature.vertices] },
      diff: [`vertices[${vertexIndex}]`],
    });
  }

  // -------------------------------------------------------------------------
  // 批量变换
  // -------------------------------------------------------------------------

  async translate(dx: number, dy: number): Promise<void> {
    this.assertNotDisposed();
    for (const id of this._selection) {
      const feature = this._features.get(id);
      if (!feature) continue;

      const before = [...feature.vertices];
      const after = translateVertices(feature.vertices, dx, dy);
      const cmd = createBatchTransformCommand(
        feature.vertices,
        'translate',
        { dx, dy },
        before,
        after,
        id
      );
      await this._history.execute(cmd);

      this.emitter.emit('batch-transformed', {
        before: { featureId: id, vertices: before },
        after: { featureId: id, vertices: after },
        diff: ['vertices'],
      });
    }
  }

  async rotate(angle: number, center?: Point2D): Promise<void> {
    this.assertNotDisposed();
    for (const id of this._selection) {
      const feature = this._features.get(id);
      if (!feature) continue;

      const c = center ?? centroid(feature.vertices);
      const before = [...feature.vertices];
      const after = rotateVertices(feature.vertices, angle, c);
      const cmd = createBatchTransformCommand(
        feature.vertices,
        'rotate',
        { angle, cx: c.x, cy: c.y },
        before,
        after,
        id
      );
      await this._history.execute(cmd);

      this.emitter.emit('batch-transformed', {
        before: { featureId: id, vertices: before },
        after: { featureId: id, vertices: after },
        diff: ['vertices'],
      });
    }
  }

  async scale(factor: number, center?: Point2D): Promise<void> {
    this.assertNotDisposed();
    for (const id of this._selection) {
      const feature = this._features.get(id);
      if (!feature) continue;

      const c = center ?? centroid(feature.vertices);
      const before = [...feature.vertices];
      const after = scaleVertices(feature.vertices, factor, c);
      const cmd = createBatchTransformCommand(
        feature.vertices,
        'scale',
        { factor, cx: c.x, cy: c.y },
        before,
        after,
        id
      );
      await this._history.execute(cmd);

      this.emitter.emit('batch-transformed', {
        before: { featureId: id, vertices: before },
        after: { featureId: id, vertices: after },
        diff: ['vertices'],
      });
    }
  }

  // -------------------------------------------------------------------------
  // Undo/Redo
  // -------------------------------------------------------------------------

  async undo(): Promise<void> {
    this.assertNotDisposed();
    await this._history.undo();
  }

  async redo(): Promise<void> {
    this.assertNotDisposed();
    await this._history.redo();
  }

  // -------------------------------------------------------------------------
  // 事件
  // -------------------------------------------------------------------------

  on<K extends keyof EditorEvents>(
    event: K,
    handler: (payload: EditorEvents[K]) => void
  ): Off {
    return this.emitter.on(event, handler);
  }

  off<K extends keyof EditorEvents>(
    event: K,
    handler?: (payload: EditorEvents[K]) => void
  ): void {
    this.emitter.off(event, handler);
  }

  // -------------------------------------------------------------------------
  // 生命周期
  // -------------------------------------------------------------------------

  dispose(): void {
    if (this._disposed) return;
    this._disposed = true;
    this._selection.length = 0;
    this._features.clear();
    this.fsm.dispose();
  }

  // -------------------------------------------------------------------------
  // 内部方法
  // -------------------------------------------------------------------------

  private assertNotDisposed(): void {
    if (this._disposed) {
      throw new Error('Editor has been disposed');
    }
  }

  private applyConstraints(raw: Point2D, vertices: Point2D[]): Point2D {
    if (this._constraints.length === 0) return raw;
    const composed = composeConstraints(this._constraints);
    return composed(raw, { vertices });
  }
}

// ---------------------------------------------------------------------------
// 工厂函数
// ---------------------------------------------------------------------------

/**
 * 创建一个要素编辑器。
 *
 * @param opts - 编辑器配置
 * @returns Editor 实例
 *
 * @example
 * ```ts
 * import { createHistory } from '@cgx/history';
 * import { createFeatureEditor } from '@cgx/edit';
 *
 * const history = createHistory({ data: null });
 * const editor = createFeatureEditor({
 *   history,
 *   features: [{ id: 'f1', kind: 'polygon', vertices: [...] }],
 * });
 *
 * editor.select('f1');
 * editor.startDrag('f1', 0);
 * editor.updateDrag({ x: 10, y: 20 });
 * await editor.endDrag();
 *
 * await editor.undo(); // 撤销拖动
 * ```
 */
export function createFeatureEditor(opts: EditorOptions): Editor {
  return new FeatureEditorImpl(opts);
}
