# 图层域设计文档

> 配套设计文档：`docs/superpowers/specs/2025-01-21-globalmap-monorepo-design.md`（下称"主设计文档"）
> 本文档覆盖主设计文档 §5.1 layer 域的具体图层类型实现与 `basemapsLayer` 底图配置项落地。

## 1. 问题陈述

骨架阶段已建立 `BaseLayer`（晚期绑定 + options 构造）、`LayerManager`（addLayer/removeLayer/getLayer）、`GraphicLayer`（图元图层），但缺少常见地图厂商瓦片图层实现，且 `Map3DOptions.basemapsLayer` 仍为 `Record<string, unknown>` 占位。本次设计解决：

1. 实现**天地图、百度、高德、谷歌、Bing、ArcGIS、OSM** 等常见厂商的瓦片图层类。
2. 实现 `basemapsLayer` 配置项--构造 Map3D 时自动配置底图集合 + 默认底图，替代 BasicMap 中手写 `viewerOptions.baseLayer` + `imageryProviderViewModels` 的方案。
3. `LayerInitItem` 占位具体化为判别联合，支持 `new Map3D({ layer: [...] })` 声明式初始化图层。

## 2. 设计约束（继承自主设计文档，不得违反）

| 约束                      | 来源     | 说明                                                                         |
| ------------------------- | -------- | ---------------------------------------------------------------------------- |
| BaseLayer 晚期绑定        | §5.6     | 构造只收 options 对象，`viewer`/`eventBus` 在 `addLayer` 时经 `_bind()` 注入 |
| options 对象 + id 缺省    | §5.6     | `id` 放入 options，缺省经 `generateId()` 生成                                |
| `show` setter 去重 + emit | §5.6     | setter -> `_updateShow` -> emit `layer:showChanged`                          |
| destroy 幂等              | §5.6     | 调 `removeFromMap`，二次调用无副作用                                         |
| 图层归 layer 域           | §5.1     | 所有图层类 `extends BaseLayer`，经 `map.layer.addLayer()` 挂载               |
| Map3DOptions 占位具体化   | §5.9     | `LayerInitItem`/`BasemapItem` 先 Record 占位，图层开发时具体化               |
| 无 ion 依赖               | 环境约束 | 用户网络访问不了 api.cesium.com，底图默认不走 ion 资产                       |

## 3. 架构设计

### 3.1 类层次

```
BaseLayer (abstract, §5.6 已实现)
├── GraphicLayer (已实现，§5.8)
├── UrlTemplateLayer (本次新增，瓦片模板基类，**内部**，不导出)
│   ├── TdtLayer (天地图)
│   ├── BaiduLayer (百度)
│   ├── AmapLayer (高德)
│   ├── GoogleLayer (谷歌)
│   └── OsmLayer (OpenStreetMap)
├── BingLayer (本次新增，Bing Maps，走 BingImageryProvider)
├── ArcGisLayer (本次新增，ArcGIS Server)
└── GridLayer / CoordinateGridLayer (后续迭代，本次不做)
```

### 3.2 设计决策

**为何不直接让每个厂商图层 extends BaseLayer？**

各厂商瓦片图层 90% 逻辑相同（构造 `UrlTemplateImageryProvider` + `ImageryLayer` 挂到 `viewer.imageryLayers`），差异仅在 URL 模板、子域名、最大层级、坐标系偏移。提取 `UrlTemplateLayer` 中间基类避免重复（DRY），同时保留各厂商子类做语义化 API + 特殊逻辑（如百度 BD09 偏移、天地图 token 注入）。

**Bing 和 ArcGIS 为何不走 UrlTemplateLayer？**

- Bing 使用 `BingMapsImageryProvider`（需要 API key，走 REST Imagery Metadata API），不走瓦片模板。
- ArcGIS 走 `ArcGisMapServerImageryProvider.fromUrl`（异步元数据请求）或瓦片模板直连（同步）。两种模式都支持，由 options 选择。

**为何 basemapsLayer 不做成 Manager？**

底图集合本质是 viewer 创建时的配置项（`baseLayerPicker` 的 `imageryProviderViewModels` + `selectedImageryProviderViewModel` + 初始 `baseLayer`），不是有独立生命周期的能力实例。它只在 Map3D 构造时消费一次，后续切换底图通过 `map.layer` 的 addLayer/removeLayer 即可实现。因此 `basemapsLayer` 留在 `Map3DOptions` 作为配置项，在 Map3D 构造函数中解析为 `viewerOptions` 的对应字段，不单设 BasemapManager。

### 3.3 常量定义（core/src/type/constants.ts）

将跨域复用的枚举/常量集中到 `type/constants.ts`，供图层、坐标转换工具、未来其他域使用。

