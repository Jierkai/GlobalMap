import { signal } from 'alien-signals';
import { createStyleSystem, type StyleSystem } from '../style/StyleRule.js';
import type { 
  Identified, Positionable, MultiPositionable, Styleable,
  Pickable, Hoverable, Highlightable, GeoJsonSerializable
} from '../capabilities/types.js';
import type { LodConfig } from '../lod/types.js';
import { toGeoJSON } from '../geojson/index.js';

/** Cgx 框架内支持的所有图形要素类别。 */
export type FeatureKind = 'point' | 'polyline' | 'polygon' | 'billboard' | 'label' | 'model';

/** 可被混合到 Feature 中的标准通用交互能力。 */
export type FeatureCapabilities = Pickable & Hoverable & Highlightable;

/** 
 * 表示所有 Feature 共有的基础属性接口。
 * @template K 该图形要素的类别。
 */
export interface BaseFeature<K extends FeatureKind> extends Identified, Styleable<Record<string, unknown>>, GeoJsonSerializable {
  /** 该图形要素的几何类别。 */
  readonly kind: K;
  /** 控制该图形要素可见性层级的 LOD 配置。 */
  readonly lod: LodConfig;
  /** 暴露访问底层引擎对象 (如 Cesium.Entity) 的逃生舱，请谨慎使用。 */
  readonly raw: () => unknown;
}

/** 
 * Feature 的最终组合接口。
 * 使用条件类型推导它是具有单点 (Positionable) 还是多点 (MultiPositionable) 特征。
 * @template K 该图形要素的类别。
 */
export type Feature<K extends FeatureKind> = BaseFeature<K> & 
  (K extends 'point' | 'billboard' | 'label' | 'model' ? Positionable : MultiPositionable) & 
  Partial<FeatureCapabilities>;

/** 创建新 Feature 时可供传入的配置选项。 */
export interface FeatureOptions<K extends FeatureKind> {
  /** 显式指定的 ID。如果省略将自动生成一个 UUID。 */
  id?: string;
  /** 可选的易读名称。 */
  name?: string;
  /** 附着在 Feature 上的自定义属性字典，它将被完全序列化到 GeoJSON 中。 */
  properties?: Record<string, unknown>;
  /** 对于点状图元的单一坐标。 */
  position?: unknown;
  /** 对于线/面等多点图元的坐标数组。 */
  positions?: unknown[];
  /** 初始的样式属性配置。 */
  style?: Record<string, unknown>;
  /** LOD (细节层次) 配置。 */
  lod?: LodConfig;
  /** 指定该图形要素是否支持被光标拾取交互。 */
  pickable?: boolean;
  /** 指定该图形要素是否对光标悬停做出反应。 */
  hoverable?: boolean;
  /** 指定该图形要素是否能够被高亮显示。 */
  highlightable?: boolean;
}

/**
 * 采用组合而非继承的方式创建并返回一个新的 Feature 实例。
 * @param kind 图形要素的几何类别。
 * @param opts 用于配置 Feature 的选项字典。
 * @returns 新创建且响应式的 Feature 对象。
 */
export function createFeature<K extends FeatureKind>(kind: K, opts: FeatureOptions<K>): Feature<K> {
  const id = opts.id ?? crypto.randomUUID();
  const properties = opts.properties ?? {};
  const lod = opts.lod ?? {};
  
  const style = createStyleSystem<Record<string, unknown>>(opts.style ?? {});
  
  const base = {
    id,
    kind,
    name: opts.name,
    properties,
    style,
    lod,
    raw: () => null
  } as unknown as Record<string, unknown>;

  base.toGeoJSON = () => toGeoJSON(base as unknown as Feature<FeatureKind>);

  if (opts.position !== undefined || ['point', 'billboard', 'label', 'model'].includes(kind)) {
    base.position = signal(opts.position ?? null);
  } else {
    base.positions = signal(opts.positions ?? []);
  }

  if (opts.pickable !== undefined) {
    base.pickable = signal(opts.pickable);
  }
  
  if (opts.hoverable !== undefined) {
    base.hoverable = signal(opts.hoverable);
  }

  if (opts.highlightable !== undefined) {
    const isHigh = signal(false);
    base.highlighted = isHigh;
    base.highlight = () => isHigh(true);
    base.unhighlight = () => isHigh(false);
  }

  return base as unknown as Feature<K>;
}
