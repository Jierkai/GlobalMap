import type {
  TdtLayerOptions,
  BaiduLayerOptions,
  AmapLayerOptions,
  GoogleLayerOptions,
  OsmLayerOptions,
  BingLayerOptions,
  ArcGisLayerOptions,
  GraphicLayerOptions,
} from './layer'

/**
 * Map3D 构造函数选项（设计文档 §5.9）。
 *
 * `Map3D` 构造项含 `container` / `viewerOptions` 及初始化配置；`cesiumBaseUrl` 不暴露（§5.7 自动识别）；
 * 未开发能力域先以 Record<string, unknown> 占位，待各域开发时再具体化为强类型。
 */
export interface Map3DOptions {
  container: string | HTMLElement
  viewerOptions?: Record<string, unknown>

  /** 初始化图层集合：构造完成后按序 addLayer */
  layer?: LayerInitItem[]
  /** Cesium 底图集合：作为 baseLayerPicker 的影像源列表，首项为默认底图 */
  basemapsLayer?: BasemapItem[]

  // -- 以下为未开发能力域的占位配置项，先以 Record 占位 --
  // 注：material/transform/resource 不设 Manager（§5.1），无占位配置项
  plot?: Record<string, unknown>
  measure?: Record<string, unknown>
  roam?: Record<string, unknown>
  effect?: Record<string, unknown>
  analyse?: Record<string, unknown>
  control?: Record<string, unknown>
  scene?: Record<string, unknown>
}

/** 初始化图层项：判别联合，按 type 区分图层种类（layer 与 basemapsLayer 共用） */
export type LayerInitItem =
  | { type: 'tdt'; options: TdtLayerOptions }
  | { type: 'baidu'; options: BaiduLayerOptions }
  | { type: 'amap'; options: AmapLayerOptions }
  | { type: 'google'; options: GoogleLayerOptions }
  | { type: 'osm'; options: OsmLayerOptions }
  | { type: 'bing'; options: BingLayerOptions }
  | { type: 'arcgis'; options: ArcGisLayerOptions }
  | { type: 'graphic'; options: GraphicLayerOptions }
// 后续新增图层类型在此扩展

/** 底图项：LayerInitItem + 底图选择器专用字段 */
export type BasemapItem = LayerInitItem & {
  /** 显示名称（baseLayerPicker 列表展示，缺省取图层实例的 name） */
  name?: string
  /** 图标 URL（baseLayerPicker 缩略图，缺省用 Cesium 内置图标） */
  iconUrl?: string
  /** tooltip 描述 */
  tooltip?: string
}

/** 图层 type 字符串联合（用于工厂分发） */
export type LayerTypeKey = LayerInitItem['type']
