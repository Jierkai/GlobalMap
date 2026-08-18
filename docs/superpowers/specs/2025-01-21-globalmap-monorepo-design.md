# GlobalMap Monorepo 初始化设计文档

> **修订记录（2026-07-27，架构方向调整·设计定稿）**：
>
> 本版为**设计定稿**，供后续功能开发（移交实现方）遵循。相对骨架初版的调整：
>
> 1. **§5.6 Base 类改晚期绑定**：构造只收纯数据，不再构造注入 viewer/eventBus；`viewer`/`eventBus` 在 `map.addLayer()` 时经 `_bind()` 注入。动机：贴合 Mars3D 用户心智（`new TileLayer(opts)` → `map.addLayer(layer)`，创建与挂载分离），避免创建图层需探进 map 内脏；顺带使 `style.show` 初始值可在 bind 时同步。
> 2. **§5.6 构造签名改 options 对象**：`id` 移入 `options`，不传则经 `generateId()`（shared）随机生成；构造从位置参数改为 options 对象，便于扩展。
> 3. **新增 §5.8 GraphicLayer**：确立"图层管理图元"的 Mars3D 式归属模型；`GraphicLayer extends BaseLayer`（归 **layer 域**）管一组图元并级联显隐/销毁；图元事件由所属 GraphicLayer 发出（§5.4 EventMap 负载带 `layerId`）。
> 4. **删除 `map.graphic`**：图元统一由 GraphicLayer 管理，移除全局 GraphicManager。
> 5. **删除 `map.primitive`**（同日二轮追加，同理）：底层图元的管理同样是 layer 的事——`primitive/` 目录降级为 Primitive 系图元实现目录（图元类 extends BaseGraphic），未来新增 `PrimitiveLayer extends BaseLayer` 归 layer 域持有底层图元。至此能力域 getter 定为 **11 个**（§5.1）。
> 6. **新增 §5.9 Map3DOptions**：`Map3D` 构造项扩展 `layer`（初始化图层集合）与 `basemapsLayer`（Cesium 底图集合）；`measure`、`control` 等未开发能力域统一先以 `Record<string, unknown>` 占位配置项（primitive 不再单设，走 `layer` 集合的 type 判别），待各域开发时再具体化。
> 7. **BasicMap 演示改为空项目**：`example` 案例页降为空壳演示，不在快速开发阶段维护 Demo 闭环逻辑，避免拖累迭代。
> 8. **Manager 构造注入 `map3d` 保持不变**（注册表/生命周期/事件权威/跨域桥梁四角色所需）；能力实例（特效/分析/控件等）以插件形式 add 到对应 Manager 端口。
> 9. **`cesiumBaseUrl` 直接删除，零配置自动识别**（2026-07-28）：`Map3DOptions` 不再暴露 `cesiumBaseUrl`——库内部按"npm 依赖场景（打包器插件已设 `window.CESIUM_BASE_URL`）→ lib 场景（script 标签探测）→ 约定值 `/cesium` + dev 警告"自动识别，工程只服务 npm 依赖与 lib 两种消费场景，不支持自定义路径等边缘场景。动机：静态资源部署是工程问题，不该让消费者感知。
> 10. **删除 material / transform / resource 三个 Manager**（2026-07-28 二轮审计）：Manager 存在的充要条件是“管理**有生命周期的能力实例**且依赖 viewer 运行时”。材质是图元 style 属性（自定义材质注册 = 工具函数）；坐标转换是纯计算（不依赖 viewer、无 init/destroy）；资源加载分散到各域（加载归 layer/graphic，缓存 = 工具）。三者均不满足 Manager 充要条件，降级为 core/util 或 shared 工具函数，`map3d` 不暴露 getter。至此能力域 getter 定为 **8 个**（§5.1）。

>
> 11. **scene 域定稿 + 删除 `viewerOptions`**（2026-08-18 设计定稿，批次 9）：① `Map3DOptions` 具体化 `scene`（新增 §5.10 SceneOptions：初始视角/渲染/环境/光照/后处理/相机控制），`control` 已先行具体化为强类型；② **删除 `viewerOptions`**--公共 API 无透传兜底，UI 控件归 `control`、影像归 `basemapsLayer`、渲染参数归 `scene`，其余字段一律不支持；③ cesium peer 升至 `>=1.140.0`。