```typescript
/** 中国坐标系类型 */
enum ChinaCRS {
  WGS84 = 'WGS84',
  GCJ02 = 'GCJ02',
  BD09 = 'BD09',
}

/** 图层类型（天地图/高德/百度等厂商的瓦片类型） */
enum LayerType {
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
enum BingLayerType {
  AERIAL = 'aerial',
  ROAD = 'road',
  COLLINS = 'collins',
  HYBRID = 'hybrid',
}
```

- `ChinaCRS` 用于图层 options 声明瓦片坐标系，也供坐标转换工具函数使用。
- `LayerType` 统一各厂商的瓦片类型枚举（`img`/`vec`/`ter` 等字符串在各厂商 URL 中通用），避免散落的字面量。
- 后续如需新增常量（如 `SplitDirection`）继续追加到此文件。

## 4. 详细设计

### 4.1 UrlTemplateLayer（瓦片模板基类，**内部使用，不导出给消费者**）

```typescript
/** 瓦片模板图层构造项（内部使用，不导出给消费者） */
interface UrlTemplateLayerOptions extends BaseLayerOptions {
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
  /** token / key，替换 URL 中的 {tk}（天地图）或 {key}（其他）；缺省时读全局 key（见 §4.5） */
  token?: string
  /** 额外查询参数（拼到 URL 后或传给 provider 的 queryParameters） */
  queryParameters?: Record<string, string>
  /** 代理服务（Cesium Resource proxy，用于跨域或穿透访问） */
  proxy?: string

  /** 图层顺序（zIndex，值越大越在上层；通过 imageryLayers.raise/lower 实现） */
  zIndex?: number
  /** 中国坐标系类型（影响瓦片坐标转换策略，见 §4.6） */
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
  /** 地球夜面区域的透明度（默认 1.0；仅在 viewer.scene.globe.enableLighting = true 时生效） */
  nightAlpha?: number
  /** 地球日面区域的透明度（默认 1.0；同上） */
  dayAlpha?: number
}
```

```typescript
/**
 * 瓦片模板图层基类。
 *
 * 统一封装 UrlTemplateImageryProvider + ImageryLayer 的创建与挂载逻辑。
 * 各厂商子类只需提供 URL 模板和默认参数，特殊逻辑覆写对应方法。
 * 视觉属性（alpha/brightness/contrast/hue/saturation/gamma/nightAlpha/dayAlpha）在 addToMap 后同步到 ImageryLayer。
 */
/** @internal 内部基类，不经 index.ts 导出 */
abstract class UrlTemplateLayer extends BaseLayer {
  protected _imageryLayer?: ImageryLayer
  protected _provider?: UrlTemplateImageryProvider

  constructor(options: UrlTemplateLayerOptions) {
    super(options)
    this._urlTemplateOptions = options
  }

  /** 子类可覆写：构造最终 provider 配置（处理子域名、token、queryParameters、proxy、chinaCRS 等） */
  protected _buildProviderConfig(): ConstructorParameters<typeof UrlTemplateImageryProvider>[0] {
    const opts = this._urlTemplateOptions
    return {
      url: opts.url,
      subdomains: opts.subdomains,
      maximumLevel: opts.maximumLevel,
      minimumLevel: opts.minimumLevel,
      tileWidth: opts.tileWidth,
      tileHeight: opts.tileHeight,
      credit: opts.credit,
      queryParameters: opts.queryParameters,
      proxy: opts.proxy ? new Resource({ proxy: new DefaultProxy(opts.proxy) }) : undefined,
    }
  }

  /** 同步视觉属性到 ImageryLayer（在 addToMap 后调用） */
  protected _applyVisualProperties(): void {
    if (!this._imageryLayer) return
    const opts = this._urlTemplateOptions
    if (opts.alpha !== undefined) this._imageryLayer.alpha = opts.alpha
    if (opts.brightness !== undefined) this._imageryLayer.brightness = opts.brightness
    if (opts.contrast !== undefined) this._imageryLayer.contrast = opts.contrast
    if (opts.hue !== undefined) this._imageryLayer.hue = opts.hue
    if (opts.saturation !== undefined) this._imageryLayer.saturation = opts.saturation
    if (opts.gamma !== undefined) this._imageryLayer.gamma = opts.gamma
    if (opts.nightAlpha !== undefined) this._imageryLayer.nightAlpha = opts.nightAlpha
    if (opts.dayAlpha !== undefined) this._imageryLayer.dayAlpha = opts.dayAlpha
  }

  addToMap(): void {
    this._provider = new UrlTemplateImageryProvider(this._buildProviderConfig())
    this._imageryLayer = this._viewer!.imageryLayers.addImageryLayer(
      new ImageryLayer(this._provider),
    )
    this._applyVisualProperties()
    this._applyZIndex()
  }

  removeFromMap(): void {
    if (this._imageryLayer) {
      this._viewer!.imageryLayers.remove(this._imageryLayer)
      this._imageryLayer = undefined
    }
    this._provider = undefined
  }

  protected _updateShow(show: boolean): void {
    if (this._imageryLayer) this._imageryLayer.show = show
  }

  /** zIndex 实现：通过 imageryLayers.raise/lower 调整顺序 */
  protected _applyZIndex(): void {
    if (!this._imageryLayer || this._urlTemplateOptions.zIndex === undefined) return
    const layers = this._viewer!.imageryLayers
    const z = this._urlTemplateOptions.zIndex
    for (let i = 0; i < z; i++) layers.raise(this._imageryLayer)
  }
}
```

