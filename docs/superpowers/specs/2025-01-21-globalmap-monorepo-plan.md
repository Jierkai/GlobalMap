# GlobalMap Monorepo 初始化实现计划

> 配套设计文档：`docs/superpowers/specs/2025-01-21-globalmap-monorepo-design.md`（下称"设计文档"）
> 执行方式：Superpowers 子代理驱动开发，TDD（红-绿-重构）强制，3-5 个任务一批，批间人工检查点。
>
> **修订记录（2026-07-22，评审后修订）**：
>
> 1. 任务 13 补充 `util/` 目录占位说明（覆盖设计文档 §4 的 util/ 域），并新增任务 13.1。
> 2. 新增任务 13.1 实现 `setCesiumBaseUrl`（设计文档 §5.7 注），任务 24 导出、任务 32 文档引用，消除"文档写了代码没有"的脱节。
> 3. 任务 19 明确 `map3d:ready` 触发时机（全部初始化完成后）并补充 TDD 用例；任务 23 增加 ready 时序守护；任务 29 示例演示 ready 订阅。

## 0. 范围声明（YAGNI）

本计划只覆盖 **Monorepo 初始化**：工程脚手架 + 核心架构骨架（EventBus / Disposable / Manager / BaseLayer / BaseGraphic / Map3D）+ 端到端示例闭环。

明确**不做**（后续迭代再议）：

- 具体图层类型实现（TileLayer、GeoJsonLayer 等）
- 标绘算法、测量算法、漫游、特效、材质、空间分析的具体功能
- CI/CD、npm 实际发布、文档部署

## 1. 成功标准

1. `pnpm install` 全新安装成功，4 个包被 workspace 识别。
2. `pnpm -r build` 全部通过；`@globalmap/core` 与 `@globalmap/shared` 产出 ESM + d.ts，且 core 的 dist 中**不含** Cesium 源码（external 验证）。
3. `pnpm -r test` 全部通过（core 用 jsdom + Cesium mock，shared 用 node 环境）。
4. `pnpm lint` 与 `pnpm exec prettier --check .` 无错误。
5. `pnpm dev` 启动 example，浏览器打开案例页能看到 Cesium 地球，并通过 `map3d.layer` / `map3d.graphic` 完成一次添加-显示-移除闭环，控制台无报错。
6. `pnpm --filter @globalmap/docs dev` 可启动 VitePress。
7. `pnpm exec changeset status` 正常，example/docs 已被 ignore。
8. git 提交触发 husky pre-commit → lint-staged 生效。

## 2. 全局约定

- 所有包 `"type": "module"`，内部依赖一律 `workspace:*`。
- 每个 TDD 任务严格走红-绿-重构：**先写失败测试并运行确认失败 → 写最小实现 → 重构 → commit**。禁止先写实现。
- 每个任务完成后运行其"验证"命令，全绿才允许进入下一任务。
- 事件命名、EventMap、Base 类、Manager 契约等**以设计文档 §5 为唯一权威**，实现不得偏离其签名。
- 每次 commit 只包含一个红-绿-重构循环；commit message 格式 `feat(<scope>): <task n> <名称>`。

## 3. 批次划分（子代理执行 + 人工检查点）

| 批次   | 任务                  | 内容                                              | 检查点                             |
| ------ | --------------------- | ------------------------------------------------- | ---------------------------------- |
| 批次 1 | 任务 1-5              | 根工作区配置                                      | `pnpm install` 成功                |
| 批次 2 | 任务 6-10             | 工程化钩子 + shared 骨架与首批工具                | shared build/test 绿               |
| 批次 3 | 任务 11-15（含 13.1） | shared 收尾 + core 骨架、mock 与 setCesiumBaseUrl | core 空包 build 绿、core test 绿   |
| 批次 4 | 任务 16-20            | core 类型契约 + EventBus + Base 类 + Map3D        | core test 绿                       |
| 批次 5 | 任务 21-25            | Manager 接线 + core 产物验证                      | core build 绿、external 验证通过   |
| 批次 6 | 任务 26-30            | example 端到端闭环                                | 浏览器冒烟通过（**必须人工确认**） |
| 批次 7 | 任务 31-35            | docs + scripts + 整仓验收                         | 成功标准 1-8 全过                  |

---

## 4. 任务列表

### 任务 1：pnpm workspace 声明与环境

- 文件：
  - `pnpm-workspace.yaml`
  - `.npmrc`
  - `.gitignore`
