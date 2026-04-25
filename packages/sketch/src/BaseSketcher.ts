/**
 * @module @cgx/sketch/BaseSketcher
 *
 * Sketcher 基础实现（内部使用，不导出）。
 *
 * 通过 FSM 管理状态，通过约束系统修正顶点，
 * 通过 TypedEmitter 派发事件。
 */

import { signal, type Signal, type ReadonlySignal, type Off } from '@cgx/reactive';
import { TypedEmitter, defineFsm, composeConstraints, type Point2D, type Constraint, type FsmInstance } from '@cgx/core';
import type { Sketcher, SketcherState, SketcherEvents, SketcherOptions } from './types';

// ---------------------------------------------------------------------------
// 内部类型
// ---------------------------------------------------------------------------

type SketchFsmState = 'idle' | 'drawing' | 'finished' | 'cancelled';
type SketchFsmEvent = 'start' | 'addVertex' | 'complete' | 'cancel' | 'reset';

// ---------------------------------------------------------------------------
// BaseSketcher 实现
// ---------------------------------------------------------------------------

/**
 * 标绘工具基础实现。
 *
 * @internal 不对外导出，由各具体 Sketcher 工厂函数内部使用。
 */
export class BaseSketcher implements Sketcher {
  readonly kind: string;
  private readonly fsm: FsmInstance<SketchFsmState, SketchFsmEvent>;
  private readonly _vertices: Point2D[] = [];
  private readonly _constraints: ReadonlyArray<Constraint>;
  private readonly _minVertices: number;
  private readonly _maxVertices: number;
  private readonly emitter = new TypedEmitter<SketcherEvents>();
  private readonly _state: Signal<SketcherState>;
  private _disposed = false;

  constructor(kind: string, opts?: SketcherOptions) {
    this.kind = kind;
    this._constraints = opts?.constraints ?? [];
    this._minVertices = opts?.minVertices ?? 1;
    this._maxVertices = opts?.maxVertices ?? Infinity;
    this._state = signal<SketcherState>({ phase: 'idle' });

    this.fsm = defineFsm<SketchFsmState, SketchFsmEvent, BaseSketcher>({
      id: `sketch-${kind}`,
      initial: 'idle',
      states: ['idle', 'drawing', 'finished', 'cancelled'],
      transitions: [
        { from: 'idle', to: 'drawing', event: 'start' },
        { from: 'drawing', to: 'drawing', event: 'addVertex' },
        { from: 'drawing', to: 'finished', event: 'complete' },
        { from: 'drawing', to: 'cancelled', event: 'cancel' },
        { from: 'finished', to: 'idle', event: 'reset' },
        { from: 'cancelled', to: 'idle', event: 'reset' },
      ],
      context: this,
    });
  }

  // -------------------------------------------------------------------------
  // 公开属性
  // -------------------------------------------------------------------------

  get state(): ReadonlySignal<SketcherState> {
    return this._state as unknown as ReadonlySignal<SketcherState>;
  }

  get vertices(): ReadonlyArray<Point2D> {
    return this._vertices;
  }

  get constraints(): ReadonlyArray<Constraint> {
    return this._constraints;
  }

  get disposed(): boolean {
    return this._disposed;
  }

  // -------------------------------------------------------------------------
  // 操作
  // -------------------------------------------------------------------------

  start(): void {
    this.assertNotDisposed();
    if (this.fsm.send('start')) {
      this._vertices.length = 0;
      this._state.set({ phase: 'drawing', vertexCount: 0 });
    }
  }

  addVertex(raw: Point2D): void {
    this.assertNotDisposed();
    if (this.fsm.state.get() !== 'drawing') return;

    // 应用约束
    const constrained = this.applyConstraints(raw);
    this._vertices.push(constrained);

    this._state.set({ phase: 'drawing', vertexCount: this._vertices.length });
    this.emitter.emit('vertex-added', {
      vertex: constrained,
      index: this._vertices.length - 1,
    });

    // 达到最大顶点数时自动完成
    if (this._vertices.length >= this._maxVertices) {
      this.complete();
    }
  }

  complete(): ReadonlyArray<Point2D> {
    this.assertNotDisposed();

    if (this._vertices.length < this._minVertices) {
      return [];
    }

    if (this.fsm.send('complete')) {
      const result = [...this._vertices];
      this._state.set({ phase: 'finished' });
      this.emitter.emit('completed', { vertices: result });
      return result;
    }

    return [];
  }

  cancel(): void {
    this.assertNotDisposed();
    if (this.fsm.send('cancel')) {
      this._vertices.length = 0;
      this._state.set({ phase: 'cancelled' });
      this.emitter.emit('cancelled', {});
    }
  }

  undoVertex(): void {
    this.assertNotDisposed();
    if (this.fsm.state.get() !== 'drawing') return;
    if (this._vertices.length === 0) return;

    this._vertices.pop();
    this._state.set({ phase: 'drawing', vertexCount: this._vertices.length });
  }

  // -------------------------------------------------------------------------
  // 事件
  // -------------------------------------------------------------------------

  on<K extends keyof SketcherEvents>(
    event: K,
    handler: (payload: SketcherEvents[K]) => void
  ): Off {
    return this.emitter.on(event, handler);
  }

  off<K extends keyof SketcherEvents>(
    event: K,
    handler?: (payload: SketcherEvents[K]) => void
  ): void {
    this.emitter.off(event, handler);
  }

  // -------------------------------------------------------------------------
  // 生命周期
  // -------------------------------------------------------------------------

  dispose(): void {
    if (this._disposed) return;
    this._disposed = true;
    this._vertices.length = 0;
    this.fsm.dispose();
  }

  // -------------------------------------------------------------------------
  // 内部方法
  // -------------------------------------------------------------------------

  private assertNotDisposed(): void {
    if (this._disposed) {
      throw new Error(`Sketcher "${this.kind}" has been disposed`);
    }
  }

  private applyConstraints(raw: Point2D): Point2D {
    if (this._constraints.length === 0) return raw;

    const composed = composeConstraints(this._constraints);
    return composed(raw, {
      vertices: this._vertices,
      shapeKind: this.kind,
    });
  }
}