> **实现说明**：
>
> - `subdomains` 支持 `string`（如 `'0123'`，Cesium 会逐字符拆分）或 `string[]`（如 `['0','1','2','3']`），传给 Cesium `UrlTemplateImageryProvider` 的 `subdomains` 参数，URL 中的 `{s}` 由 Cesium 内置轮询。
> - `queryParameters` 直接传给 provider（Cesium 会拼到每个瓦片 URL 后）。
> - `proxy` 传入时构造 `new Resource({ proxy: new DefaultProxy(proxy) })`，赋给 provider 的 `proxy` 字段。
> - `nightAlpha`/`dayAlpha` 仅在 `viewer.scene.globe.enableLighting = true` 时生效（由消费者在 scene 域设置，图层不自动修改全局 enableLighting）。
> - `zIndex` 初始化时通过 `imageryLayers.raise()` 实现；后续 LayerManager 可补充 `setZIndex(id, z)` 运行时调整。

### 4.2 各厂商图层

#### 4.2.1 TdtLayer（天地图）

```typescript
type TdtLayerType = 'img' | 'vec' | 'ter' | 'cia' | 'cva' | 'ctb' | 'cvb' | 'ib' | 'cta'

interface TdtLayerOptions extends BaseLayerOptions {
  /** 天地图开发者 token（必填） */
  token: string
  /** 图层类型：img=卫星影像 / vec=矢量底图 / ter=地形 / cia=影像注记 / cva=矢量注记 */
  type?: TdtLayerType // 默认 'img'
}
```

- URL 模板：`https://t{s}.tianditu.gov.cn/DataServer?T={layerType}_w&x={x}&y={y}&l={z}&tk={token}`
  - `_w` 后缀 = Web 墨卡托投影（WGS84）
  - 子域名 `0-7`
- `maximumLevel` 默认 18
- `credit` 默认 `'Tianditu'`
- 实现要点：构造时根据 `type` 生成 URL 模板，token 替换 `{tk}`，`{s}` 交 Cesium subdomains 参数

#### 4.2.2 BaiduLayer（百度地图）

```typescript
type BaiduLayerType = 'img' | 'vec' | 'ter' | 'traffic'

interface BaiduLayerOptions extends BaseLayerOptions {
  /** 百度地图 AK（可选） */
  ak?: string
  /** 图层类型 */
  type?: BaiduLayerType // 默认 'img'
  /** 自定义样式 ID */
  styleId?: string
}
```

- **坐标系问题**：百度瓦片使用 BD09 坐标系 + 自有瓦片编号体系，与标准 TMS/Google 不同。
- 百度瓦片 URL 模板：`https://shangetu{s}.map.bdimg.com/it/u=x={x};y={y};z={z};v=009;type=sate&fm=46`
  - 子域名 `0-2`
- **设计选择**：使用自定义 `BaiduTilingScheme`（放 `core/src/util/baidu.ts`），覆写 `tileXYToNativeURL` 实现百度瓦片坐标转换。
- `maximumLevel` 默认 19
- ⚠️ **已知限制**：百度 BD09 坐标系精确转换是已知难点。第一版先支持百度瓦片渲染（瓦片编号转换），BD09->WGS84 图元坐标偏移修正属坐标转换工具函数范畴，后续迭代补充。

#### 4.2.3 AmapLayer（高德地图）

```typescript
type AmapLayerType = 'img' | 'vec' | 'road' | 'label' | 'traffic'

interface AmapLayerOptions extends BaseLayerOptions {
  /** 高德地图 key（可选） */
  key?: string
  /** 图层类型 */
  type?: AmapLayerType // 默认 'img'
}
```

- 高德瓦片使用 GCJ02 坐标系，但瓦片服务支持标准 TMS 坐标（`x/y/z` 直接使用），瓦片渲染不会错位。
- 影像 URL 模板：`https://webst0{s}.is.autonavi.com/appmaptile?style=6&x={x}&y={y}&z={z}`
  - `style=6` 影像，`style=7` 矢量路网，`style=8` 标注
  - 子域名 `1-4`