- 描述：
  - `pnpm-workspace.yaml` 声明 `packages: ['packages/*']`。
  - `.npmrc` 写入 `strict-peer-dependencies=false`、`auto-install-peers=true`（设计文档 §4）。
  - `.gitignore` 覆盖：`node_modules`、`dist`、`*.local`、`.DS_Store`、`coverage`、`.vitepress/cache`、`.vitepress/dist`。
- 验证：`pnpm -v` 可用；三文件内容如上。
- 依赖：无
- 预计时间：2 分钟

### 任务 2：根 package.json

- 文件：`package.json`
- 描述：严格按设计文档 §6.1 写入（`name: globalmap`、`private: true`、`type: module`、全部 scripts、lint-staged 规则、全部 devDependencies）。额外加 `"packageManager": "pnpm@9.15.0"` 与 `"engines": { "node": ">=18" }`。
- 验证：`pnpm install` 成功，依赖解析无错。
- 依赖：任务 1
- 预计时间：3 分钟

### 任务 3：共享 TypeScript 配置

- 文件：
  - `tsconfig.base.json`
  - `tsconfig.json`
- 描述：
  - `tsconfig.base.json`：`target: ES2020`、`module: ESNext`、`moduleResolution: bundler`、`strict: true`、`declaration: true`、`skipLibCheck: true`、`isolatedModules: true`、`useDefineForClassFields: true`（Cesium 类字段语义必需）、`lib: ["ES2020", "DOM", "DOM.Iterable"]`。
  - 根 `tsconfig.json`：`"files": []` + `references` 指向各包（此时先留空数组，任务 8/14 中补齐）。
- 验证：`pnpm exec tsc --showConfig -p tsconfig.base.json` 正常输出 JSON。
- 依赖：任务 2
- 预计时间：3 分钟

### 任务 4：ESLint flat config + Prettier

- 文件：
  - `eslint.config.js`
  - `.prettierrc`
- 描述：
  - ESLint flat config：`@eslint/js` recommended + `typescript-eslint` recommended + `eslint-plugin-vue`（flat/essential）+ `eslint-config-prettier` 收尾关闭冲突规则；`ignores: ['**/dist/**', '**/coverage/**', '**/.vitepress/cache/**']`。
  - `.prettierrc`：`{ "semi": false, "singleQuote": true, "printWidth": 100, "trailingComma": "all" }`（全仓统一，后续所有代码按此风格）。
- 验证：`pnpm exec eslint .` 与 `pnpm exec prettier --check .` 均退出码 0（允许对现有 md 先跑一次 `--write`）。
- 依赖：任务 2
- 预计时间：5 分钟

### 任务 5：Changesets 配置

- 文件：`.changeset/config.json`
- 描述：`changeset init` 生成后修改：`"access": "public"`、`"baseBranch": "main"`、`"ignore": ["@globalmap/example", "@globalmap/docs"]`（设计文档 §8）。
- 验证：`pnpm exec changeset status` 正常输出（无 changeset 时提示为空，不报错）。
- 依赖：任务 2
- 预计时间：2 分钟

> **检查点 1**：`pnpm install` 成功；eslint/prettier/changeset 命令均可运行。

### 任务 6：husky pre-commit 钩子 + LICENSE

- 文件：
  - `.husky/pre-commit`
  - `LICENSE`
- 描述：
  - 根 package.json 增加 `"prepare": "husky"`；`pnpm exec husky init` 后将 pre-commit 内容改为 `pnpm exec lint-staged`。
  - `LICENSE` 写入 MIT 全文（版权行 `Copyright (c) 2025 GlobalMap contributors`）。
  - 若仓库尚未 `git init`，先执行并做首次提交。
- 验证：临时改动一个 ts/json 文件并 `git commit`，观察 lint-staged 被触发；随后回滚该改动。
- 依赖：任务 4、5
- 预计时间：5 分钟

### 任务 7：shared 包骨架

- 文件：
  - `packages/shared/package.json`
  - `packages/shared/tsconfig.json`
  - `packages/shared/vite.config.ts`
  - `packages/shared/vitest.config.ts`
  - `packages/shared/src/index.ts`（暂为空导出 `export {}`）
- 描述：
  - package.json：`name: @globalmap/shared`、`type: module`、`sideEffects: false`、`main/exports` 指向 `./dist/index.js` + `./dist/index.d.ts`（结构同设计文档 §6.2 的 core 部分）、scripts 含 `build: vite build`、`test: vitest run`。
  - tsconfig：`extends ../../tsconfig.base.json`，`include: ["src"]`；并在根 `tsconfig.json` references 中登记。
  - vite.config：lib 模式（`entry: src/index.ts`、`formats: ['es']`）+ `vite-plugin-dts`。
  - vitest.config：`environment: 'node'`。
  - 依赖统一进根安装：`vite-plugin-dts`、`vitest` 作为 shared 的 devDependencies。
