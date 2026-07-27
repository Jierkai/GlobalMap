/**
 * Map3D 构造函数选项（设计文档 §5.9）。
 *
 * 除 container / cesiumBaseUrl / viewerOptions 外，扩展初始化配置；
 * 未开发能力域先以 Record<string, unknown> 占位，待各域开发时再具体化为强类型。
 */
export interface Map3DOptions {
  container: string | HTMLElement
  cesiumBaseUrl: string
  viewerOptions?: Record<string, unknown>

  /** 初始化图层集合：构造完成后按序 addLayer */
  layer?: LayerInitItem[]
  /** Cesium 底图集合：作为 baseLayerPicker 的影像源列表，首项为默认底图 */
  basemapsLayer?: BasemapItem[]

  // -- 以下为未开发能力域的占位配置项，先以 Record 占位 --
  primitive?: Record<string, unknown>
  plot?: Record<string, unknown>
  measure?: Record<string, unknown>
  roam?: Record<string, unknown>
  effect?: Record<string, unknown>
  material?: Record<string, unknown>
  analyse?: Record<string, unknown>
  transform?: Record<string, unknown>
  control?: Record<string, unknown>
  resource?: Record<string, unknown>
  scene?: Record<string, unknown>
}

/** 初始化图层项：图层未开发阶段先用 Record 占位，后续具体化为判别联合（按 type 区分图层种类） */
export type LayerInitItem = Record<string, unknown>

/** 底图项：影像源配置（名称/类型/url/层级等），先用 Record 占位 */
export type BasemapItem = Record<string, unknown>
