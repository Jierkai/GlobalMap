# GlobalMap

基于 Cesium 二次封装的开源三维地图库，定位为 **Mars3D 的开源替代方案**。采用组合式架构（组合优于继承），避免 Mars3D 继承式架构导致的子类臃肿问题；功能上对标 Mars3D，覆盖图层、图元、标绘、测量、漫游、特效、材质、空间分析、坐标转换、UI 控件、资源加载、场景管理等能力域。

> 本文档面向人类开发者与 AI 编程助手（如 Hermes），目标是让阅读者在不翻阅全部源码的情况下快速建立工程全貌，安全地开展下一步功能开发。

---

## 1. 技术栈

| 项目     | 选型                                       | 说明                                                |
| -------- | ------------------------------------------ | --------------------------------------------------- |
| 包管理   | pnpm 9.15 workspace                        | 内部依赖一律 `workspace:*`                          |
| 语言     | 纯 TypeScript 5.4                          | core 框架无关；示例用 Vue3 演示                     |
| 引擎     | Cesium `>=1.120.0 <1.124.0`                | core 的 **peerDependencies**，构建时 external       |
| 模块格式 | ESM only                                   | 利于 tree-shaking                                   |
| 构建     | Vite build mode（core 含 vite-plugin-dts） | example 用 vite-plugin-cesium                       |
| 测试     | Vitest（各包独立配置）                     | core 用 jsdom + Cesium 最小 mock；shared 用 node    |
| 版本发布 | Changesets                                 | 仅 core / shared 参与版本；example / docs 已 ignore |
| 规范     | ESLint 9 flat config + Prettier            | 根目录统一配置                                      |
| 提交钩子 | husky + lint-staged                        | pre-commit 自动 eslint --fix / prettier             |
| Node     | >= 18                                      | 根 package.json engines                             |

## 2. 仓库结构

```
GlobalMap/
├── packages/
│   ├── core/        # @globalmap/core —— 核心地图库（纯 TS、框架无关）
│   ├── shared/      # @globalmap/shared —— 纯函数工具（format/math/download/validate）
│   ├── example/     # @globalmap/example —— Vue3 案例演示（private，不发版）
│   └── docs/        # @globalmap/docs —— VitePress 文档站（private，不发版）
├── scripts/         # build.mjs / dev.mjs 根编排脚本
├── docs/superpowers/specs/  # 设计与计划文档（见 §7）
├── eslint.config.js / tsconfig.base.json / .changeset/
└── .husky/pre-commit
```

`core/src` 按**领域**组织，能力域 Manager 共 8 个：

```
map/        Map3D 根类（组合入口）
event/      EventBus 事件系统
layer/      图层管理（含 GraphicLayer / PrimitiveLayer：图层管理图元）
graphic/    业务图元（BaseGraphic 及 Entity 系实现，由 GraphicLayer 持有，无 Manager）
primitive/  底层图元（Primitive 系点/线/面图元实现，由 PrimitiveLayer 持有，无 Manager）
plot/       标绘            measure/    测量
roam/       漫游            effect/     特效
analyse/    空间分析    control/    UI 控件
scene/      场景管理    type/       集中接口定义
material/   材质（工具，无 Manager）    transform/  坐标转换（工具，无 Manager）
resource/   资源加载（工具，无 Manager）    util/   core 内部工具（依赖 Cesium）
```

## 3. 核心架构与契约（修改代码前必读）

Map3D 构造时序：`resolveCesiumBaseUrl()`（自动识别）-> 创建 `Cesium.Viewer` -> 实例化 `EventBus` -> 实例化全部 **8 个 Manager**（layer / plot / measure / roam / effect / analyse / control / scene）-> 逐个 `Manager.init()` 建立跨域关联。

> **2026-07-27 设计定稿**：Base 类改**晚期绑定**、图元归 **GraphicLayer** 管理（删除全局 Graphic/Primitive Manager——原则：**图层/图元的管理一律归 layer 域，Manager 只管能力实例不管图元**）、构造改 **options 对象**（id 缺省 `generateId()`）、`Map3DOptions` 扩展 `layer`/`basemapsLayer` 及各域占位。**2026-07-28 追加**：`cesiumBaseUrl` **删除**，零配置自动识别。以下为定稿后的契约。