- 验证：`pnpm install` 后 `pnpm --filter @globalmap/shared build` 产出 `dist/index.js` 与 `dist/index.d.ts`。
- 依赖：任务 3
- 预计时间：5 分钟

### 任务 8：shared/math.ts（TDD）

- 文件：
  - `packages/shared/src/math.ts`
  - `packages/shared/src/__tests__/math.test.ts`
- 描述：实现 4 个纯函数（不依赖 Cesium，设计文档 §4 约束）：
  - `clamp(value: number, min: number, max: number): number`
  - `lerp(from: number, to: number, t: number): number`
  - `toRadians(degrees: number): number`
  - `toDegrees(radians: number): number`
- TDD：先写测试覆盖正常值、边界值（clamp 越界、t=0/1、0°/180°），运行确认全部失败（Red）→ 实现（Green）→ 重构。
- 验证：`pnpm --filter @globalmap/shared test` 通过。
- 依赖：任务 7
- 预计时间：5 分钟

### 任务 9：shared/format.ts（TDD）

- 文件：
  - `packages/shared/src/format.ts`
  - `packages/shared/src/__tests__/format.test.ts`
- 描述：实现 3 个格式化函数：
  - `formatDistance(meters: number): string` —— <1000 输出 `"xxx m"`，否则 `"x.xx km"`。
  - `formatArea(squareMeters: number): string` —— <1e6 输出 `"xxx m²"`，否则 `"x.xx km²"`。
  - `formatCoordinate(lon: number, lat: number, precision = 6): string` —— 输出 `"lon, lat"` 定精度。
- TDD：先写边界测试（999→m、1000→km、精度截断），Red → Green → 重构。
- 验证：`pnpm --filter @globalmap/shared test` 通过。
- 依赖：任务 7
- 预计时间：5 分钟

### 任务 10：shared/validate.ts（TDD）

- 文件：
  - `packages/shared/src/validate.ts`
  - `packages/shared/src/__tests__/validate.test.ts`
- 描述：实现 3 个校验函数：
  - `isValidLongitude(v: number): boolean`（-180~180）
  - `isValidLatitude(v: number): boolean`（-90~90）
  - `assertNonEmptyId(id: string, name?: string): void` —— 空串抛 `Error`，message 含 `name`（默认 `'id'`）。
- TDD：边界值 ±180/±90/±181/±91/NaN、空 id 抛错信息，Red → Green → 重构。
- 验证：`pnpm --filter @globalmap/shared test` 通过。
- 依赖：任务 7
- 预计时间：4 分钟

> **检查点 2**：shared 三个工具模块测试全绿。

### 任务 11：shared/download.ts（TDD）

- 文件：
  - `packages/shared/src/download.ts`
  - `packages/shared/src/__tests__/download.test.ts`
- 描述：实现 2 个浏览器下载函数：
  - `downloadBlob(filename: string, blob: Blob): void`
  - `downloadText(filename: string, text: string, mimeType = 'text/plain'): void`（内部复用 downloadBlob，DRY）
  - 实现要点：`URL.createObjectURL` + 创建 `<a>` 触发 click + `revokeObjectURL`。
- TDD：vitest 环境仍用 node，测试中 stub `URL.createObjectURL` 与 `document.createElement`，断言调用参数与清理逻辑。Red → Green → 重构。
- 验证：`pnpm --filter @globalmap/shared test` 通过。
- 依赖：任务 7
- 预计时间：5 分钟

### 任务 12：shared 公共出口与产物验证

- 文件：`packages/shared/src/index.ts`
- 描述：统一 `export * from './math' | './format' | './validate' | './download'`。
- 验证：
  - `pnpm --filter @globalmap/shared build && pnpm --filter @globalmap/shared test` 全绿；
  - `dist/index.d.ts` 包含全部 12 个函数声明。
- 依赖：任务 8-11
- 预计时间：2 分钟

### 任务 13：core 包骨架

- 文件：
  - `packages/core/package.json`
  - `packages/core/tsconfig.json`
  - `packages/core/vite.config.ts`
  - `packages/core/vitest.config.ts`
  - `packages/core/src/index.ts`（骨架阶段暂空导出，公共出口由任务 24 统一收口）
  - `packages/core/src/util/index.ts`（初始为空导出，任务 13.1 中补充 `setCesiumBaseUrl` 导出）