- 矢量底图 URL 模板：`https://webrd0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}`
- `maximumLevel` 默认 20
- ⚠️ **GCJ02 偏移**：高德瓦片直接用标准 TMS 渲染不会错位，但叠加 WGS84 坐标图元时会出现 ~50-500m 偏移。偏移修正属坐标转换工具函数范畴，不在图层本身处理。

#### 4.2.4 GoogleLayer（谷歌地图）

```typescript
type GoogleLayerType = 'img' | 'vec' | 'ter' | 'road' | 'label'

interface GoogleLayerOptions extends BaseLayerOptions {
  /** 图层类型 */
  type?: GoogleLayerType // 默认 'img'
  /** 语言（默认 zh-CN） */
  language?: string
  /** 区域（默认 CN） */
  region?: string
}
```

- 影像 URL 模板：`https://mt{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}&hl={language}&gl={region}`
  - `lyrs=s` 影像，`lyrs=m` 矢量路网，`lyrs=h` 标注，`lyrs=p` 地形
  - 子域名 `0-3`
- `maximumLevel` 默认 20
- 无需 API key
- ⚠️ 谷歌瓦片服务在国内可能无法直接访问，文档标注网络限制

#### 4.2.5 OsmLayer（OpenStreetMap）

```typescript
interface OsmLayerOptions extends BaseLayerOptions {
  /** 自定义瓦片服务器 URL（默认官方） */
  url?: string
  /** 自定义子域名（默认 a/b/c） */
  subdomains?: string[]
}
```

- 默认 URL：`https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png`
  - 子域名 `a/b/c`
- `maximumLevel` 默认 19
- `credit` 默认 `'OpenStreetMap contributors'`

#### 4.2.6 BingLayer（Bing Maps）

```typescript
type BingLayerType = 'aerial' | 'road' | 'collins' | 'hybrid'

interface BingLayerOptions extends BaseLayerOptions {
  /** Bing Maps API key（必填） */
  key: string
  /** 图层类型 */
  type?: BingLayerType // 默认 'aerial'
  /** culture（默认 zh-CN） */
  culture?: string
}
```

- 使用 Cesium `BingMapsImageryProvider`（非 `UrlTemplateImageryProvider`）
- 直接 `extends BaseLayer`，不走 `UrlTemplateLayer`
- Cesium 1.120 的 `BingMapsImageryProvider` 构造函数返回即用（内部异步加载元数据，瓦片请求会等待），`addToMap` 可同步添加 `ImageryLayer`
- `credit` 默认 `'Bing Maps'`

#### 4.2.7 ArcGisLayer（ArcGIS Server）

```typescript
interface ArcGisLayerOptions extends BaseLayerOptions {
  /** ArcGIS MapServer URL */
  url: string
  /** 是否使用瓦片模板直连模式（默认 false，走 fromUrl 异步元数据） */
  useTileTemplate?: boolean
  /** useTileTemplate=true 时的最大层级 */
  maximumLevel?: number
}
```

- **模式一**（默认，`useTileTemplate=false`）：使用 `ArcGisMapServerImageryProvider.fromUrl(url)`（异步），获取服务元数据后创建 provider。
- **模式二**（`useTileTemplate=true`）：直接用瓦片模板 `new UrlTemplateImageryProvider({ url: '${url}/tile/{z}/{y}/{x}' })`，同步构造，跳过元数据请求。
- ⚠️ `fromUrl` 模式下 `addToMap` 需处理异步。设计选择：`useTileTemplate=true` 时内部委托 `UrlTemplateLayer` 逻辑；`useTileTemplate=false` 时独立实现异步 provider 创建。

### 4.3 basemapsLayer 配置项落地

#### 4.3.1 类型定义（与 layer 统一为 { type, options } 结构）

`basemapsLayer` 与 `layer` 使用**同一套 `LayerInitItem` 判别联合**（§4.4），底图选择器专用字段（`name`/`iconUrl`/`tooltip`）作为可选扩展：

```typescript
/** 底图项：LayerInitItem + 底图选择器专用字段 */
interface BasemapItem extends LayerInitItem {
  /** 显示名称（baseLayerPicker 列表展示，缺省取图层实例的 name） */
  name?: string
  /** 图标 URL（baseLayerPicker 缩略图，缺省用 Cesium 内置图标） */
  iconUrl?: string
  /** tooltip 描述 */
  tooltip?: string
}
```

- `type` + `options` 与 `LayerInitItem` 完全一致（`{ type: 'tdt', options: TdtLayerOptions }` 等）。
- `name`/`iconUrl`/`tooltip` 为底图选择器专用可选字段；缺省时由 Map3D 内部从图层实例的 `options.name` 或 `type` 推导。

#### 4.3.2 Map3D 构造函数消费逻辑

