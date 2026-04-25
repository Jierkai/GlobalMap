/**
 * @module @cgx/sketch/commands
 *
 * Sketch 相关的 Command 定义。
 *
 * 所有用户操作以 Command 形式进入 @cgx/history，
 * 支持完整的 undo/redo。
 */

import type { Command } from '@cgx/history';
import type { Point2D } from '@cgx/core';

// ---------------------------------------------------------------------------
// AddVertex Command
// ---------------------------------------------------------------------------

/** AddVertex 命令载荷 */
export interface AddVertexPayload {
  /** 顶点坐标 */
  readonly vertex: Point2D;
  /** 顶点索引 */
  readonly index: number;
  /** 目标要素 ID */
  readonly featureId: string;
}

/**
 * 创建一个"添加顶点"命令。
 *
 * @param vertices - 可变顶点数组引用
 * @param vertex - 要添加的顶点
 * @param featureId - 目标要素 ID
 */
export function createAddVertexCommand(
  vertices: Point2D[],
  vertex: Point2D,
  featureId: string,
  insertIndex?: number
): Command<AddVertexPayload> {
  const index = insertIndex ?? vertices.length;
  return {
    id: `add-vertex-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    kind: 'sketch.addVertex',
    payload: { vertex, index, featureId },
    apply() {
      vertices.splice(index, 0, vertex);
    },
    revert() {
      vertices.splice(index, 1);
    },
  };
}

// ---------------------------------------------------------------------------
// RemoveVertex Command
// ---------------------------------------------------------------------------

/** RemoveVertex 命令载荷 */
export interface RemoveVertexPayload {
  /** 被移除的顶点坐标 */
  readonly vertex: Point2D;
  /** 顶点索引 */
  readonly index: number;
  /** 目标要素 ID */
  readonly featureId: string;
}

/**
 * 创建一个"移除顶点"命令。
 */
export function createRemoveVertexCommand(
  vertices: Point2D[],
  index: number,
  featureId: string
): Command<RemoveVertexPayload> {
  const vertex = vertices[index]!;
  return {
    id: `remove-vertex-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    kind: 'sketch.removeVertex',
    payload: { vertex, index, featureId },
    apply() {
      vertices.splice(index, 1);
    },
    revert() {
      vertices.splice(index, 0, vertex);
    },
  };
}

// ---------------------------------------------------------------------------
// MoveVertex Command
// ---------------------------------------------------------------------------

/** MoveVertex 命令载荷 */
export interface MoveVertexPayload {
  /** 顶点索引 */
  readonly index: number;
  /** 移动前坐标 */
  readonly before: Point2D;
  /** 移动后坐标 */
  readonly after: Point2D;
  /** 目标要素 ID */
  readonly featureId: string;
}

/**
 * 创建一个"移动顶点"命令。
 *
 * 支持 coalesceWith：连续拖拽合并为最终位置。
 */
export function createMoveVertexCommand(
  vertices: Point2D[],
  index: number,
  before: Point2D,
  after: Point2D,
  featureId: string
): Command<MoveVertexPayload> {
  return {
    id: `move-vertex-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    kind: 'edit.moveVertex',
    payload: { index, before, after, featureId },
    apply() {
      vertices[index] = after;
    },
    revert() {
      vertices[index] = before;
    },
    coalesceWith(next: Command<MoveVertexPayload>) {
      if (next.kind !== this.kind) return null;
      const nextPayload = next.payload as MoveVertexPayload;
      if (nextPayload.index !== this.payload.index) return null;
      if (nextPayload.featureId !== this.payload.featureId) return null;
      // 合并：保留最初的 before，使用最新的 after
      return createMoveVertexCommand(
        vertices,
        this.payload.index,
        this.payload.before,
        nextPayload.after,
        this.payload.featureId
      );
    },
  };
}

// ---------------------------------------------------------------------------
// BatchTransform Command
// ---------------------------------------------------------------------------

/** 变换类型 */
export type TransformKind = 'translate' | 'rotate' | 'scale';

/** BatchTransform 命令载荷 */
export interface BatchTransformPayload {
  /** 变换类型 */
  readonly transform: TransformKind;
  /** 变换参数 */
  readonly params: Record<string, number>;
  /** 变换前所有顶点快照 */
  readonly before: ReadonlyArray<Point2D>;
  /** 变换后所有顶点快照 */
  readonly after: ReadonlyArray<Point2D>;
  /** 目标要素 ID */
  readonly featureId: string;
}

/**
 * 创建一个"批量变换"命令。
 */
export function createBatchTransformCommand(
  vertices: Point2D[],
  transform: TransformKind,
  params: Record<string, number>,
  before: ReadonlyArray<Point2D>,
  after: ReadonlyArray<Point2D>,
  featureId: string
): Command<BatchTransformPayload> {
  return {
    id: `batch-transform-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    kind: `edit.${transform}`,
    payload: { transform, params, before, after, featureId },
    apply() {
      for (let i = 0; i < after.length; i++) {
        vertices[i] = after[i]!;
      }
      vertices.length = after.length;
    },
    revert() {
      for (let i = 0; i < before.length; i++) {
        vertices[i] = before[i]!;
      }
      vertices.length = before.length;
    },
  };
}