- 描述：
  - package.json 严格按设计文档 §6.2（`peerDependencies: cesium >=1.120.0 <1.124.0`、devDependencies 钉 `cesium: 1.120.0` + `jsdom`），scripts 含 `build`、`test`。
  - vite.config：lib 模式 + `vite-plugin-dts` + `rollupOptions.external: ['cesium']`（**external 是验收重点**）。
  - vitest.config：`environment: 'jsdom'`。
  - tsconfig 同上登记根 references。
  - **util/ 目录本次迭代为最小占位**（对应设计文档 §4 的 `coordinate.ts` / `math.ts` 等 Cesium 依赖工具）：除任务 13.1 的 `cesium.ts` 外不实现其他工具；`coordinate.ts`/`math.ts` 等后续迭代按需添加，届时再走 TDD。
- 验证：`pnpm install` 后 `pnpm --filter @globalmap/core build` 成功，dist 中无 Cesium 源码。
- 依赖：任务 3
- 预计时间：5 分钟

### 任务 13.1：util/setCesiumBaseUrl（TDD）

- 文件：
  - `packages/core/src/util/cesium.ts`
  - `packages/core/src/util/index.ts`（导出 `setCesiumBaseUrl`）
  - `packages/core/src/util/__tests__/cesium.test.ts`
- 描述：实现设计文档 §5.7 注的边缘场景函数：
  ```typescript
  /** 在创建任何 Cesium 资源前设置静态资源根路径（Map3D 构造函数内部亦调用之） */
  export function setCesiumBaseUrl(url: string): void {
    ;(window as { CESIUM_BASE_URL?: string }).CESIUM_BASE_URL = url
  }
  ```
  供用户需在 `new Map3D()` 之前显式设置的场景使用；任务 19 的 Map3D 构造函数**复用此函数**而非内联赋值（DRY）。
- TDD 用例：调用后 `window.CESIUM_BASE_URL` 等于传入值；重复调用覆盖生效；传入含尾斜杠路径原样透传（不做规范化，调用方负责）。Red → Green → 重构。
- 验证：`pnpm --filter @globalmap/core test` 通过。
- 依赖：任务 13
- 预计时间：3 分钟

### 任务 14：Cesium mock

- 文件：`packages/core/__mocks__/cesium.ts`
- 描述：最小 mock，只覆盖骨架测试所需：
  - `class Viewer`：记录 `container` 与 `options`，`entities = { add: vi.fn(), remove: vi.fn() }`，`scene = {}`，`destroy()` 置 `_destroyed = true`，`isDestroyed()` 返回之。
  - `class Cartesian3`（静态 `fromDegrees(lon, lat, height = 0)` 返回 `{ x: lon, y: lat, z: height }`）。
  - `Color`（常量对象）、`defined(v)`、`Math: { toRadians, toDegrees }`。
  - 测试中通过 `vi.mock('cesium')` 生效；后续域开发按需扩充，禁止一次性 mock 整个 Cesium API（YAGNI）。
- 验证：写一个临时冒烟测试 `vi.mock('cesium')` 后 `new Viewer('div-id')` 可用，运行通过后删除临时测试。
- 依赖：任务 13
- 预计时间：5 分钟

### 任务 15：core 集中类型契约

- 文件：
  - `packages/core/src/type/disposable.ts` —— `Disposable`、`Manager` 接口（设计文档 §5.5 原文）
  - `packages/core/src/type/event.ts` —— `EventMap`（设计文档 §5.4 原文，含全部 10 个事件）
  - `packages/core/src/type/map.ts` —— `Map3DOptions { container: string | HTMLElement; cesiumBaseUrl: string; viewerOptions?: Record<string, unknown> }`
  - `packages/core/src/type/graphic.ts` —— `GraphicStyle`（基础接口：`show?: boolean`）、`MeasureResult`（`{ type: string; value: number; text: string }`）
  - `packages/core/src/type/index.ts` 统一导出
- 描述：纯类型，无运行时代码；`MeasureResult`/`GraphicStyle` 仅给初始化阶段最小形状，后续迭代扩展。
- 验证：`pnpm --filter @globalmap/core exec tsc --noEmit` 通过。
- 依赖：任务 13
- 预计时间：4 分钟

> **检查点 3**：core 空包可 build；mock 可用；类型契约就绪。

### 任务 16：event/EventBus（TDD）

- 文件：
  - `packages/core/src/event/EventBus.ts`
  - `packages/core/src/event/index.ts`
  - `packages/core/src/event/__tests__/EventBus.test.ts`
