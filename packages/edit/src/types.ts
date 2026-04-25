/**
 * @module @cgx/edit/types
 *
 * 编辑工具类型定义。
 *
 * 设计原则：
 * - 每个 Editor 是一个 FSM 实例（idle → selecting → dragging/rotating/scaling）
 * - 所有变更以 Command 形式进入 @cgx/history
 * - diff 事件包含 before/after 快照
 * - 零 Cesium 依赖
 */

import type { ReadonlySignal, Off } from '@cgx/reactive';
import type { Point2D } from '@cgx/core';
import type { History } from '@cgx/history';

// ---------------------------------------------------------------------------
// Editor 状态
// ---------------------------------------------------------------------------

/** Editor 状态联合类型 */
export type EditorState =
  | { readonly phase: 'idle' }
  | { readonly phase: 'selecting' }
  | { readonly phase: 'dragging'; readonly vertexIndex: number }
  | { readonly phase: 'rotating'; readonly center: Point2D }
  | { readonly phase: 'scaling'; readonly center: Point2D };

// ---------------------------------------------------------------------------
// 编辑事件
// ---------------------------------------------------------------------------

/** 要素快照（纯数据） */
export interface FeatureSnapshot {
  /** 要素 ID */
  readonly featureId: string;
  /** 顶点列表快照 */
  readonly vertices: ReadonlyArray<Point2D>;
}

/** 编辑 diff 事件载荷 */
export interface EditDiffEvent {
  /** 编辑前快照 */
  readonly before: FeatureSnapshot;
  /** 编辑后快照 */
  readonly after: FeatureSnapshot;
  /** 变更的属性路径 */
  readonly diff: ReadonlyArray<string>;
}

/** Editor 事件映射 */
export interface EditorEvents extends Record<string, unknown> {
  /** 顶点被拖动 */
  'vertex-dragged': EditDiffEvent;
  /** 顶点被插入 */
  'vertex-inserted': EditDiffEvent;
  /** 顶点被删除 */
  'vertex-deleted': EditDiffEvent;
  /** 批量变换完成 */
  'batch-transformed': EditDiffEvent;
  /** 选择变更 */
  'selection-changed': { readonly selected: ReadonlyArray<string> };
}

// ---------------------------------------------------------------------------
// 可编辑要素接口
// ---------------------------------------------------------------------------

/**
 * 可编辑要素的纯数据接口。
 *
 * 不持有 Cesium 引用，仅描述要素的几何数据。
 */
export interface EditableFeature {
  /** 要素唯一标识 */
  readonly id: string;
  /** 要素类型 */
  readonly kind: string;
  /** 顶点列表（可变引用，Editor 直接修改） */
  readonly vertices: Point2D[];
}

// ---------------------------------------------------------------------------
// Editor 接口
// ---------------------------------------------------------------------------

/**
 * 要素编辑器接口。
 *
 * 提供顶点拖动、插入、删除、批量变换等操作，
 * 所有变更通过 @cgx/history Command 实现 undo/redo。
 */
export interface Editor {
  /** 当前状态（响应式 Signal） */
  readonly state: ReadonlySignal<EditorState>;
  /** 当前选中的要素 ID 列表 */
  readonly selection: ReadonlyArray<string>;
  /** 关联的 History 实例 */
  readonly history: History;

  /** 选中要素 */
  select(featureIds: string | string[]): void;
  /** 取消所有选中 */
  unselectAll(): void;

  /** 开始拖动指定顶点 */
  startDrag(featureId: string, vertexIndex: number): void;
  /** 更新拖动位置（应用约束） */
  updateDrag(raw: Point2D): void;
  /** 完成拖动（提交 Command 到 History） */
  endDrag(): Promise<void>;

  /** 在指定位置插入顶点 */
  insertVertex(featureId: string, afterIndex: number, vertex: Point2D): Promise<void>;
  /** 删除指定顶点 */
  deleteVertex(featureId: string, vertexIndex: number): Promise<void>;

  /** 批量平移 */
  translate(dx: number, dy: number): Promise<void>;
  /** 批量旋转（弧度） */
  rotate(angle: number, center?: Point2D): Promise<void>;
  /** 批量缩放 */
  scale(factor: number, center?: Point2D): Promise<void>;

  /** 撤销 */
  undo(): Promise<void>;
  /** 重做 */
  redo(): Promise<void>;

  /** 订阅事件 */
  on<K extends keyof EditorEvents>(
    event: K,
    handler: (payload: EditorEvents[K]) => void
  ): Off;
  /** 取消订阅 */
  off<K extends keyof EditorEvents>(
    event: K,
    handler?: (payload: EditorEvents[K]) => void
  ): void;

  /** 销毁 */
  dispose(): void;
  /** 是否已销毁 */
  readonly disposed: boolean;
}

// ---------------------------------------------------------------------------
// Editor 配置
// ---------------------------------------------------------------------------

/** Editor 创建选项 */
export interface EditorOptions {
  /** 关联的 History 实例 */
  readonly history: History;
  /** 可编辑要素列表 */
  readonly features: EditableFeature[];
  /** 约束列表（复用 @cgx/core 约束系统） */
  readonly constraints?: ReadonlyArray<import('@cgx/core').Constraint>;
}