```typescript
// Map3D 构造函数内部（伪代码）
constructor(options: Map3DOptions) {
  const viewerOptions: Viewer.ConstructorOptions = { ...options.viewerOptions }

  // basemapsLayer 与 layer 统一走 createLayerFromInitItem 创建图层实例
  if (options.basemapsLayer?.length) {
    const basemapLayers = options.basemapsLayer.map(item => {
      const layer = createLayerFromInitItem(item) // 统一工厂
      return { item, layer }
    })

    // 组装 ProviderViewModel（底图选择器列表）
    const viewModels = basemapLayers.map(({ item, layer }) =>
      new ProviderViewModel({
        name: item.name ?? (layer as { name?: string }).name ?? item.type,
        iconUrl: item.iconUrl ?? defaultIconUrl,
        tooltip: item.tooltip ?? '',
        creationFunction: () => {
          // 图层已创建，从实例上取 provider
          layer._bind(this._viewer, this._eventBus)
          layer.addToMap()
          return (layer as { _provider: unknown })._provider
        },
      })
    )
    viewerOptions.imageryProviderViewModels = viewModels
    viewerOptions.selectedImageryProviderViewModel = viewModels[0]

    // 首项作为默认底图（同步创建，确保地球初始即有影像）
    const firstLayer = basemapLayers[0].layer
    firstLayer._bind(/* viewer 尚未创建，需延迟 */)
    // 注：baseLayer 需在 Viewer 构造前提供 ImageryLayer，
    // 实际实现中 firstLayer 的 provider 在 Viewer 构造前同步创建
    viewerOptions.baseLayer = new ImageryLayer(
      (firstLayer as { _provider: unknown })._provider
    )
  }

  // 兜底：未传 basemapsLayer 且未配 baseLayer -> OSM
  if (!viewerOptions.baseLayer && viewerOptions.baseLayerPicker !== false) {
    viewerOptions.baseLayer = new ImageryLayer(
      new OpenStreetMapImageryProvider({ url: 'https://tile.openstreetmap.org/' })
    )
  }

  this._viewer = new Viewer(options.container, viewerOptions)
}
```

> **实现说明**：`basemapsLayer` 的每个项先经 `createLayerFromInitItem` 创建图层实例（与 `layer` 走同一个工厂），再从实例上取 `name`/`_provider` 等组装 `ProviderViewModel`。底图选择器切换时，`creationFunction` 内部做 `_bind` + `addToMap`，复用图层生命周期。

#### 4.3.3 内置底图预设

提供 `basemaps` 工厂函数集合（放 `core/src/util/basemap.ts`），返回 `BasemapItem`（`{ type, options, name?, iconUrl?, tooltip? }`）：

```typescript
/** 内置底图工厂（返回 BasemapItem，结构与 layer 配置项一致） */
const basemaps = {
  tdtImagery: (token: string): BasemapItem => ({
    type: 'tdt',
    options: { token, type: LayerType.IMG },
    name: '天地图影像',
  }),
  arcgisImagery: (): BasemapItem => ({
    type: 'arcgis',
    options: {
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      maximumLevel: 18,
    },
    name: 'ArcGIS World Imagery',
  }),
  osm: (): BasemapItem => ({
    type: 'osm',
    options: {},
    name: 'OpenStreetMap',
  }),
  googleImagery: (): BasemapItem => ({
    type: 'google',
    options: { type: LayerType.IMG },
    name: '谷歌影像',
  }),
  amapImagery: (): BasemapItem => ({
    type: 'amap',
    options: { type: LayerType.IMG },
    name: '高德影像',
  }),
  baiduImagery: (ak?: string): BasemapItem => ({
    type: 'baidu',
    options: { ak, type: LayerType.IMG },
    name: '百度影像',
  }),
  bingImagery: (key: string): BasemapItem => ({
    type: 'bing',
    options: { key, type: BingLayerType.AERIAL },
    name: 'Bing 影像',
  }),
}
```

使用示例（与 layer 配置项结构完全一致）：

```typescript
import { Map3D, basemaps } from '@globalmap/core'

const map = new Map3D({
  container: 'map',
  basemapsLayer: [basemaps.arcgisImagery(), basemaps.osm(), basemaps.tdtImagery('your-token')],
  layer: [
    { type: 'tdt', options: { token: 'your-token', type: 'cia' } }, // 影像注记叠加
    { type: 'graphic', options: { id: 'gl-1' } },
  ],
})
```

> **统一后消费者只需学一套 `{ type, options }` 配置结构**，`basemapsLayer` 和 `layer` 的区别仅为：`basemapsLayer` 额外接受 `name`/`iconUrl`/`tooltip`（底图选择器专用），且首项作为默认底图。

### 4.4 LayerInitItem 具体化