## 1. 项目背景

GlobalMap 是一个基于 Cesium 二次封装的三维地图库，定位为 Mars3D 的开源替代方案。

## 2. 核心目标

1. 功能对标 Mars3D，提供图层管理、图元、标绘、测量、漫游、特效、材质、空间分析、坐标转换、UI 控件、资源加载、场景管理等能力。
2. 完全开源，社区可参与修改与优化。
3. 组合式架构，通过模块化、可插拔的方式组织功能，避免 Mars3D 继承式架构导致的子类臃肿问题。
4. Monorepo 工程，包含核心库、示例、文档、共享工具包。

## 3. 技术选型

| 项目        | 选型                          | 说明                          |
| ----------- | ----------------------------- | ----------------------------- |
| 包管理器    | pnpm workspace                | 磁盘效率高，monorepo 生态成熟 |
| 核心库语言  | 纯 TypeScript                 | 框架无关，示例用 Vue3 演示    |
| Cesium 依赖 | peerDependencies              | 版本范围 `>=1.120.0 <1.124.0` |
| 模块格式    | ESM only                      | tree-shaking 最佳，现代标准   |
| 构建工具    | Vite build mode               | 配置简单，适合浏览器库        |
| 测试框架    | Vitest                        | 各包独立配置                  |
| 版本管理    | Changesets                    | 声明式版本发布                |
| 代码规范    | ESLint flat config + Prettier | 根目录统一配置                |
| 提交钩子    | husky + lint-staged           | 提交时自动 lint               |

## 4. 目录结构

```
GlobalMap/
├── package.json                 # 根工作区配置，含 lint-staged
├── pnpm-workspace.yaml          # pnpm 工作区声明
├── .npmrc                       # strict-peer-dependencies=false, auto-install-peers=true
├── tsconfig.base.json           # 共享 TS 配置
├── tsconfig.json                # 根引用配置
├── eslint.config.js             # ESLint flat config
├── .prettierrc                  # Prettier 配置
├── .changeset/config.json       # Changesets 配置
├── .husky/pre-commit            # 提交钩子
├── .gitignore
├── README.md
├── LICENSE
├── packages/
│   ├── core/                    # 核心地图库 @globalmap/core
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── vite.config.ts       # 含 vite-plugin-dts
│   │   ├── vitest.config.ts
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── map/             # Map3D 根类
│   │   │   ├── layer/           # 图层管理域（含 GraphicLayer、未来 PrimitiveLayer）
│   │   │   ├── graphic/         # 业务图元（BaseGraphic 及 Entity 系图元实现，无 Manager）
│   │   │   ├── primitive/       # 底层图元（Primitive 系图元实现，无 Manager）
│   │   │   ├── plot/            # 标绘域
│   │   │   ├── measure/         # 测量域
│   │   │   ├── roam/            # 漫游域
│   │   │   ├── effect/          # 特效域
│   │   │   ├── material/        # 材质域
│   │   │   ├── analyse/         # 空间分析域
│   │   │   ├── transform/       # 坐标转换域
│   │   │   ├── control/         # UI 控件域
│   │   │   ├── resource/        # 资源加载域
│   │   │   ├── scene/           # 场景管理域
│   │   │   ├── event/           # 事件系统
│   │   │   ├── util/            # core 内部工具（依赖 Cesium）
│   │   │   └── type/            # 集中接口定义
│   │   └── __mocks__/cesium.ts       # Cesium mock
│   ├── example/                 # 示例演示包 @globalmap/example
│   │   ├── package.json
│   │   ├── vite.config.ts       # 含 vite-plugin-cesium
│   │   ├── index.html
│   │   └── src/
│   │       ├── main.ts
│   │       ├── App.vue
│   │       ├── router/          # Vue Router
│   │       ├── views/
│   │       │   ├── Home.vue     # 导航页
│   │       │   └── cases/       # 独立案例页
│   │       └── env.d.ts
│   ├── docs/                    # 文档包 @globalmap/docs
│   │   ├── package.json
│   │   ├── .vitepress/config.ts
│   │   ├── guide/
│   │   └── api/
│   └── shared/                  # 共享工具包 @globalmap/shared
│       ├── package.json
│       ├── tsconfig.json
│       ├── vite.config.ts
│       ├── vitest.config.ts
│       └── src/
│           ├── index.ts
│           ├── download.ts
│           ├── format.ts
│           ├── math.ts          # 不依赖 Cesium 的数学工具
│           └── validate.ts
├── scripts/
│   ├── build.mjs
│   └── dev.mjs
└── docs/
    └── superpowers/specs/
```

