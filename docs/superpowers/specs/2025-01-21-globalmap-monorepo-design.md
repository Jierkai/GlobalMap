# GlobalMap Monorepo 初始化设计文档

## 1. 项目背景

GlobalMap 是一个基于 Cesium 二次封装的三维地图库，定位为 Mars3D 的开源替代方案。

## 2. 核心目标

1. 功能对标 Mars3D，提供图层管理、图元、标绘、测量、漫游、特效、材质、空间分析、坐标转换、UI 控件、资源加载、场景管理等能力。
2. 完全开源，社区可参与修改与优化。
3. 组合式架构，通过模块化、可插拔的方式组织功能，避免 Mars3D 继承式架构导致的子类臃肿问题。
4. Monorepo 工程，包含核心库、示例、文档、共享工具包。

## 3. 技术选型

| 项目 | 选型 | 说明 |
|------|------|------|
| 包管理器 | pnpm workspace | 磁盘效率高，monorepo 生态成熟 |
| 核心库语言 | 纯 TypeScript | 框架无关，示例用 Vue3 演示 |
| Cesium 依赖 | peerDependencies | 版本范围 `>=1.120.0 <1.124.0` |
| 模块格式 | ESM only | tree-shaking 最佳，现代标准 |
| 构建工具 | Vite build mode | 配置简单，适合浏览器库 |
| 测试框架 | Vitest | 各包独立配置 |
| 版本管理 | Changesets | 声明式版本发布 |
| 代码规范 | ESLint flat config + Prettier | 根目录统一配置 |
| 提交钩子 | husky + lint-staged | 提交时自动 lint |

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
│   │   │   ├── layer/           # 图层管理域
│   │   │   ├── graphic/         # 业务图元域
│   │   │   ├── primitive/       # 底层图元域
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
│   │   └── mocks/cesium.ts       # Cesium mock
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
- **Map3D 作为组合根**：通过 getter 暴露各能力域 Manager，如 `map3d.layer`、`map3d.graphic`
- **Manager 间通信**：核心数据流直接调用 + 事件通知，扩展点纯事件

### 5.2 Map3D 生命周期

```typescript
const map = new Map3D(options)  // 构造函数内完成所有初始化
map.destroy()                   // 幂等销毁，逆序清理
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
  'graphic:added': { graphic: BaseGraphic }
  'graphic:removed': { graphicId: string }
  'graphic:showChanged': { graphicId: string; show: boolean }
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
abstract class BaseLayer implements Disposable {
  abstract readonly type: string
  protected _show = true
  protected _destroyed = false

  constructor(
    public readonly id: string,
    protected viewer: Cesium.Viewer,
    protected eventBus: EventBus
  ) {}

  get show(): boolean
  set show(value: boolean)  // 去重检查 + _updateShow + emit
  get destroyed(): boolean

  abstract addToMap(): void
  abstract removeFromMap(): void
  protected abstract _updateShow(show: boolean): void

  destroy(): void  // 幂等，调用 removeFromMap
}
```

- `viewer` 构造注入，非方法参数
- `show` setter 联动实际图层可见性
- `BaseGraphic` 同模式，泛型 `TStyle extends GraphicStyle`，style 必填

### 5.7 Cesium 静态资源方案

- `Map3D` 构造函数要求传入 `cesiumBaseUrl: string`
- 初始化时执行 `window.CESIUM_BASE_URL = cesiumBaseUrl`
- `core` 构建时外置 `cesium`，不打包
- `example` 使用 `vite-plugin-cesium` 自动处理静态资源
- 文档提供 Webpack `copy-webpack-plugin` 方案指引

注：Cesium 实际在首次创建 Worker / 加载资源时才读 `CESIUM_BASE_URL`，非模块加载时，因此构造函数内设置通常安全。如遇边缘场景，可提供独立 `setCesiumBaseUrl()` 函数供用户提前调用。

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
