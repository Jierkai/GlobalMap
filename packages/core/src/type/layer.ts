import type { ChinaCRS } from './constants'

/**
 * 图层构造项（设计文档 §5.6）。
 *
 * - `id` 可选，缺省时经 generateId()（shared）随机生成；
 * - `show` 可选，声明初始可见性，在 _bind 时同步一次；
 * - 其余字段由各具体图层扩展自身构造项。
 */
export interface BaseLayerOptions {
  id?: string
  show?: boolean
  [key: string]: unknown
}

/** 天地图瓦片类型 */
export type TdtLayerType = 'img' | 'vec' | 'ter' | 'cia' | 'cva' | 'ctb' | 'cvb' | 'ib' | 'cta'

/** 百度地图瓦片类型 */
export type BaiduLayerType = 'img' | 'vec' | 'ter' | 'traffic'

/** 高德地图瓦片类型 */
export type AmapLayerType = 'img' | 'vec' | 'road' | 'label' | 'traffic'

/** 谷歌地图瓦片类型 */
export type GoogleLayerType = 'img' | 'vec' | 'ter' | 'road' | 'label'

/** Bing Maps 瓦片类型（与 BingLayerType 枚举的字符串值一致） */
export type BingLayerTypeString = 'aerial' | 'road' | 'collins' | 'hybrid'

/**
 * 瓦片模板图层构造项（内部使用，不导出给消费者）。
 *
 * 统一各厂商瓦片图层的配置项：URL 模板、子域名、token、视觉属性等。
 */
export interface UrlTemplateLayerOptions extends BaseLayerOptions {
  /** 显示名称 */
  name?: string
  /** 分组 ID（用于图层分组管理） */
  pid?: string
  /** 初始可见性（映射到 BaseLayer 的 show） */
  isShow?: boolean

  /** 瓦片 URL 模板，支持 {x}/{y}/{z}/{s}（子域名）/{tk}（token）占位符 */
  url: string
  /** 子域名配置：字符串或字符串集合，用于瓦片负载均衡（替换 URL 中的 {s}） */
  subdomains?: string | string[]
  /** token / key，替换 URL 中的 {tk}（天地图）或 {key}（其他）；缺省时读全局 key */
  token?: string
  /** 额外查询参数（拼到 URL 后或传给 provider 的 queryParameters） */
  queryParameters?: Record<string, string>
  /** 代理服务（Cesium Resource proxy，用于跨域或穿透访问） */
  proxy?: string

  /** 图层顺序（zIndex，值越大越在上层；通过 imageryLayers.raise/lower 实现） */
  zIndex?: number
  /** 中国坐标系类型（影响瓦片坐标转换策略） */
  chinaCRS?: ChinaCRS

  /** 最大缩放级别 */
  maximumLevel?: number
  /** 最小缩放级别 */
  minimumLevel?: number
  /** 瓦片宽度（默认 256） */
  tileWidth?: number
  /** 瓦片高度（默认 256） */
  tileHeight?: number
  /** 版权信息 */
  credit?: string
  /** 自定义请求头 */
  headers?: Record<string, string>

  // -- 视觉属性（映射到 Cesium ImageryLayer 对应属性） --
  /** 透明度（0.0-1.0，默认 1.0） */
  alpha?: number
  /** 亮度（1.0 = 原色，<1.0 变暗，>1.0 变亮） */
  brightness?: number
  /** 对比度（1.0 = 原色） */
  contrast?: number
  /** 色调（弧度，0.0 = 原色） */
  hue?: number
  /** 饱和度（1.0 = 原色） */
  saturation?: number
  /** 伽马校正（1.0 = 原色） */
  gamma?: number
  /** 地球夜面区域的透明度（默认 1.0；仅在 enableLighting = true 时生效） */
  nightAlpha?: number
  /** 地球日面区域的透明度（默认 1.0；同上） */
  dayAlpha?: number
}

/** 天地图图层构造项 */
export interface TdtLayerOptions extends BaseLayerOptions {
  /** 天地图开发者 token（必填，缺省读全局 key） */
  token?: string
  /** 图层类型：img=卫星影像 / vec=矢量底图 / ter=地形 / cia=影像注记 / cva=矢量注记 */
  type?: TdtLayerType
}

/** 百度地图图层构造项 */
export interface BaiduLayerOptions extends BaseLayerOptions {
  /** 百度地图 AK（可选） */
  ak?: string
  /** 图层类型 */
  type?: BaiduLayerType
  /** 自定义样式 ID */
  styleId?: string
}

/** 高德地图图层构造项 */
export interface AmapLayerOptions extends BaseLayerOptions {
  /** 高德地图 key（可选） */
  key?: string
  /** 图层类型 */
  type?: AmapLayerType
}

/** 谷歌地图图层构造项 */
export interface GoogleLayerOptions extends BaseLayerOptions {
  /** 图层类型 */
  type?: GoogleLayerType
  /** 语言（默认 zh-CN） */
  language?: string
  /** 区域（默认 CN） */
  region?: string
}

/** OpenStreetMap 图层构造项 */
export interface OsmLayerOptions extends BaseLayerOptions {
  /** 自定义瓦片服务器 URL（默认官方） */
  url?: string
  /** 自定义子域名（默认 a/b/c） */
  subdomains?: string[]
  /** 最大缩放级别 */
  maximumLevel?: number
}

/** Bing Maps 图层构造项 */
export interface BingLayerOptions extends BaseLayerOptions {
  /** Bing Maps API key（必填，缺省读全局 key） */
  key?: string
  /** 图层类型 */
  type?: BingLayerTypeString
  /** culture（默认 zh-CN） */
  culture?: string
}

/** ArcGIS Server 图层构造项 */
export interface ArcGisLayerOptions extends BaseLayerOptions {
  /** ArcGIS MapServer URL */
  url: string
  /** 是否使用瓦片模板直连模式（默认 false，走 fromUrl 异步元数据） */
  useTileTemplate?: boolean
  /** useTileTemplate=true 时的最大层级 */
  maximumLevel?: number
}

/** GraphicLayer 构造项（复用 BaseLayerOptions） */
export type GraphicLayerOptions = BaseLayerOptions

/** PrimitiveLayer（图元Layer）构造项（复用 BaseLayerOptions） */
export type PrimitiveLayerOptions = BaseLayerOptions