## 5. 核心架构设计

### 5.1 组合式架构原则

- **无 Manager 继承链**：所有 Manager 不继承任何类，直接 `class XxxManager`
- **Base 类仅用于数据对象**：`BaseLayer`、`BaseGraphic` 只包含自身域最小公共属性，最多一层继承
- **Map3D 作为组合根**：通过 getter 暴露各能力域 Manager，如 `map3d.layer`、`map3d.effect`、`map3d.analyse`（共 **8 个**，详见 §5.1 末注）
- **Manager 间通信**：核心数据流直接调用 + 事件通知，扩展点纯事件

> **能力域清单（8 个 Manager）**：`layer` / `plot` / `measure` / `roam` / `effect` / `analyse` / `control` / `scene`。
> **Manager 存在的充要条件**：管理的是**有生命周期的能力实例**（创建 -> 状态变更 -> 销毁），且需依赖 viewer 运行时。不满足者不设 Manager，降级为工具函数。
> 注：① 原 `graphic`（全局 GraphicManager）已移除--图元统一由 `GraphicLayer`（一种图层，见 §5.8）管理；② 原 `primitive`（全局 PrimitiveManager）同理移除--底层图元由未来的 `PrimitiveLayer`（layer 域）持有；③ 原 `material`、`transform`、`resource` 三个 Manager 已删除--材质是图元 style 属性（自定义材质注册 = core/util 工具）、坐标转换是纯计算（纯数学放 shared、依赖 Cesium 的放 core/util）、资源加载分散到各域（缓存 = core/util 工具），均不满足 Manager 充要条件。**原则：图层/图元的管理一律归 layer 域；Manager 只管能力实例（插件），不管图元、不管纯计算、不管数据。**

### 5.2 Map3D 生命周期

```typescript
const map = new Map3D(options) // 构造函数内完成所有初始化
map.destroy() // 幂等销毁，逆序清理
```

- 构造函数分两个阶段：实例化所有 Manager → 自动调用 init() 建立跨域关联
- 销毁采用"显式注册 + 逆序销毁"：eventBus 最先注册、最后销毁
- 每个 destroy 回调 try-catch 兜底，单个失败不影响整体

### 5.3 Manager 设计

- 构造函数只接收 `map3d: Map3D` 和自身 `options`
- `init()` 建立跨域关联，不暴露给用户
- 方法返回 `this`，支持链式调用
- `destroy()` 同步清理所有资源

### 5.4 EventBus 强类型

```typescript
interface EventMap {
  'map3d:ready': void
  'map3d:destroyed': void
  'layer:added': { layer: BaseLayer }
  'layer:removed': { layerId: string }
  'layer:showChanged': { layerId: string; show: boolean }
  // GraphicLayer 模式：图元事件由所属 GraphicLayer 发，负载带 layerId 与图层事件同构
  'graphic:added': { layerId: string; graphic: BaseGraphic }
  'graphic:removed': { layerId: string; graphicId: string }
  'graphic:showChanged': { layerId: string; graphicId: string; show: boolean }
  'plot:drawEnded': { graphic: BaseGraphic }
  'measure:completed': { result: MeasureResult }
}
```

- 事件命名统一过去式：`domain:动作过去式`
- 新增事件必须在 `EventMap` 中显式声明
- 每个域只发自己域的事件，写操作事件由执行方内部触发