```typescript
/** 初始化图层项：判别联合，按 type 区分图层种类（layer 与 basemapsLayer 共用） */
type LayerInitItem =
  | { type: 'tdt'; options: TdtLayerOptions }
  | { type: 'baidu'; options: BaiduLayerOptions }
  | { type: 'amap'; options: AmapLayerOptions }
  | { type: 'google'; options: GoogleLayerOptions }
  | { type: 'osm'; options: OsmLayerOptions }
  | { type: 'bing'; options: BingLayerOptions }
  | { type: 'arcgis'; options: ArcGisLayerOptions }
  | { type: 'graphic'; options: GraphicLayerOptions }
// 后续新增图层类型在此扩展
```

Map3D 构造函数中消费 `layer` 配置（`map3d:ready` 之前按序 addLayer）：

```typescript
if (options.layer?.length) {
  for (const item of options.layer) {
    const layer = createLayerFromInitItem(item)
    this._layer.addLayer(layer)
  }
}
```

```typescript
/** 图层工厂：根据 LayerInitItem 创建对应图层实例（放 core/src/util/layerFactory.ts）
 *  layer 与 basemapsLayer 共用此工厂 */
function createLayerFromInitItem(item: LayerInitItem): BaseLayer {
  switch (item.type) {
    case 'tdt':
      return new TdtLayer(item.options)
    case 'baidu':
      return new BaiduLayer(item.options)
    case 'amap':
      return new AmapLayer(item.options)
    case 'google':
      return new GoogleLayer(item.options)
    case 'osm':
      return new OsmLayer(item.options)
    case 'bing':
      return new BingLayer(item.options)
    case 'arcgis':
      return new ArcGisLayer(item.options)
    case 'graphic':
      return new GraphicLayer(item.options)
    default:
      throw new Error(`[GlobalMap] 未知图层类型: ${(item as { type: string }).type}`)
  }
}
```

### 4.5 全局 Key 管理（core/src/util/keys.ts）

第三方图层（天地图 token、百度 AK、高德 key、Bing key 等）若未在图层 options 中显式传入，则从全局 key 存储中读取对应厂商的 key。

```typescript
/** 全局 key 存储 */
const globalKeys: Record<string, string> = {}

/** 设置全局地图厂商 key（在 new Map3D 之前调用） */
function setMapKey(provider: string, key: string): void {
  globalKeys[provider] = key
}

/** 读取全局 key（图层 token 缺省时调用） */
function getMapKey(provider: string): string | undefined {
  return globalKeys[provider]
}
```

- `provider` 参数为厂商标识：`'tdt'` / `'baidu'` / `'amap'` / `'google'` / `'bing'` / `'arcgis'`。
- 各图层子类构造时：`const token = options.token ?? getMapKey('tdt')`。
- 使用示例：

```typescript
import { setMapKey, TdtLayer } from '@globalmap/core'

// 全局设置一次
setMapKey('tdt', 'your-tianditu-token')
setMapKey('bing', 'your-bing-key')

// 后续创建图层无需再传 token
const tdt = new TdtLayer({ type: LayerType.IMG })
```

- `setMapKey` / `getMapKey` 经 `util/index.ts` 导出，作为公共 API 供消费者使用。

### 4.6 chinaCRS 坐标系处理

Cesium 引擎默认坐标系为 WGS84。不同厂商瓦片使用不同坐标系，需在图层层面处理瓦片坐标转换，否则会出现瓦片错位。

| chinaCRS        | 厂商                        | 坐标系           | 处理策略                                                                                                              |
| --------------- | --------------------------- | ---------------- | --------------------------------------------------------------------------------------------------------------------- |
| `WGS84`（默认） | 天地图、OSM、ArcGIS、Google | WGS84 Web 墨卡托 | 无需处理，Cesium 默认支持                                                                                             |
| `GCJ02`         | 高德                        | GCJ02 火星坐标系 | 瓦片渲染正常（TMS 编号一致）；图元坐标偏移修正由坐标转换工具函数处理（`gcj02ToWgs84` / `wgs84ToGcj02`，放 core/util） |
| `BD09`          | 百度                        | BD09 百度坐标系  | **瓦片坐标转换**（百度自有瓦片编号体系，与标准 TMS 不同）+ 图元坐标偏移修正                                           |

#### BD09 完整解决方案（第一版必须实现）

百度瓦片使用 BD09 坐标系 + 自有瓦片编号体系（非标准 TMS/Google），直接请求会出现严重错位。第一版必须解决：

1. **BaiduTilingScheme**（`core/src/util/baidu.ts`）：继承 `Cesium.TilingScheme`，覆写 `tileXYToNativeURL` / `positionToTileXY` 等方法，实现标准 TMS 坐标 <-> 百度瓦片坐标的转换。
   - 百度瓦片坐标转换算法基于 BD09 墨卡托投影，涉及非线性变换。
   - 参考实现：Mars3D `BaiduCoordTransformer` / Cesium-Plugin 社区方案。