以下契约已有测试守护，**破坏即测试红**：

- **`map3d:ready` 微任务触发**：构造末尾 `queueMicrotask` 发出（在 8 个 Manager init 之后）。`new` 之后同步 `on` 订阅可收到；触发后再订阅收不到。不得因 Manager 增多而把 ready 提前。
- **销毁栈逆序**：Manager → Viewer →（emit `map3d:destroyed`）→ EventBus；单个回调异常 try-catch 兜底，不影响其余回调。
- **EventBus**：`on` 返回取消订阅函数；`void` 负载事件无参 emit；destroy 幂等，销毁后 emit 静默。
- **BaseLayer / BaseGraphic（晚期绑定）**：构造只收 **options 对象**（`id?` 缺省经 `generateId()` 随机生成、`show?` 声明初始可见性；BaseGraphic 的 options 内含必填 `style`，泛型 `<TStyle extends GraphicStyle>`）；不接触 map 内部。`viewer`/`eventBus` 在 `addLayer`/`addGraphic` 时由框架经 `_bind()` 注入。守卫：重复 bind 到不同 map 抛错；未 bind 触发依赖行为抛错。`show` setter 去重 → `_updateShow` → emit `*:showChanged`；destroy 幂等调 `removeFromMap`。
- **GraphicLayer（layer 域）**：`GraphicLayer extends BaseLayer`，是一种"装图元的图层"。`addGraphic/removeGraphic/getGraphic/hasGraphic/getAllGraphics` 链式；图层 `show`/`destroy` **级联**组内图元；图元事件（`graphic:added/removed/showChanged`）由所属 GraphicLayer 发出，负载带 `layerId`。**无 `map.graphic`**。
- **PrimitiveLayer（图元Layer，layer 域）**：`PrimitiveLayer extends BaseLayer`，与 GraphicLayer 平级，是 **Primitive 系图元的统一管理器**（承载 primitive/ 目录图元：PointPrimitive 点 / PolylinePrimitive 线 / PolygonPrimitive 面，基于 Cesium Primitive API）。**归属契约：图元先经 `addGraphic` 入图层，图层再经 `map.layer.addLayer` 入 map；图元不能直接添加到 Map 实例**（Map3D 无图元直挂 API）。`layer` 配置项支持 `{ type: 'primitive' }` 声明式初始化。
- **Cesium 静态资源（零配置）**：`Map3DOptions` **不暴露 `cesiumBaseUrl`**，库内部自动识别--① `window.CESIUM_BASE_URL` 已设（npm 依赖：vite-plugin-cesium / DefinePlugin 自动注入） > ② script 标签探测（lib 场景：Cesium.js 的 src 推导） > ③ 约定值 `/cesium` + dev 警告。npm 依赖装插件即零配置，lib 场景 script 引入即零配置。`setCesiumBaseUrl()` 已删除。
- **Map3DOptions 初始化配置**：含 `container`/`viewerOptions`，支持 `layer`（初始化图层集合）、`basemapsLayer`（Cesium 底图集合，首项默认）；`plot`/`measure`/`roam`/`effect`/`analyse`/`control`/`scene` 等未开发域先以 `Record<string, unknown>` 占位（`measure` 对齐 Mars3D thing 类），各域开发时再具体化。**Manager 充要条件：管理有生命周期的能力实例且依赖 viewer；不满足者降级为工具（material/transform/resource 已删）**。
- **Manager**：构造仅收 `(map3d, options?)`；方法返回 `this` 支持链式；`init()` 不暴露给用户。

## 4. 快速开始

```bash
pnpm install        # 安装（注意 §6 的 pnpm override 不可删）
pnpm dev            # 启动 example 开发服务器（BasicMap: /case/BasicMap）
pnpm test           # 全部包测试（当前 137 用例：core 94 + shared 43）
pnpm build          # 全部包构建（core dist 需保持 cesium 外置）
pnpm lint           # ESLint 全仓检查
pnpm changeset      # 变更集（发版流程：changeset → version → publish）
```

## 5. 工作进展