### 5.5 Disposable 与 Manager 接口

```typescript
interface Disposable {
  readonly destroyed: boolean
  destroy(): void
}

interface Manager extends Disposable {
  init(): void
}
```

- `Disposable` 是所有可销毁对象的统一契约
- `Manager` 接口约束所有域 Manager 必须实现 `init()` 和 `destroy()`
- `Map3D` 内部通过 `Manager[]` 管理所有 Manager 的销毁顺序

### 5.6 Base 类设计

```typescript
/** 图层构造项：id 可选，缺省时经 generateId() 随机生成 */
interface BaseLayerOptions {
  id?: string
  show?: boolean
  [key: string]: unknown // 各具体图层扩展自身的构造项
}

abstract class BaseLayer implements Disposable {
  abstract readonly type: string
  readonly id: string // 来自 options.id，缺省随机生成
  protected _show = true
  protected _destroyed = false
  protected _viewer?: Cesium.Viewer // 晚期绑定，addLayer 时注入
  protected _eventBus?: EventBus // 晚期绑定，addLayer 时注入

  constructor(options: BaseLayerOptions) {
    this.id = options.id ?? generateId()
  }

  get show(): boolean
  set show(value: boolean) // 去重检查 + _updateShow + emit
  get destroyed(): boolean

  /** 内部晚期绑定：addLayer 时由 LayerManager 调用，不暴露给用户 */
  _bind(viewer: Cesium.Viewer, eventBus: EventBus): void

  abstract addToMap(): void
  abstract removeFromMap(): void
  protected abstract _updateShow(show: boolean): void

  destroy(): void // 幂等，调用 removeFromMap
}
```

- **晚期绑定（late binding）**：构造函数只收纯数据（options 对象），不接触 map 内部；`viewer` / `eventBus` 在 `map.addLayer()` 时由框架经 `_bind()` 注入。用户侧为 Mars3D 心智：`const layer = new TileLayer({ url }); map.addLayer(layer)`。
- **options 对象 + id 自动生成**：构造从位置参数改为 options 对象；`id` 放入 options，缺省时经 `generateId()` 随机生成（见 §6.4，shared 提供）。`show` 亦可在 options 声明初始可见性。
- **守卫**：`_bind` 检测到已绑定到另一 map → 抛错；未 bind 时触发依赖 `viewer`/`eventBus` 的行为（如 `show` setter 发事件）→ 抛带明确信息的错。
- `show` setter 联动实际图层可见性；options/style 的 `show` 初始值在 `_bind` 时同步一次（解决样式声明与初始可见性一致性）。
- `BaseGraphic` 同模式：构造收 `(options: BaseGraphicOptions<TStyle>)`，泛型 `TStyle extends GraphicStyle`，options 内含必填 `style`；`id` 同样缺省随机生成。

### 5.7 Cesium 静态资源方案（零配置，自动识别）

`Map3DOptions` **不暴露 `cesiumBaseUrl`**；库内部自动识别 `CESIUM_BASE_URL`，工程只服务 npm 依赖与 lib 两种消费场景，不支持自定义路径等边缘场景。

```typescript
/** 自动识别：全局已设 > script 标签探测 > 约定值 + dev 警告 */
function resolveCesiumBaseUrl(): string {
  if (window.CESIUM_BASE_URL) return window.CESIUM_BASE_URL // ① npm 依赖：打包器插件已设
  const detected = detectFromScriptTag() // ② lib 场景：Cesium.js 的 src 推导目录
  if (detected) return detected
  console.warn(/* 未检测到，回退约定值，404 时引导装插件 */)
  return '/cesium' // ③ 约定值兜底
}
```

- **npm 依赖场景**（推荐）：消费者 `npm install cesium` + 装打包器插件，插件自动注入全局值，探测①命中。
  - Vite：`vite-plugin-cesium`（构建时 intro 注入 `window.CESIUM_BASE_URL`、dev 中间件 serve 静态目录、build 复制资源到 `cesium/`）；
  - Webpack：`copy-webpack-plugin` 复制静态资源 + `webpack.DefinePlugin({ CESIUM_BASE_URL: JSON.stringify('/cesium') })`；