2. **BD09 <-> WGS84 坐标转换工具**（`core/src/util/coordTransform.ts`）：
   - `bd09ToWgs84(lng, lat)` / `wgs84ToBd09(lng, lat)`
   - `gcj02ToWgs84(lng, lat)` / `wgs84ToGcj02(lng, lat)`
   - `bd09ToGcj02(lng, lat)` / `gcj02ToBd09(lng, lat)`
   - 纯数学计算（不依赖 Cesium），但归 core/util（因为会被图元、坐标拾取等场景调用）。

3. **BaiduLayer 中 chinaCRS 联动**：构造时若 `chinaCRS === ChinaCRS.BD09`（或默认 BD09），注入 `BaiduTilingScheme` 到 provider 的 `tilingScheme` 字段。

> **设计决策**：chinaCRS 在图层 options 中声明，由图层内部决定是否注入自定义 TilingScheme。坐标转换工具函数独立放 core/util，供图元域、标绘域等复用。常量 `ChinaCRS` 放 `type/constants.ts`（§3.3），跨域共享。

## 5. 文件规划

```
packages/core/src/
├── layer/
│   ├── BaseLayer.ts              (已有，不改)
│   ├── GraphicLayer.ts           (已有，不改)
│   ├── LayerManager.ts           (已有，不改)
│   ├── UrlTemplateLayer.ts       (新增，内部基类，不经 index.ts 导出)
│   ├── TdtLayer.ts               (重写空文件)
│   ├── BaiduLayer.ts             (新增)
│   ├── AmapLayer.ts              (新增)
│   ├── GoogleLayer.ts            (新增)
│   ├── OsmLayer.ts               (新增)
│   ├── BingLayer.ts              (新增)
│   ├── ArcGisLayer.ts            (新增)
│   ├── index.ts                  (更新导出)
│   └── __tests__/               (新增全部测试)
├── type/
│   ├── constants.ts             (新增：ChinaCRS / LayerType / BingLayerType 枚举)
│   ├── layer.ts                  (更新：UrlTemplateLayerOptions[内部] + 各图层 Options[导出])
│   ├── map.ts                    (更新：LayerInitItem 判别联合 + BasemapItem 具体化)
│   └── index.ts                  (更新导出)
├── util/
│   ├── baidu.ts                  (新增：BaiduTilingScheme，BD09 瓦片坐标转换)
│   ├── coordTransform.ts         (新增：bd09/gcj02/wgs84 互转工具函数)
│   ├── basemap.ts                (新增：内置底图预设工厂)
│   ├── layerFactory.ts           (新增：LayerInitItem -> 图层实例工厂)
│   ├── keys.ts                   (新增：全局 key 管理 setMapKey/getMapKey)
│   └── index.ts                  (更新导出)
├── map/
│   └── Map3D.ts                  (更新：构造函数消费 basemapsLayer + layer 配置)
└── index.ts                      (更新：导出 basemaps 工厂)
```

## 6. Cesium mock 扩充

当前 `__mocks__/cesium.ts` 缺少图层相关类，需按需扩充（禁止全量 mock，YAGNI）：

```typescript
// 新增到 __mocks__/cesium.ts
export class UrlTemplateImageryProvider {
  url: string
  constructor(config: Record<string, unknown>) {
    this.url = config.url as string
  }
}

export class ImageryLayer {
  show = true
  alpha = 1.0
  brightness = 1.0
  contrast = 1.0
  hue = 0.0
  saturation = 1.0
  gamma = 1.0
  nightAlpha = 1.0
  dayAlpha = 1.0
  constructor(public provider: unknown) {}
}

export class BingMapsImageryProvider {
  constructor(public config: Record<string, unknown>) {}
}

export class ArcGisMapServerImageryProvider {
  static fromUrl = vi.fn().mockResolvedValue(new ArcGisMapServerImageryProvider({}))
  constructor(public config: Record<string, unknown>) {}
}

export class OpenStreetMapImageryProvider {
  constructor(public config: Record<string, unknown>) {}
}

export class ProviderViewModel {
  constructor(public config: Record<string, unknown>) {}
}

// Viewer mock 中补充 imageryLayers
export class Viewer {
  // ... 已有字段 ...
  imageryLayers = {
    addImageryLayer: vi.fn((layer: ImageryLayer) => layer),
    remove: vi.fn(),
  }
}
```

## 7. 测试策略

