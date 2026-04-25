/**
 * @module @cgx/core/constraint
 *
 * 纯几何约束系统。
 *
 * 约束是纯函数，接收候选坐标和上下文，返回修正后的坐标。
 * 多个约束可组合（管道式依次应用）。
 *
 * 设计原则：
 * - 纯函数：无副作用，无状态
 * - 可组合：约束数组按顺序依次应用
 * - 零 Cesium 依赖：仅操作 LngLat 坐标
 */

// ---------------------------------------------------------------------------
// 基础类型
// ---------------------------------------------------------------------------

/** 二维坐标点（经纬度或屏幕坐标） */
export interface Point2D {
  readonly x: number;
  readonly y: number;
}

/** 约束上下文：提供约束计算所需的额外信息 */
export interface ConstraintContext {
  /** 已有的顶点列表（用于吸附、正交等计算） */
  readonly vertices: ReadonlyArray<Point2D>;
  /** 当前绘制的形状类型 */
  readonly shapeKind?: string;
  /** 约束参数（如锁定长度、锁定角度） */
  readonly params?: Record<string, number>;
}

/** 约束函数签名 */
export type Constraint = (
  candidate: Point2D,
  ctx: ConstraintContext
) => Point2D;

// ---------------------------------------------------------------------------
// 吸附约束（SnapConstraint）
// ---------------------------------------------------------------------------

/** 吸附目标类型 */
export type SnapTarget = 'endpoint' | 'midpoint' | 'intersection' | 'grid';

/** 吸附配置 */
export interface SnapConfig {
  /** 吸附目标类型 */
  readonly target: SnapTarget;
  /** 吸附半径（像素或坐标单位） */
  readonly radius: number;
}

/**
 * 端点吸附：将候选点吸附到最近的已有顶点。
 */
export function snapToEndpoint(
  config: SnapConfig
): Constraint {
  return (candidate, ctx) => {
    let closest: Point2D | null = null;
    let minDist = config.radius;

    for (const v of ctx.vertices) {
      const dist = distance2D(candidate, v);
      if (dist < minDist) {
        minDist = dist;
        closest = v;
      }
    }

    return closest ?? candidate;
  };
}

/**
 * 中点吸附：将候选点吸附到相邻顶点连线的中点。
 */
export function snapToMidpoint(
  config: SnapConfig
): Constraint {
  return (candidate, ctx) => {
    if (ctx.vertices.length < 2) return candidate;

    let closest: Point2D | null = null;
    let minDist = config.radius;

    for (let i = 0; i < ctx.vertices.length - 1; i++) {
      const a = ctx.vertices[i]!;
      const b = ctx.vertices[i + 1]!;
      const mid: Point2D = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      const dist = distance2D(candidate, mid);
      if (dist < minDist) {
        minDist = dist;
        closest = mid;
      }
    }

    return closest ?? candidate;
  };
}

// ---------------------------------------------------------------------------
// 正交约束（OrthoConstraint）
// ---------------------------------------------------------------------------

/**
 * 正交轴锁：将候选点约束到与上一个顶点的水平或垂直方向。
 *
 * 当 Shift 键按下时启用，根据候选点与上一个顶点的偏移量，
 * 选择偏移较大的轴作为锁定轴。
 */
export function orthoConstraint(): Constraint {
  return (candidate, ctx) => {
    if (ctx.vertices.length === 0) return candidate;

    const last = ctx.vertices[ctx.vertices.length - 1]!;
    const dx = Math.abs(candidate.x - last.x);
    const dy = Math.abs(candidate.y - last.y);

    if (dx >= dy) {
      // 锁定水平轴
      return { x: candidate.x, y: last.y };
    } else {
      // 锁定垂直轴
      return { x: last.x, y: candidate.y };
    }
  };
}

// ---------------------------------------------------------------------------
// 长度锁定约束（LengthLockConstraint）
// ---------------------------------------------------------------------------

/**
 * 长度锁定：将候选点约束到与上一个顶点固定距离的位置。
 *
 * 保持方向不变，调整距离到锁定值。
 */
export function lengthLockConstraint(): Constraint {
  return (candidate, ctx) => {
    if (ctx.vertices.length === 0) return candidate;

    const lockedLength = ctx.params?.['lengthLock'];
    if (lockedLength === undefined || lockedLength <= 0) return candidate;

    const last = ctx.vertices[ctx.vertices.length - 1]!;
    const dx = candidate.x - last.x;
    const dy = candidate.y - last.y;
    const currentDist = Math.sqrt(dx * dx + dy * dy);

    if (currentDist === 0) return candidate;

    const scale = lockedLength / currentDist;
    return {
      x: last.x + dx * scale,
      y: last.y + dy * scale,
    };
  };
}

// ---------------------------------------------------------------------------
// 角度锁定约束（AngleLockConstraint）
// ---------------------------------------------------------------------------

/**
 * 角度锁定：将候选点约束到与上一个顶点固定角度的方向。
 *
 * 角度以度为单位，0° = 正东，逆时针为正。
 */
export function angleLockConstraint(): Constraint {
  return (candidate, ctx) => {
    if (ctx.vertices.length === 0) return candidate;

    const lockedAngleDeg = ctx.params?.['angleLock'];
    if (lockedAngleDeg === undefined) return candidate;

    const last = ctx.vertices[ctx.vertices.length - 1]!;
    const dx = candidate.x - last.x;
    const dy = candidate.y - last.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist === 0) return candidate;

    const angleRad = (lockedAngleDeg * Math.PI) / 180;
    return {
      x: last.x + dist * Math.cos(angleRad),
      y: last.y + dist * Math.sin(angleRad),
    };
  };
}

// ---------------------------------------------------------------------------
// 约束组合器
// ---------------------------------------------------------------------------

/**
 * 按顺序应用多个约束（管道式）。
 *
 * @param constraints - 约束数组，按优先级从高到低排列
 * @returns 组合后的约束函数
 *
 * @example
 * ```ts
 * const combined = composeConstraints([
 *   snapToEndpoint({ target: 'endpoint', radius: 10 }),
 *   orthoConstraint(),
 *   lengthLockConstraint(),
 * ]);
 *
 * const result = combined(candidate, ctx);
 * ```
 */
export function composeConstraints(
  constraints: ReadonlyArray<Constraint>
): Constraint {
  return (candidate, ctx) => {
    let result = candidate;
    for (const constraint of constraints) {
      result = constraint(result, ctx);
    }
    return result;
  };
}

// ---------------------------------------------------------------------------
// 内部工具
// ---------------------------------------------------------------------------

/** 计算两点间欧氏距离 */
function distance2D(a: Point2D, b: Point2D): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}