- **lib 场景**：Cesium 拷入 public 目录 + `<script src=".../Cesium.js">`，探测②从 script 标签的 src 推导目录。
- `core` 构建时外置 `cesium`，不打包；`example` 用 `vite-plugin-cesium`，BasicMap 不传 `cesiumBaseUrl`（零配置验证）。
- `setCesiumBaseUrl()` **删除**--不再需要边缘场景函数。

注：Cesium 实际在首次创建 Worker / 加载资源时才读 `CESIUM_BASE_URL`，非模块加载时，因此构造时识别通常安全。

### 5.8 GraphicLayer：图层管理图元

Mars3D 式归属模型——图元不游离于全局，而是归属某个图层。`GraphicLayer` 归属 **layer 域**（`packages/core/src/layer/GraphicLayer.ts`），它本质是一种"装图元的图层"。

- `GraphicLayer extends BaseLayer`，是一种图层，内部持有一组 `BaseGraphic`。
- API：`addGraphic(graphic)` / `removeGraphic(id)` / `getGraphic(id)` / `hasGraphic(id)` / `getAllGraphics()`，方法返回 `this` 链式；内部对 graphic 做 `_bind`。
- **级联**：`GraphicLayer.show = false` → 组内全部图元 `_updateShow(false)`；`GraphicLayer.destroy()` → 级联销毁组内图元。
- **事件**：图元事件（`graphic:added/removed/showChanged`）由所属 GraphicLayer 经 eventBus 发出，负载带 `layerId`，与 `layer:*` 事件同构。
- **无全局 GraphicManager**：图元统一由 GraphicLayer 管理，**删除 `map.graphic`**；`map3d` 不再提供全局图元 Manager/门面（§5.1 能力域收为 8 个）。跨图层的图元检索如需支持，后续在 layer 域以只读聚合形式补充，不单设 Manager。

### 5.9 Map3DOptions 与初始化配置

`Map3D` 构造项含 `container` 及初始化配置；`cesiumBaseUrl` 不暴露（§5.7 自动识别）；`viewerOptions` 已删除（无透传兜底，见 §5.10）；未开发能力域先以 `Record<string, unknown>` 占位，待各域开发时再具体化为强类型。

```typescript
interface Map3DOptions {
  container: string | HTMLElement

  /** 初始化图层集合：构造完成后按序 addLayer */
  layer?: LayerInitItem[]
  /** Cesium 底图集合：作为 baseLayerPicker 的影像源列表，首项为默认底图 */
  basemapsLayer?: BasemapItem[]

  /** 场景配置（§5.10）：初始视角/渲染/环境/光照/后处理/相机控制 */
  scene?: SceneOptions

  // -- 以下为未开发能力域的占位配置项，先以 Record 占位 --
  control?: Record<string, unknown>
  plot?: Record<string, unknown>
  measure?: Record<string, unknown> // 对齐 Mars3D 的 thing 类（量算/分析实例集合）
  roam?: Record<string, unknown>
  effect?: Record<string, unknown>
  analyse?: Record<string, unknown>
}

/** 初始化图层项：图层未开发阶段先用 Record 占位，后续具体化为判别联合（按 type 区分图层种类） */
type LayerInitItem = Record<string, unknown>

/** 底图项：影像源配置（名称/类型/url/层级等），先用 Record 占位 */
type BasemapItem = Record<string, unknown>
```

- **占位原则**：`layer`/`basemapsLayer` 是骨架后首个开发域（图层），其元素类型先 `Record` 占位、图层开发时具体化；其余能力域的占位配置项同理——先声明 key 让 `Map3DOptions` 形状稳定，避免后续每开一个域就改构造签名。
- **插件式能力**：能力实例（某次测量、某条通视、某个控件）在对应域开发后，以 `map.<domain>.add(instance)` 形式挂到 Manager 端口；`measure` 域对齐 Mars3D 的 `thing` 类语义。