**当前阶段：骨架初始化 ✅ → Code Review ✅ → 设计定稿 ✅ → 批次 8 架构调整（移交实现）→ Finishing → 功能域开发**

- [x] Monorepo 骨架 35+1 任务全部完成（2026-07-24）：4 包识别、lint/prettier 0 问题、137 测试全绿、4 包构建通过、core dist external 验证（cesium 裸导入、0 Cesium 源码打入）、changeset status 仅 core/shared patch
- [x] BasicMap 端到端冒烟通过（2026-07-27）：`map3d:ready` 徽标、图层/图元增删显隐事件流全部正确；无 ion 网络环境下影像源方案落地（见 §6）
- [x] **Code Review 完成**（2026-07-27）：按 Superpowers SDD 输出 `.superpowers/sdd/review.md`（0 Critical / 1 Major / 8 Minor）；唯一 Major（core/shared 缺 `files: ["dist"]`）已修复（commit `c4634e6`/`eef06bb`）
- [x] **设计定稿**（2026-07-27）：架构方向调整定稿——Base 类晚期绑定 + options 构造（id 缺省 generateId）、图元归 GraphicLayer（删除全局 GraphicManager）、Map3DOptions 扩展 layer/basemapsLayer 及各域 Record 占位、BasicMap 改空演示、shared 新增 generateId。定稿见 design.md 顶部修订记录与 §5.6/§5.8/§5.9/§6.4
- [x] **批次 8 架构调整**（2026-07-27）：任务 36–40 全部完成——generateId（shared）→ Base 晚期绑定 + options 构造 → GraphicLayer（layer 域，级联显隐/销毁，graphic:\* 事件带 layerId）→ 删除全局 GraphicManager（13→12 getter）+ Map3DOptions 占位接线 → BasicMap 改空演示 + 整仓回归。159 测试全绿（shared 47 + core 112）、4 包构建通过、core dist external cesium 0 泄漏
- [ ] **批次 8 补充：删除全局 PrimitiveManager**（2026-07-27 二轮决策，plan.md §4.2 任务 41）：primitive 与 graphic 同理——**图层/图元的管理一律归 layer 域，Manager 只管能力实例不管图元**；删后 12→11 getter，`primitive/` 目录保留（未来放 Primitive 系图元实现，由 PrimitiveLayer 持有）
- [ ] **批次 8 补充 2：cesiumBaseUrl 删除 + 零配置自动识别**（2026-07-28 决策，plan.md §4.3 任务 42–43）：core 实现 `resolveCesiumBaseUrl()` 自动识别（全局已设 > script 探测 > 约定值 + 警告），删除 `setCesiumBaseUrl`；BasicMap 零配置验证，docs 改写为“零配置”
- [ ] **批次 8 补充 3：删除 material/transform/resource 三个 Manager**（2026-07-28 二轮审计，plan.md §4.4 任务 44）：Manager 充要条件是“管理有生命周期的能力实例且依赖 viewer”--材质是图元 style、坐标转换是纯计算、资源加载分散到各域；三者降级为工具，11->8 getter
- [ ] **Finishing 阶段**：收尾验收
- [x] **图层域：PrimitiveLayer（图元Layer）+ Primitive 系点/线/面图元**（2026-08-17）：`PrimitiveLayer extends BaseLayer`（layer 域，Primitive 系图元统一管理器，级联显隐/销毁，复用 graphic:\* 事件带 layerId）；primitive/ 目录落地 PointPrimitive / PolylinePrimitive / PolygonPrimitive（extends BaseGraphic，Cesium Primitive API 渲染，几何走 options、样式走 style）；`layer` 配置项新增 `{ type: 'primitive' }` 判别分支 + 工厂分发。308 测试全绿（shared 47 + core 261，含 Map3D 端到端级联守护）、4 包构建通过、example 新增 primitive-layer 案例页
- [ ] **功能域开发（待规划）**：图层域已完成（7 厂商瓦片图层 + basemapsLayer + GraphicLayer + PrimitiveLayer/点线面图元）；其余各域真实功能（Entity 系图元绘制、标绘、测量、漫游、特效、分析等）按设计文档 §5 签名逐个域实现，example 同步补充对应案例页，docs 同步补充 guide/api