- 描述：强类型事件总线，API 契约：
  ```typescript
  class EventBus implements Disposable {
    readonly destroyed: boolean
    on<K extends keyof EventMap>(event: K, handler: (payload: EventMap[K]) => void): () => void // 返回取消订阅函数
    once<K extends keyof EventMap>(event: K, handler: (payload: EventMap[K]) => void): void
    off<K extends keyof EventMap>(event: K, handler: (payload: EventMap[K]) => void): void
    emit<K extends keyof EventMap>(
      event: K,
      ...args: EventMap[K] extends void ? [] : [EventMap[K]]
    ): void
    destroy(): void // 幂等，清空所有监听
  }
  ```
- TDD 用例：订阅/触发、取消订阅、once 只触发一次、off 移除、`void` 负载事件（`map3d:ready`）无参 emit、destroy 后 emit 静默无效、destroy 幂等。Red → Green → 重构。
- 验证：`pnpm --filter @globalmap/core test` 通过。
- 依赖：任务 15
- 预计时间：5 分钟

### 任务 17：layer/BaseLayer（TDD）

- 文件：
  - `packages/core/src/layer/BaseLayer.ts`
  - `packages/core/src/layer/index.ts`
  - `packages/core/src/layer/__tests__/BaseLayer.test.ts`
- 描述：严格按设计文档 §5.6 实现抽象类（`type` 抽象、`show` setter 去重 + `_updateShow` + emit `layer:showChanged`、`destroy()` 幂等且调用 `removeFromMap`）。
- TDD：测试内定义最小具体子类 `FakeLayer`（`addToMap`/`removeFromMap`/`_updateShow` 用 `vi.fn()`）。用例：构造注入 id/viewer/eventBus、show 重复赋值不重复 emit、show 变更触发 `_updateShow` 与事件、destroy 调用 `removeFromMap`、二次 destroy 无副作用。Red → Green → 重构。
- 验证：`pnpm --filter @globalmap/core test` 通过。
- 依赖：任务 16（EventBus）、任务 14（mock）
- 预计时间：5 分钟

### 任务 18：graphic/BaseGraphic（TDD）

- 文件：
  - `packages/core/src/graphic/BaseGraphic.ts`
  - `packages/core/src/graphic/index.ts`
  - `packages/core/src/graphic/__tests__/BaseGraphic.test.ts`
- 描述：与 BaseLayer 同模式（设计文档 §5.6 末条），差异：泛型 `<TStyle extends GraphicStyle>`、构造参数含**必填** `style: TStyle`、`show` 变更 emit `graphic:showChanged`。
- TDD：同任务 17 的对应用例 + 泛型 style 透传断言。Red → Green → 重构。
- 验证：`pnpm --filter @globalmap/core test` 通过。
- 依赖：任务 16、14
- 预计时间：5 分钟

### 任务 19：map/Map3D 基础版（TDD）

- 文件：
  - `packages/core/src/map/Map3D.ts`
  - `packages/core/src/map/index.ts`
  - `packages/core/src/map/__tests__/Map3D.test.ts`
- 描述：组合根第一版，实现设计文档 §5.2 生命周期框架：
  - 构造函数两阶段：①调用 `setCesiumBaseUrl(options.cesiumBaseUrl)`（复用任务 13.1 的函数，DRY，不内联赋值）→ 创建 `Cesium.Viewer` → 实例化 `EventBus`；②`init()` 建立跨域关联（本任务为空实现，后续任务填充 Manager）。
  - **`map3d:ready` 触发时机**：构造函数完成全部初始化（即第②阶段所有 Manager `init()` 执行完毕）之后，emit `map3d:ready`（设计文档 §5.4 已声明该事件）。本任务中 init 为空实现，则在构造末尾 emit；这是外部消费者（如 Vue 组件 `map.eventBus.on('map3d:ready', ...)`）判断地图就绪的唯一信号，**不可省略**。
  - 内部维护 `Disposable[]` 销毁栈，eventBus **最先注册、最后销毁**（逆序）。
  - `destroy()` 幂等；逐个回调 `try-catch` 兜底，单个失败不阻断后续销毁；完成销毁动作后、eventBus 自身销毁前 emit `map3d:destroyed`。
  - getter：`viewer`、`eventBus`、`destroyed`。
- TDD 用例：`window.CESIUM_BASE_URL` 被设置（经 `setCesiumBaseUrl`）、Viewer 以 container 创建、**`map3d:ready` 在构造函数返回前已触发**（先 `on` 订阅的 listener 应已被调用一次）、注册顺序=逆序销毁（用记录数组断言）、某个 destroy 抛错不影响其余、二次 destroy 无操作、`map3d:destroyed` 触发。Red → Green → 重构。
- 验证：`pnpm --filter @globalmap/core test` 通过。
- 依赖：任务 16、14、13.1（复用 `setCesiumBaseUrl`）
- 预计时间：5 分钟