- **无兜底逃生舱（2026-08-18 新增原则）**：配置项不设透传兜底。未在类型中显式声明的功能即为不支持；禁止将引擎原生选项对象整体透传进公共 API，防止引擎类型泄漏。
- **`viewerOptions` 去向（2026-08-18 删除，破坏性变更）**：已知字段归属为--① UI 开关（infoBox / geocoder / baseLayerPicker / animation / timeline 等）归 `control` 域；② `baseLayer` / `imageryProviderViewModels` / `selectedImageryProviderViewModel` 归 `basemapsLayer` 内部机制；③ `requestRenderMode` / `maximumRenderTimeChange` / `resolutionScale` / `msaaSamples` 归 `scene`。其余无归属字段一律不支持（无 escape hatch）。

### 5.10 SceneOptions：场景配置（2026-08-18 定稿）

scene 域在 `Map3DOptions.scene` 上以强类型配置项暴露，分六组：初始视角 / 渲染 / 环境 / 光照 / 后处理 / 相机控制。字段语义与实现落点如下。

```typescript
export interface SceneOptions {
  /** 初始视角（初始化完成后、ready 事件前同步定位） */
  center?: SceneCenterOptions

  // ---------- 渲染 ----------
  showFps?: boolean            // 帧率面板，默认 false
  resolutionScale?: number     // 分辨率缩放 0.5~1.0，默认 1.0
  requestRenderMode?: boolean  // 按需渲染，默认 false；构造期生效
  maximumRenderTimeChange?: number // 空闲毫秒后进入按需渲染，默认 5000；构造期生效
  msaaSamples?: number         // 采样数 1/2/4/8，默认 1；构造期生效

  // ---------- 环境 ----------
  backgroundColor?: string     // 背景色（关天空盒后生效）
  showSkyBox?: boolean         // 星空背景，默认 true
  showSun?: boolean            // 太阳，默认 true
  showMoon?: boolean           // 月亮，默认 true
  showSkyAtmosphere?: boolean  // 大气层光晕，默认 true
  showFog?: boolean            // 地面雾效，默认 true
  showGlobe?: boolean          // 星球本体，默认 true

  // ---------- 光照（大气层光照模型） ----------
  enableLighting?: boolean     // 地表日照/昼夜半球，默认 false
  enableSunClock?: boolean     // 真实时间驱动太阳，默认 false
  lightIntensity?: number      // 大气层光照强度 0~2，默认 1.0；依赖 >=1.140 接口，挂载对象以 1.140 类型声明实测为准，无则删除该字段

  // ---------- 后处理 ----------
  // 预留区：brightness/nightVision 等全屏后处理后续追加；场景内特效对象归 effect 域
  bloom?: SceneBloomOptions

  // ---------- 相机控制 ----------
  cameraController?: SceneCameraControllerOptions
}

export interface SceneCenterOptions {
  lng: number                  // 经度（度）
  lat: number                  // 纬度（度）
  alt?: number                 // 高度（米），默认 1000
  heading?: number             // 航向（度，0=正北），默认 0
  pitch?: number               // 俯仰（度，0=垂直向下），默认 -90
  roll?: number                // 翻滚（度），默认 0
}

export interface SceneBloomOptions {
  enabled?: boolean            // 默认 true
  bloomIntensity?: number      // 强度 0~10，默认 0.9
  bloomRadius?: number         // 半径 0~10，默认 0.3
}

export interface SceneCameraControllerOptions {
  enableZoom?: boolean         // 默认 true
  enableRotate?: boolean       // 默认 true
  enableTilt?: boolean         // 默认 true
  minimumZoomDistance?: number // 默认 1
  maximumZoomDistance?: number // 默认不限
  inertiaSpin?: number         // 缩放惯性，默认 0.85
}
```

**实现落点**：