| 测试对象            | 测试要点                                                                                                                    | 环境         |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------- | ------------ |
| UrlTemplateLayer    | addToMap 创建 provider+imageryLayer 并挂到 viewer.imageryLayers；removeFromMap 清理；_updateShow 联动；_buildUrl token 替换 | jsdom + mock |
| TdtLayer            | URL 模板正确（type 映射）；token 替换；子域名 0-7；maximumLevel 18                                                          | jsdom + mock |
| BaiduLayer          | URL 模板正确；BaiduTilingScheme 注入                                                                                        | jsdom + mock |
| AmapLayer           | URL 模板正确（type -> style 映射）；子域名 1-4                                                                              | jsdom + mock |
| GoogleLayer         | URL 模板正确（type -> lyrs 映射）                                                                                           | jsdom + mock |
| OsmLayer            | 默认 URL 正确；自定义 URL 透传；子域名 a/b/c；maximumLevel 19                                                               | jsdom + mock |
| BingLayer           | 构造 BingMapsImageryProvider；key 传入；type 映射                                                                           | jsdom + mock |
| ArcGisLayer         | fromUrl 异步模式；useTileTemplate 同步模式                                                                                  | jsdom + mock |
| basemaps 工厂       | 各工厂返回正确的 BasemapItem 结构；creationFunction 返回 provider                                                           | jsdom + mock |
| layerFactory        | 各 type 分发正确；未知 type 抛错                                                                                            | jsdom + mock |
| Map3D basemapsLayer | 传入 basemapsLayer 后 viewerOptions 含 imageryProviderViewModels + baseLayer；首项为默认底图                                | jsdom + mock |
| Map3D layer 初始化  | 传入 layer 数组后各图层被 addLayer；layer 工厂分发正确                                                                      | jsdom + mock |

## 8. 已知限制与后续迭代

| 限制                    | 说明                                                                      | 后续计划                                   |
| ----------------------- | ------------------------------------------------------------------------- | ------------------------------------------ |
| 百度 BD09 坐标系        | BaiduTilingScheme + coordTransform 工具函数已设计（§4.6），第一版必须实现 | 算法复杂度高，需充分测试                   |
| 高德 GCJ02 偏移         | 瓦片渲染正常；GCJ02<->WGS84 坐标转换工具已设计（§4.6 coordTransform）     | 图元偏移修正由图元域调用转换工具实现       |
| 谷歌瓦片国内可访问性    | 国内网络可能无法直接访问 google.com 瓦片服务器                            | 文档标注，用户自行代理                     |
| Bing provider 异步      | Cesium 1.120 BingMapsImageryProvider 构造即用，但元数据异步加载           | 无需额外处理                               |
| ArcGIS fromUrl 网络依赖 | fromUrl 需请求 MapServer 元数据，网络不稳会失败                           | 提供 useTileTemplate 直连模式              |
| 图层视觉属性            | alpha/brightness/contrast/hue/saturation/gamma/nightAlpha/dayAlpha 已实现 | LayerManager 后续可补充运行时动态修改      |
| 图层排序                | zIndex 通过 imageryLayers.raise/lower 实现                                | LayerManager 后续补充 setZIndex 运行时调整 |
| WMS/WMTS 图层           | 本次不实现 OGC 标准图层                                                   | 后续迭代                                   |

## 9. 用户使用示例

### 9.1 声明式初始化（构造函数配置）

```typescript
import { Map3D, basemaps } from '@globalmap/core'

const map = new Map3D({
  container: 'map',
  basemapsLayer: [basemaps.arcgisImagery(), basemaps.osm(), basemaps.tdtImagery('your-token')],
  layer: [
    { type: 'tdt', options: { token: 'your-token', type: 'cia' } }, // 影像注记叠加
    { type: 'graphic', options: { id: 'gl-1' } }, // 空白图元图层
  ],
})
```

### 9.2 命令式 API（运行时增删）

```typescript
import { Map3D, TdtLayer, OsmLayer } from '@globalmap/core'

const map = new Map3D({ container: 'map' })

// 运行时添加图层
const tdt = new TdtLayer({ token: 'your-token', type: 'img' })
map.layer.addLayer(tdt)

const osm = new OsmLayer()
map.layer.addLayer(osm)

// 控制可见性
osm.show = false

// 移除
map.layer.removeLayer(osm.id)

// 销毁地图时级联清理全部图层
map.destroy()
```

### 9.3 BasicMap 简化（basemapsLayer 替代手写 viewerOptions）

```typescript
// 改造前（BasicMap.vue 中手写 viewerOptions）
const map = new Map3D({
  container: 'map-container',
  viewerOptions: {
    infoBox: false, geocoder: false,
    baseLayer: new ImageryLayer(new UrlTemplateImageryProvider({ url: arcgisTileUrl, ... })),
    imageryProviderViewModels: [...],
    selectedImageryProviderViewModel: ...,
  },
})

// 改造后（basemapsLayer 声明式配置）
const map = new Map3D({
  container: 'map-container',
  viewerOptions: { infoBox: false, geocoder: false },
  basemapsLayer: [
    basemaps.arcgisImagery(),
    basemaps.osm(),
  ],
})
```
