import type { GeocoderService, ProviderViewModel } from 'cesium'
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

  /** UI 控件配置；Viewer 原生控件子集参与 Viewer 构造（见 {@link Control}） */
  control?: Control

  // -- 以下为未开发能力域的占位配置项，先以 Record 占位 --
  // 注：material/transform/resource 不设 Manager（§5.1），无占位配置项
  plot?: Record<string, unknown>
  measure?: Record<string, unknown>
  roam?: Record<string, unknown>
  effect?: Record<string, unknown>
  analyse?: Record<string, unknown>
  scene?: Record<string, unknown>
}

/**
 * UI 控件配置项。
 *
 * 键分两类：
 * - **Cesium Viewer 原生控件**（animation / timeline / baseLayerPicker 等）：`Map3D` 构造时合并进
 *   Viewer 构造参数参与 `new Cesium.Viewer()`；与 `viewerOptions` 同名键冲突时 `control` 优先。
 *   未显式配置的键保持 Cesium Viewer 自身默认值。
 * - **扩展控件**（compass / zoom / locationBar 等）：无 Cesium Viewer 对应项，
 *   由 `ControlManager` 持有，待后续迭代实现；先以 `boolean | 选项对象` 占位语义声明。
 */
export interface Control {
  // -- Cesium Viewer 原生控件（参与 Viewer 构造） --

  /** 时钟仪表 widget */
  animation?: boolean
  /** 下侧时间线控件面板 */
  timeline?: boolean
  /** 视角复位（主页）按钮 */
  homeButton?: boolean
  /** 底图切换按钮 */
  baseLayerPicker?: boolean
  /** 二维、三维、2.5D 场景模式切换按钮 */
  sceneModePicker?: boolean
  /** 投影切换按钮：透视 / 正投影之间切换 */
  projectionPicker?: boolean
  /** 全屏按钮 */
  fullscreenButton?: boolean
  /** 按下全屏按钮时要置于全屏模式的元素或其 id，默认 document.body */
  fullscreenElement?: Element | string
  /** VR 效果按钮 */
  vrButton?: boolean
  /** 地名查找（地理编码）按钮；可传 GeocoderService 数组自定义搜索服务 */
  geocoder?: boolean | GeocoderService[]
  /** 帮助按钮 */
  navigationHelpButton?: boolean
  /** 用户明确单击帮助按钮前是否自动显示操作说明（默认 true） */
  navigationInstructionsInitiallyVisible?: boolean
  /** baseLayerPicker 底图切换面板的影像 ProviderViewModel 列表（通常由 basemapsLayer 自动生成，无需传入） */
  imageryProviderViewModels?: ProviderViewModel[]
  /** baseLayerPicker 当前选中的影像 ProviderViewModel（缺省取第一个可用项） */
  selectedImageryProviderViewModel?: ProviderViewModel
  /** baseLayerPicker 底图切换面板的地形 ProviderViewModel 列表 */
  terrainProviderViewModels?: ProviderViewModel[]
  /** baseLayerPicker 当前选中的地形 ProviderViewModel（缺省取第一个可用项） */
  selectedTerrainProviderViewModel?: ProviderViewModel
  /** 信息面板：点击要素后是否显示信息面板 */
  infoBox?: boolean
  /** 选中框：拾取对象时是否显示选中标记 */
  selectionIndicator?: boolean
  /** 是否显示 WebGL 渲染错误弹窗（默认 true；正式部署系统中可关闭） */
  showRenderLoopErrors?: boolean

  // -- 扩展控件（无 Viewer 对应项，由 ControlManager 持有，待后续迭代实现） --

  /** 按钮工具栏（Toolbar 构造参数） */
  toolbar?: boolean | Record<string, unknown>
  /** 放大缩小按钮（Zoom 构造参数） */
  zoom?: boolean | Record<string, unknown>
  /** 罗盘 / 导航球（Compass 构造参数） */
  compass?: boolean | Record<string, unknown>
  /** 底部状态栏：展示鼠标所在位置与相机信息（LocationBar 构造参数） */
  locationBar?:
    | boolean
    | {
        /** 显示内容格式化模板，支持 {lng}/{lat}/{alt}/{heading}/{pitch}/{cameraHeight}/{level}/{fps}/{ms} 占位符，或传返回 HTML 的函数 */
        format?: string | ((...params: unknown[]) => string)
      }
  /** 比例尺 / 距离图例（DistanceLegend 构造参数） */
  distanceLegend?: boolean | Record<string, unknown>
  /** 时钟播放控制条（ClockAnimate 构造参数） */
  clockAnimate?: boolean | Record<string, unknown>
  /** 鹰眼地图（OverviewMap 构造参数） */
  overviewMap?: boolean | Record<string, unknown>
  /** 卷帘对比（MapSplit 构造参数） */
  mapSplit?: boolean | Record<string, unknown>
  /** 字幕（Subtitles 构造参数） */
  subtitles?: boolean | Record<string, unknown>
  /** 鼠标滚轮缩放时的指示图标样式（MouseDownView 构造参数） */
  mouseDownView?: boolean
  /** 内置右键菜单控制参数（ContextMenu 构造参数） */
  contextmenu?:
    | boolean
    | {
        /** 是否取消浏览器默认右键菜单（默认 true） */
        preventDefault?: boolean
        /** 是否绑定默认的地图右键菜单（默认 true） */
        hasDefault?: boolean
      }
  /** 内置 Popup 弹窗控制参数 */
  popup?:
    | boolean
    | {
        /** 是否打开深度判断（true 时判断是否在球背面） */
        depthTest?: boolean
      }
  /** 内置 Tooltip 控制参数 */
  tooltip?:
    | boolean
    | {
        /** 延迟缓存的时间，单位：毫秒（默认 20） */
        cacheTime?: number
      }
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