### 任务 20：LayerManager 最小闭环（TDD）

- 文件：
  - `packages/core/src/layer/LayerManager.ts`
  - `packages/core/src/layer/__tests__/LayerManager.test.ts`
  - 更新：`packages/core/src/map/Map3D.ts` 及其测试
- 描述：
  - `class LayerManager implements Manager`（设计文档 §5.3：构造仅收 `map3d` + options、`init()`、方法返回 `this` 链式、`destroy()` 同步清理）。
  - 方法：`addLayer(layer: BaseLayer): this`（调 `layer.addToMap()` + emit `layer:added`）、`removeLayer(id: string): this`（调 `layer.destroy()` + emit `layer:removed`）、`getLayer(id: string): BaseLayer | undefined`、`hasLayer(id)`、`getAllLayers(): BaseLayer[]`。
  - Map3D 接入：构造阶段实例化并注册销毁栈，`get layer(): LayerManager`。
- TDD 用例：add/remove/get 行为、三个事件负载正确（设计文档 §5.4）、重复 add 同 id 抛错、map.layer 可访问、map.destroy 级联销毁 manager。Red → Green → 重构。
- 验证：`pnpm --filter @globalmap/core test` 通过。
- 依赖：任务 17、19
- 预计时间：5 分钟

> **检查点 4**：EventBus/BaseLayer/BaseGraphic/Map3D/LayerManager 测试全绿，架构主干闭环。

### 任务 21：GraphicManager 最小闭环（TDD）

- 文件：
  - `packages/core/src/graphic/GraphicManager.ts`
  - `packages/core/src/graphic/__tests__/GraphicManager.test.ts`
  - 更新：`packages/core/src/map/Map3D.ts` 及测试
- 描述：镜像任务 20（`addGraphic`/`removeGraphic`/`getGraphic`/`hasGraphic`/`getAllGraphics`，emit `graphic:added`/`graphic:removed`），`get graphic(): GraphicManager` 接入 Map3D。
- 验证：`pnpm --filter @globalmap/core test` 通过。
- 依赖：任务 18、20
- 预计时间：4 分钟

### 任务 22：Manager 空壳批次 A（6 个域）

- 文件（每域 2 个文件 + 目录 index）：
  - `primitive/PrimitiveManager.ts`、`plot/PlotManager.ts`、`measure/MeasureManager.ts`、`roam/RoamManager.ts`、`effect/EffectManager.ts`、`material/MaterialManager.ts`
  - 各自 `__tests__/` 一个契约测试
  - 更新：`packages/core/src/map/Map3D.ts` 及测试
- 描述：每个空壳仅实现 `Manager` 接口（`init()` 空实现、`destroyed` 标记、`destroy()` 幂等置位），构造签名统一 `(map3d: Map3D, options?: Record<string, unknown>)`；Map3D 增加对应 getter 并**按固定顺序**注册销毁栈。
- TDD：契约测试统一断言：getter 存在、destroy 后 `destroyed === true`、map.destroy 级联。Red → Green → 重构。
- 验证：`pnpm --filter @globalmap/core test` 通过。
- 依赖：任务 20
- 预计时间：5 分钟

### 任务 23：Manager 空壳批次 B（5 个域）

- 文件：
  - `analyse/AnalyseManager.ts`、`transform/TransformManager.ts`、`control/ControlManager.ts`、`resource/ResourceManager.ts`、`scene/SceneManager.ts`
  - 各自契约测试
  - 更新：`packages/core/src/map/Map3D.ts` 及测试
- 描述：同任务 22。完成后 Map3D 具备设计文档 §5.1 要求的全部 13 个域 getter。
  - **`map3d:ready` 时序守护**：随着 13 个 Manager 全部接入，确认 Map3D 构造函数维持设计文档 §5.2 的顺序——实例化全部 Manager → 逐个 `init()` → 最后才 emit `map3d:ready`；不得因 Manager 增多而把 ready 提前。
- 验证：`pnpm --filter @globalmap/core test` 通过；测试断言 13 个 getter 全部存在，且 `map3d:ready` 触发时全部 Manager 的 `init()` 均已执行（用 init 调用记录数组断言）。
- 依赖：任务 22
- 预计时间：5 分钟

### 任务 24：core 公共出口

