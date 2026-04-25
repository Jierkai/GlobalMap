/**
 * @module @cgx/sketch/types
 *
 * Sketch 工具类型定义。
 *
 * 设计原则：
 * - 每个 Sketcher 是一个 FSM 实例（idle → drawing → finished）
 * - 产出纯数据顶点，通过 @cgx/history Command 提交
 * - 零 Cesium 依赖
 */

import type { ReadonlySignal, Off } from '@cgx/reactive';
import type { Point2D, Constraint } from '@cgx/core';

// ---------------------------------------------------------------------------
// Sketcher 状态
// ---------------------------------------------------------------------------

/** Sketcher 状态联合类型 */
export type SketcherState =
  | { readonly phase: 'idle' }
  | { readonly phase: 'drawing'; readonly vertexCount: number }
  | { readonly phase: 'finished' }
  | { readonly phase: 'cancelled' };

// ---------------------------------------------------------------------------
// Sketcher 事件
// ---------------------------------------------------------------------------

/** Sketcher 事件载荷 */
export interface SketcherEvents {
  /** 添加了一个顶点 */
  'vertex-added': { readonly vertex: Point2D; readonly index: number };
  /** 绘制完成 */
  'completed': { readonly vertices: ReadonlyArray<Point2D> };
  /** 绘制取消 */
  'cancelled': Record<string, never>;
}

// ---------------------------------------------------------------------------
// Sketcher 接口
// ---------------------------------------------------------------------------

/**
 * 标绘工具接口。
 *
 * 每个 Sketcher 是一个 FSM 实例，生命周期：
 * `idle → drawing → finished | cancelled`
 */
export interface Sketcher {
  /** Sketcher 类型标识 */
  readonly kind: string;
  /** 当前状态（响应式 Signal） */
  readonly state: ReadonlySignal<SketcherState>;
  /** 当前顶点列表 */
  readonly vertices: ReadonlyArray<Point2D>;
  /** 约束列表（响应式） */
  readonly constraints: ReadonlyArray<Constraint>;

  /** 开始绘制 */
  start(): void;
  /** 添加顶点（应用约束后） */
  addVertex(raw: Point2D): void;
  /** 完成绘制，返回最终顶点列表 */
  complete(): ReadonlyArray<Point2D>;
  /** 取消绘制 */
  cancel(): void;
  /** 撤销最后一个顶点 */
  undoVertex(): void;

  /** 订阅事件 */
  on<K extends keyof SketcherEvents>(
    event: K,
    handler: (payload: SketcherEvents[K]) => void
  ): Off;
  /** 取消订阅 */
  off<K extends keyof SketcherEvents>(
    event: K,
    handler?: (payload: SketcherEvents[K]) => void
  ): void;

  /** 销毁 */
  dispose(): void;
  /** 是否已销毁 */
  readonly disposed: boolean;
}

// ---------------------------------------------------------------------------
// Sketcher 配置
// ---------------------------------------------------------------------------

/** Sketcher 创建选项 */
export interface SketcherOptions {
  /** 约束列表 */
  readonly constraints?: ReadonlyArray<Constraint>;
  /** 最小顶点数（完成时校验） */
  readonly minVertices?: number;
  /** 最大顶点数（达到后自动完成） */
  readonly maxVertices?: number;
}

// ---------------------------------------------------------------------------
// Feature 数据（纯数据，非 Cesium Entity）
// ---------------------------------------------------------------------------

/** 标绘产出的要素数据 */
export interface SketchFeatureData {
  /** 要素类型 */
  readonly kind: string;
  /** 顶点列表 */
  readonly vertices: ReadonlyArray<Point2D>;
  /** 附加属性 */
  readonly properties?: Record<string, unknown>;
}