| 字段 | 落点 |
| --- | --- |
| center | ready 前 camera.setView（同步） |
| requestRenderMode / maximumRenderTimeChange / msaaSamples | 构造 Viewer 前合并进构造参数 |
| showFps | scene.debugShowFramesPerSecond |
| backgroundColor / showSkyBox / showSun / showMoon / showGlobe | scene 对应属性 |
| showSkyAtmosphere / showFog | scene.skyAtmosphere.show / scene.fog.enabled |
| enableLighting / enableSunClock / lightIntensity | 星球光照 + 时钟驱动；lightIntensity 以 1.140 实测为准 |
| bloom | scene.postProcessStages.bloom（enabled/intensity/radius） |
| cameraController | scene.screenSpaceCameraController 对应属性 |

- **生效时机**：构造期字段（requestRenderMode / maximumRenderTimeChange / msaaSamples）在 `new Viewer()` 前合并进构造参数；其余字段在 Viewer 构造后、`map3d:ready` 之前同步应用（center 用 camera.setView 同步定位，保证 ready 回调时视角已就位）。
- **依赖约束**：cesium peer `>=1.120.0 <1.124.0` 升至 `>=1.140.0`；zip.js override（钉住 2.7.73）在升级后实测，若 1.140 引擎不再深导入 `lib/zip-no-worker.js` 旧路径则删除，否则保留并记录原因。

## 6. 工程化配置

### 6.1 根 package.json 关键字段

```json
{
  "name": "globalmap",
  "private": true,
  "type": "module",
  "scripts": {
    "build": "pnpm -r build",
    "dev": "pnpm --filter @globalmap/example dev",
    "test": "pnpm -r test",
    "lint": "eslint .",
    "format": "prettier --write .",
    "changeset": "changeset",
    "version": "changeset version",
    "publish": "changeset publish"
  },
  "lint-staged": {
    "*.{ts,vue,js}": "eslint --fix",
    "*.{json,md}": "prettier --write"
  },
  "devDependencies": {
    "@changesets/cli": "^2.27.0",
    "@eslint/js": "^9.0.0",
    "eslint": "^9.0.0",
    "eslint-config-prettier": "^9.1.0",
    "eslint-plugin-vue": "^9.25.0",
    "husky": "^9.0.0",
    "lint-staged": "^15.2.0",
    "prettier": "^3.2.0",
    "typescript": "^5.4.0",
    "typescript-eslint": "^8.0.0"
  }
}
```

### 6.2 core package.json 关键字段

```json
{
  "name": "@globalmap/core",
  "type": "module",
  "sideEffects": false,
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    }
  },
  "peerDependencies": {
    "cesium": ">=1.120.0 <1.124.0"
  },
  "devDependencies": {
    "cesium": "1.120.0",
    "jsdom": "^24.0.0"
  }
}
```

### 6.3 依赖声明

所有包依赖统一使用 `workspace:*`：

```json
"dependencies": {
  "@globalmap/core": "workspace:*",
  "@globalmap/shared": "workspace:*"
}
```

### 6.4 shared 工具：generateId

`@globalmap/shared` 提供纯函数 `generateId()`，供 Base 类在 `options.id` 缺省时生成随机 id（见 §5.6）。

```typescript
/**
 * 生成随机 id：`<prefix>-<随机串>`。
 * 随机段基于 crypto.getRandomValues（浏览器/Node 18+ 均可用），不依赖 Cesium。
 */
export function generateId(prefix = 'gm'): string
```

- 纯函数、无依赖、可复用，归 shared（测试用 node 环境）。
- 默认前缀 `'gm'`；各域可传语义化前缀（如 `generateId('layer')`、`generateId('graphic')`）提升日志可读性。
- 碰撞风险在单 map 场景可忽略；`LayerManager.addLayer` 的重复 id 抛错仍是兜底防线。

## 7. 测试策略

- 各包独立配置 `vitest.config.ts`
- core 使用 `jsdom` 环境 + `__mocks__/cesium.ts` mock
- shared 使用 `node` 环境
- 每个能力域目录下配 `__tests__/` 子目录

## 8. 发布流程

1. `pnpm changeset` 填写变更描述
2. `pnpm version` 更新版本号
3. `pnpm publish -r` 发布所有包
4. `@globalmap/example` 和 `@globalmap/docs` 在 changeset 中 ignore，不发布
