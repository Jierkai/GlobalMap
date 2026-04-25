/**
 * @module @cgx/analysis/protocol
 *
 * Worker 通信协议定义。
 *
 * 主线程与 Worker 共用此文件，确保消息格式一致。
 * 所有数据为纯数据（Float64Array / GeoJSON），不持有 Cesium 引用。
 */

// ---------------------------------------------------------------------------
// 任务类型
// ---------------------------------------------------------------------------

/** 支持的分析任务类型 */
export type TaskKind = 'buffer' | 'union' | 'intersect' | 'difference' | 'profile' | 'viewshed';

// ---------------------------------------------------------------------------
// 任务输入
// ---------------------------------------------------------------------------

/** 缓冲区分析输入 */
export interface BufferInput {
  /** GeoJSON Feature（点/线/面） */
  readonly geojson: GeoJSONInput;
  /** 缓冲距离（米） */
  readonly distance: number;
  /** 缓冲步数（精度） */
  readonly steps?: number;
}

/** 布尔运算输入 */
export interface BooleanOpInput {
  /** 第一个 GeoJSON Feature（面） */
  readonly a: GeoJSONInput;
  /** 第二个 GeoJSON Feature（面） */
  readonly b: GeoJSONInput;
}

/** 沿线剖面输入 */
export interface ProfileInput {
  /** 沿线坐标列表 */
  readonly line: Float64Array;
  /** 采样间距（米） */
  readonly sampleDistance: number;
  /** 高程数据（DEM）或固定高程值 */
  readonly elevation: Float64Array | number;
}

/** 可视域分析输入 */
export interface ViewshedInput {
  /** 观察点坐标 [lng, lat, alt] */
  readonly observer: [number, number, number];
  /** 观察方向（度，0=北） */
  readonly heading: number;
  /** 视角范围（度） */
  readonly fov: number;
  /** 最大观察距离（米） */
  readonly maxDistance: number;
  /** 网格分辨率（米） */
  readonly cellSize: number;
  /** 地形高程数据（DEM）或固定高程值 */
  readonly elevation: Float64Array | number;
}

/** GeoJSON 输入（简化版） */
export interface GeoJSONInput {
  readonly type: 'Point' | 'LineString' | 'Polygon' | 'MultiPoint' | 'MultiLineString' | 'MultiPolygon';
  readonly coordinates: number[] | number[][] | number[][][] | number[][][][];
}

/** 任务输入映射 */
export type TaskInputMap = {
  'buffer': BufferInput;
  'union': BooleanOpInput;
  'intersect': BooleanOpInput;
  'difference': BooleanOpInput;
  'profile': ProfileInput;
  'viewshed': ViewshedInput;
};

/** 根据任务类型获取输入类型 */
export type TaskInput<K extends TaskKind> = TaskInputMap[K];

// ---------------------------------------------------------------------------
// 任务输出
// ---------------------------------------------------------------------------

/** 缓冲区分析输出 */
export type BufferOutput = GeoJSONInput;

/** 布尔运算输出 */
export type BooleanOpOutput = GeoJSONInput | null;

/** 沿线剖面输出 */
export interface ProfileOutput {
  /** 采样点坐标 [lng, lat, alt][] */
  readonly points: Float64Array;
  /** 各点高程 */
  readonly elevations: Float64Array;
  /** 累计距离 */
  readonly distances: Float64Array;
}

/** 可视域分析输出 */
export interface ViewshedOutput {
  /** 可见性网格（0=不可见，1=可见） */
  readonly grid: Uint8Array;
  /** 网格宽度 */
  readonly width: number;
  /** 网格高度 */
  readonly height: number;
  /** 网格原点坐标 [lng, lat] */
  readonly origin: [number, number];
  /** 网格分辨率（度） */
  readonly cellSizeDeg: number;
}

/** 任务输出映射 */
export type TaskOutputMap = {
  'buffer': BufferOutput;
  'union': BooleanOpOutput;
  'intersect': BooleanOpOutput;
  'difference': BooleanOpOutput;
  'profile': ProfileOutput;
  'viewshed': ViewshedOutput;
};

/** 根据任务类型获取输出类型 */
export type TaskOutput<K extends TaskKind> = TaskOutputMap[K];

// ---------------------------------------------------------------------------
// Worker 消息格式
// ---------------------------------------------------------------------------

/** 主线程 → Worker：任务请求 */
export interface TaskRequest<K extends TaskKind = TaskKind> {
  readonly id: string;
  readonly kind: K;
  readonly input: TaskInput<K>;
}

/** Worker → 主线程：任务成功响应 */
export interface TaskSuccessResponse<K extends TaskKind = TaskKind> {
  readonly id: string;
  readonly ok: true;
  readonly result: TaskOutput<K>;
}

/** Worker → 主线程：任务失败响应 */
export interface TaskErrorResponse {
  readonly id: string;
  readonly ok: false;
  readonly error: string;
}

/** Worker → 主线程：任务中止响应 */
export interface TaskAbortResponse {
  readonly id: string;
  readonly ok: false;
  readonly aborted: true;
}

/** Worker 消息联合类型 */
export type TaskResponse<K extends TaskKind = TaskKind> =
  | TaskSuccessResponse<K>
  | TaskErrorResponse
  | TaskAbortResponse;

/** 主线程 → Worker：中止指令 */
export interface AbortMessage {
  readonly type: 'abort';
  readonly id: string;
}
