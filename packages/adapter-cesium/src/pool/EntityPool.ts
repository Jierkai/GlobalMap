import type { FeatureRenderSpec } from '@cgx/core';
import { metricsBus } from '@cgx/core';

/** 可池化的 Cesium 实体类型标识。 */
export type PoolableKind = 'point' | 'polyline' | 'billboard';

/** {@link EntityPool} 构造选项。 */
export interface EntityPoolOptions<TEntity> {
  /** 当池中无可复用对象时，根据 spec 创建新实体。 */
  create: (spec: FeatureRenderSpec) => TEntity;
  /** 从池中取出旧实体时，将其状态重置为新 spec 描述的样子。 */
  reset: (entity: TEntity, spec: FeatureRenderSpec) => void;
  /** 实体被丢弃（池满溢出或 flush）时调用，用于释放 Cesium 资源。 */
  destroy?: (entity: TEntity) => void;
  /** 每种 kind 的最大空闲容量，默认 1024。 */
  capacity?: number;
}

/**
 * 通用对象池，用于复用高频 Cesium 实体（point/polyline/billboard）。
 *
 * - `acquire`：优先从空闲桶取出并重置，池空则新建；
 * - `release`：将实体归还空闲桶，桶满则销毁；
 * - `flush`：viewer dispose 时调用，销毁所有缓存对象，避免 Cesium 资源泄漏；
 * - `snapshot`：返回当前命中率等统计信息，命中率同步推送到 `metricsBus`。
 *
 * 设置环境变量 `CGX_DISABLE_POOL=1` 可完全禁用池化（便于对比测试）。
 */
export class EntityPool<TEntity> {
  private static readonly kinds: readonly PoolableKind[] = ['point', 'polyline', 'billboard'];

  private readonly free = new Map<PoolableKind, TEntity[]>();
  private readonly capacity: number;
  private acquires = 0;
  private hits = 0;
  private readonly disabled: boolean;

  constructor(private readonly opts: EntityPoolOptions<TEntity>) {
    this.capacity = opts.capacity ?? 1024;
    this.disabled = typeof process !== 'undefined' && process.env?.CGX_DISABLE_POOL === '1';
  }

  /**
   * 获取一个指定 kind 的实体。
   * 若池中有空闲实体则复用（命中），否则调用 `create` 新建。
   * 每次调用均更新命中率指标并推送到 `metricsBus`。
   *
   * @param kind   实体类型
   * @param spec   用于创建或重置实体的渲染规格
   * @returns      可直接使用的实体对象
   */
  acquire(kind: PoolableKind, spec: FeatureRenderSpec): TEntity {
    this.acquires += 1;
    if (this.disabled) {
      this.reportHitRate();
      return this.opts.create(spec);
    }
    const bucket = this.free.get(kind);
    if (bucket && bucket.length > 0) {
      const entity = bucket.pop()!;
      this.opts.reset(entity, spec);
      this.hits += 1;
      this.reportHitRate();
      return entity;
    }
    this.reportHitRate();
    return this.opts.create(spec);
  }

  /**
   * 归还一个实体到池中。
   * 若对应桶已达容量上限则立即销毁该实体；
   * 池化被禁用时也直接销毁。
   *
   * @param kind   实体类型
   * @param entity 待归还的实体对象
   */
  release(kind: PoolableKind, entity: TEntity): void {
    if (this.disabled) {
      this.opts.destroy?.(entity);
      return;
    }
    const bucket = this.free.get(kind) ?? [];
    if (bucket.length >= this.capacity) {
      this.opts.destroy?.(entity);
      return;
    }
    bucket.push(entity);
    this.free.set(kind, bucket);
  }

  /**
   * 销毁所有缓存对象并清空桶。
   * 应在 viewer dispose 时调用，避免 Cesium 资源泄漏。
   */
  flush(): void {
    for (const bucket of this.free.values()) {
      for (const entity of bucket) this.opts.destroy?.(entity);
      bucket.length = 0;
    }
    this.free.clear();
  }

  /**
   * 返回当前池状态的只读快照，包含总 acquire 次数、命中次数、命中率及各桶大小。
   */
  snapshot() {
    const bucketSizes: Record<PoolableKind, number> = {
      point: 0,
      polyline: 0,
      billboard: 0,
    };
    for (const kind of EntityPool.kinds) {
      bucketSizes[kind] = this.free.get(kind)?.length ?? 0;
    }

    return {
      acquires: this.acquires,
      hits: this.hits,
      hitRate: this.acquires > 0 ? this.hits / this.acquires : 0,
      bucketSizes,
    };
  }

  /** 将当前命中率推送到全局指标总线。 */
  private reportHitRate(): void {
    metricsBus.set('poolHitRate', this.acquires > 0 ? this.hits / this.acquires : 0);
  }
}
