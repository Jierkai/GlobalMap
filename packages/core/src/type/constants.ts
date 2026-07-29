/**
 * 跨域共享常量枚举（图层域设计文档 §3.3）。
 *
 * 供图层、坐标转换工具、未来其他域使用。
 */

/** 中国坐标系类型 */
export enum ChinaCRS {
  WGS84 = 'WGS84',
  GCJ02 = 'GCJ02',
  BD09 = 'BD09',
}

/** 图层类型（天地图/高德/百度等厂商的瓦片类型，字符串在各厂商 URL 中通用） */
export enum LayerType {
  IMG = 'img', // 卫星影像
  VEC = 'vec', // 矢量底图
  TER = 'ter', // 地形
  CIA = 'cia', // 影像注记
  CVA = 'cva', // 矢量注记
  ROAD = 'road', // 路网
  LABEL = 'label', // 标注
  TRAFFIC = 'traffic', // 路况
}

/** Bing Maps 图层类型 */
export enum BingLayerType {
  AERIAL = 'aerial',
  ROAD = 'road',
  COLLINS = 'collins',
  HYBRID = 'hybrid',
}

/** 图层运行时状态 */
export enum LayerState {
  /** 初始状态：已构造，未添加到地图 */
  INITIAL = 'initial',
  /** 正在添加到地图（addToMap 执行中） */
  ADDING = 'adding',
  /** 已添加到地图 */
  ADDED = 'added',
  /** 正在从地图移除（removeFromMap 执行中） */
  REMOVING = 'removing',
  /** 已从地图移除 */
  REMOVED = 'removed',
  /** 已销毁 */
  DESTROYED = 'destroyed',
}