- 文件：`packages/core/src/index.ts`
- 描述：导出 `Map3D`、`EventBus`、`BaseLayer`、`BaseGraphic`、全部 Manager、全部 type，以及 `setCesiumBaseUrl`（来自 `util/`，供边缘场景提前设置 Cesium 静态资源路径，设计文档 §5.7 注）。各域目录的 `index.ts` 只导出公共 API，内部实现文件不导出（保持包边界）。
- 验证：`pnpm --filter @globalmap/core exec tsc --noEmit` 通过。
- 依赖：任务 21、23
- 预计时间：3 分钟

### 任务 25：core 产物验收

- 文件：无（验收任务）
- 描述：
  - `pnpm --filter @globalmap/core build` 成功；
  - `dist/index.js` 为 ESM（含 `export`）、`dist/index.d.ts` 存在且含 `Map3D` 声明；
  - **external 验证**：`grep -c "CesiumWidget\|createWorldImagery" packages/core/dist/index.js` 结果为 0，且产物中 `from 'cesium'` 引用保留为裸导入。
- 验证：上述命令全部满足。
- 依赖：任务 24
- 预计时间：3 分钟

> **检查点 5**：core 包完整可构建，13 域骨架齐备，external 正确。

### 任务 26：example 包骨架

- 文件：
  - `packages/example/package.json`
  - `packages/example/vite.config.ts`
  - `packages/example/tsconfig.json`
  - `packages/example/index.html`
  - `packages/example/src/env.d.ts`
- 描述：
  - package.json：`name: @globalmap/example`、`private: true`，dependencies 含 `@globalmap/core: workspace:*`、`@globalmap/shared: workspace:*`、`cesium: 1.120.0`、`vue`、`vue-router`；devDependencies 含 `vite`、`@vitejs/plugin-vue`、`vite-plugin-cesium`；scripts 含 `dev`、`build`、`preview`。
  - vite.config：`vue()` + `vite-plugin-cesium()`，resolve alias `@` → `/src`。
  - index.html：`#app` 挂载点 + 全屏样式 reset。
  - env.d.ts：`/// <reference types="vite/client" />` + `.vue` 模块声明。
- 验证：`pnpm install` 成功（注意 cesium 体积较大，耐心等待）。
- 依赖：任务 25
- 预计时间：5 分钟

### 任务 27：应用入口与路由

- 文件：
  - `packages/example/src/main.ts`
  - `packages/example/src/App.vue`
  - `packages/example/src/router/index.ts`
- 描述：
  - main.ts：`createApp(App).use(router).mount('#app')`。
  - App.vue：`<router-view />` + 全局布局样式。
  - router：`createWebHistory`，路由表：`/` → Home、`/case/:name` → 动态加载 `views/cases/` 下对应组件（`import.meta.glob` 收集案例，新增案例零配置，DRY）。
- 验证：`pnpm --filter @globalmap/example exec vue-tsc --noEmit`（或 build）通过。
- 依赖：任务 26
- 预计时间：4 分钟

### 任务 28：Home 导航页

- 文件：`packages/example/src/views/Home.vue`
- 描述：读取 router 中案例清单，渲染卡片式导航（名称 + 路由跳转），页头展示 "GlobalMap Examples"。样式从简，不引 UI 框架（YAGNI）。
- 验证：构建通过。
- 依赖：任务 27
- 预计时间：3 分钟

### 任务 29：BasicMap 案例（端到端闭环）

- 文件：`packages/example/src/views/cases/BasicMap.vue`
- 描述：
  - onMounted：`new Map3D({ container: 'map-container', cesiumBaseUrl: import.meta.env.BASE_URL + 'cesium' })`（与 vite-plugin-cesium 输出目录对齐）；订阅 `map.eventBus.on('map3d:ready', ...)` 并在页面显示"地图就绪"状态（演示外部消费者的标准用法，同时端到端验证任务 19 的 ready 时序）；
  - 定义一个内存 `DemoLayer extends BaseLayer` + `DemoGraphic extends BaseGraphic`，演示 `map.layer.addLayer` → `show = false/true` → `removeLayer` 全链路，并用 `map.eventBus.on('layer:added', ...)` 在页面上打印事件日志；
  - onUnmounted：`map.destroy()`（验证幂等销毁在真实环境无副作用）。
- 验证：**人工冒烟**——`pnpm dev` 打开 `/case/BasicMap`，地球渲染正常，"地图就绪"状态出现，事件日志按操作出现，控制台无报错。
- 依赖：任务 28
- 预计时间：5 分钟

### 任务 30：example 构建验证

- 文件：无（验收任务）
- 描述：`pnpm --filter @globalmap/example build` 成功，`dist` 含 cesium 静态资源目录。
- 验证：命令退出码 0。
- 依赖：任务 29
- 预计时间：3 分钟

> **检查点 6（人工必查）**：浏览器端到端冒烟通过。