## 6. 环境坑位（勿踩）

- **pnpm override 勿删**：根 package.json `pnpm.overrides` 钉住 `@zip.js/zip.js@2.7.73`——cesium@1.120 的 @cesium/engine 深导入 `lib/zip-no-worker.js`，zip.js 2.8.x 已删除该文件，删掉 override 会导致 dev 预打包崩溃。
- **无 ion 网络环境的 Viewer 配置**（本机网络访问不了 api.cesium.com，BasicMap 已落地，可直接复用）：Cesium 有三处隐式 ion 依赖——默认 `baseLayer`（ion asset 2）、`baseLayerPicker` 默认影像列表（初始化即请求 `/v1/assets/2/endpoint`，仅关 baseLayer 不够）、`geocoder`（IonGeocodeService）。彻底方案：`viewerOptions: { infoBox: false, geocoder: false, baseLayer: <自定义 ImageryLayer>, imageryProviderViewModels: [...], selectedImageryProviderViewModel: ... }`。
- **ArcGIS 影像用瓦片模板直连**：`ArcGisMapServerImageryProvider.fromUrl` 会先请求 `services.arcgisonline.com` 元数据，该端点不稳定会抛 RuntimeError；改用 `new UrlTemplateImageryProvider({ url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', credit: 'Esri', maximumLevel: 18 })`，同步构造、零元数据请求。
- **InfoBox 沙箱提示**：Chrome 控制台 "Blocked script execution in 'about:blank'..." 是 InfoBox 沙箱 iframe 的良性警告；不做实体点选的场景用 `viewerOptions: { infoBox: false }` 消除。
- **dev server 勿接 `| head` 管道**：head 退出会 SIGPIPE 杀掉服务器；vite ready ≠ 预打包完成，需 curl 触发模块链路确认。
- **类型验证以 `vite build` 为准**：未装 vue-tsc；core 的 vitest 用 `__mocks__/cesium.ts` 最小 mock（按需扩充，禁止全量 mock）。
- vite 异常退出会残留 `*.timestamp-*.mjs`（已入 .gitignore），定期清理即可。

## 7. 开发约定

- **工作流**：Superpowers SDD。设计/计划文档在 `docs/superpowers/specs/2025-01-21-globalmap-monorepo-{design,plan}.md`，实现不得偏离设计文档 §5 的签名定义；批次执行报告放 `.superpowers/sdd/`（gitignore，不入库）。
- **TDD**：红-绿-重构强制；每个原子任务一个 commit，消息格式 `feat(<scope>): <task n> <名称>`（修复用 `fix(<scope>):`）。
- **新增功能的标准动作**：core 域实现 + 测试 → example 增加对应案例页 → docs 补充 guide/api → changeset（仅 core/shared）。

## 8. 关键文件索引

| 内容                               | 位置                                                                               |
| ---------------------------------- | ---------------------------------------------------------------------------------- |
| 设计文档（架构与 §5 签名，已定稿） | `docs/superpowers/specs/2025-01-21-globalmap-monorepo-design.md`                   |
| 实施计划（35+1 任务 + 批次 8）     | `docs/superpowers/specs/2025-01-21-globalmap-monorepo-plan.md`                     |
| Map3D 根类                         | `packages/core/src/map/Map3D.ts`                                                   |
| 事件系统                           | `packages/core/src/event/EventBus.ts`                                              |
| 图层/图元基类                      | `packages/core/src/layer/BaseLayer.ts`、`packages/core/src/graphic/BaseGraphic.ts` |
| GraphicLayer（批次 8 新增）        | `packages/core/src/layer/GraphicLayer.ts`                                          |
| id 生成工具（批次 8 新增）         | `packages/shared/src/id.ts`（`generateId`）                                        |
| Cesium mock                        | `packages/core/__mocks__/cesium.ts`                                                |
| 空演示案例                         | `packages/example/src/views/cases/BasicMap.vue`                                    |
| 项目长期记忆（AI 助手维护）        | `.workbuddy/memory/MEMORY.md` + 按日日志                                           |

## License

MIT