### 任务 31：docs 包骨架

- 文件：
  - `packages/docs/package.json`
  - `packages/docs/.vitepress/config.ts`
- 描述：`name: @globalmap/docs`、`private: true`；devDependencies `vitepress`；scripts `dev/build/preview`。config：站点标题 "GlobalMap"、`themeConfig.nav`（Guide / API）、sidebar 骨架。
- 验证：`pnpm install` 后 `pnpm --filter @globalmap/docs dev` 可启动，首页渲染。
- 依赖：任务 25
- 预计时间：4 分钟

### 任务 32：docs 初始内容

- 文件：
  - `packages/docs/index.md`（首页 hero）
  - `packages/docs/guide/getting-started.md`
  - `packages/docs/guide/cesium-base-url.md`
  - `packages/docs/api/index.md`（API 占位页）
- 描述：
  - getting-started：安装、`new Map3D` 最小示例（与任务 29 案例一致）。
  - cesium-base-url：Vite（vite-plugin-cesium）与 Webpack（copy-webpack-plugin）两种静态资源方案（设计文档 §5.7），含"首次 Worker 创建时才读取"的边缘场景说明，并给出 `setCesiumBaseUrl` 的真实 API 用法示例（`import { setCesiumBaseUrl } from '@globalmap/core'`，在 `new Map3D()` 之前调用）——该函数已在任务 13.1 实现、任务 24 导出，文档必须与代码一致，禁止只写提示不写实现。
- 验证：dev 服务器中各页面可访问、无死链报错。
- 依赖：任务 31
- 预计时间：5 分钟

### 任务 33：根 scripts

- 文件：
  - `scripts/build.mjs`
  - `scripts/dev.mjs`
- 描述：薄封装（只是 `pnpm -r build` / `pnpm --filter @globalmap/example dev` 的 node spawn 包装，带中文提示与退出码透传），根 package.json scripts 指向它们。
- 验证：`node scripts/build.mjs` 与整仓构建结果一致。
- 依赖：任务 30
- 预计时间：3 分钟

### 任务 34：整仓验收

- 文件：无（验收任务）
- 描述（按成功标准逐项执行）：
  1. 删除 `node_modules` 与各包 `dist` 后 `pnpm install` 全新安装；
  2. `pnpm lint`、`pnpm exec prettier --check .`；
  3. `pnpm -r test`；
  4. `pnpm -r build`；
  5. example 人工冒烟复核（任务 29 步骤）。
- 验证：成功标准 1-6 全过。
- 依赖：任务 31-33
- 预计时间：5 分钟

### 任务 35：changeset 流程演练

- 文件：`.changeset/<随机名>.md`（演练后保留作为首个真实 changeset）
- 描述：`pnpm changeset` 为 `@globalmap/core`、`@globalmap/shared` 各记一个 `patch`；`pnpm exec changeset status` 确认 example/docs 不出现在发布列表。
- 验证：成功标准 7 通过。
- 依赖：任务 34
- 预计时间：2 分钟

> **检查点 7**：全部成功标准通过 → 进入 Code Review 阶段（输出 `review.md`），随后 Finishing 阶段。

## 5. 关键风险与对策

| 风险                                                     | 对策                                                                                                    |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Cesium 包体积大，`pnpm install` 慢                       | 检查点 1 前完成首次安装；example 依赖安装单独安排在任务 26                                              |
| `useDefineForClassFields` 缺失导致 Cesium 继承类字段异常 | 任务 3 中显式开启，Base 类 TDD 用例可暴露该问题                                                         |
| `CESIUM_BASE_URL` 边缘场景（设计文档 §5.7 注）           | 任务 13.1 已实现 `setCesiumBaseUrl` 并在任务 24 导出；任务 32 文档给出真实 API 用法，保证代码与文档一致 |
| mock 过度膨胀                                            | 任务 14 限定最小集合，按需扩充，禁止全量 mock                                                           |
| eslint flat config 与 vue/ts 插件版本兼容                | 版本已在设计文档 §6.1 钉住；冲突时以可运行为准微调并回写设计文档                                        |

## 6. 任务依赖总览

```
1 → 2 → 3 → 4 → 5 → 6          （根工程化）
3 → 7 → 8/9/10/11 → 12          （shared）
3 → 13 → 13.1 → 14 → 15 → 16 → 17/18 → 19 → 20 → 21 → 22 → 23 → 24 → 25   （core，19 复用 13.1 的 setCesiumBaseUrl）
25 → 26 → 27 → 28 → 29 → 30     （example）
25 → 31 → 32                    （docs）
30,32 → 33 → 34 → 35            （验收）
```
