# CGX (Cesium Graphics eXtension)

[![License: Apache-2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5%2B-blue.svg)](https://www.typescriptlang.org/)
[![pnpm](https://img.shields.io/badge/pnpm-10.32%2B-orange.svg)](https://pnpm.io/)

> **CesiumJS 的现代化开发体验增强层**
> 
> CGX 是一个开源的 CesiumJS 上层封装库，提供更优雅的 API 设计、响应式状态管理和模块化架构。

## 🎯 项目定位

CGX 是一个 **独立设计和实现** 的 CesiumJS 增强库，采用现代化的软件工程实践：

- **净室开发**：所有代码均为原创实现，未参考或复制任何第三方 Cesium 封装库
- **Apache-2.0 协议**：完全开源，可自由商用
- **TypeScript 原生**：从零开始设计类型系统，提供完整的类型推断
- **模块化架构**：Monorepo 结构，按需引入

## ✨ 核心特性

### 🏗️ 架构设计

- **分层架构**：L1（适配层）→ L2（核心层）→ L3（功能层）→ L4（应用层）
- **响应式系统**：基于 Signal 的细粒度响应式状态管理
- **事件系统**：类型安全的事件发射器
- **状态机**：轻量级有限状态机实现

### 📦 包结构

| 包名 | 说明 |
|------|------|
| `@cgx/core` | 核心抽象层 - Viewer、Capability、Constraint、FSM |
| `@cgx/reactive` | 响应式系统 - Signal、ObservableList、ObservableMap |
| `@cgx/feature` | 要素系统 - GeoJSON 支持、样式规则、LOD |
| `@cgx/sketch` | 绘制系统 - 交互式图形绘制 |
| `@cgx/edit` | 编辑系统 - 图形编辑、顶点拖拽 |
| `@cgx/history` | 历史管理 - 撤销/重做 |
| `@cgx/analysis` | 空间分析 - 缓冲区、视域、剖面 |
| `@cgx/material` | 材质系统 - 自定义材质定义 |
| `@cgx/layer` | 图层系统 - 多源数据加载 |
| `@cgx/adapter-cesium` | CesiumJS 适配器 |
| `@cgx/adapter-vue` | Vue 3 适配器 |
| `@cgx/provider-cn` | 国内地图服务提供商（天地图、高德、百度） |

## 📦 安装

```bash
# 使用 pnpm
pnpm add @cgx/core @cgx/adapter-cesium

# 或 npm
npm install @cgx/core @cgx/adapter-cesium
```

## 🚀 快速开始

### 创建 Viewer

```typescript
import { createCgxViewer } from '@cgx/core'
import { CesiumAdapter } from '@cgx/adapter-cesium'

const viewer = createCgxViewer({
  container: 'cesiumContainer',
  adapter: new CesiumAdapter(),
  baseLayer: {
    type: 'xyz',
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
  }
})

// 订阅状态变化
viewer.on('ready', () => {
  console.log('Viewer is ready!')
})
```

### 响应式状态

```typescript
import { signal, computed, effect } from '@cgx/reactive'

// 创建响应式状态
const position = signal([116.391, 39.907, 0])

// 计算属性
const longitude = computed(() => position()[0])

// 副作用
effect(() => {
  console.log('Position changed:', position())
})
```

### 绘制图形

```typescript
import { PolygonSketcher } from '@cgx/sketch'

const sketcher = new PolygonSketcher(viewer)
sketcher.start()

sketcher.on('complete', (result) => {
  console.log('Polygon created:', result.coordinates)
})
```

### 编辑要素

```typescript
import { FeatureEditor } from '@cgx/edit'

const editor = new FeatureEditor(viewer)
editor.enableEditing(selectedFeature)
```

## 🏗️ 项目结构

```
packages/
├── core/           # 核心抽象层
│   ├── viewer/     # Viewer 创建与管理
│   ├── capability/  # 能力系统（相机、时钟、输入）
│   ├── constraint/  # 约束系统（吸附、正交）
│   ├── fsm/        # 有限状态机
│   └── errors/     # 错误处理
├── reactive/       # 响应式系统
│   ├── signals/    # Signal 实现
│   └── collections/  # 可观察集合
├── feature/        # 要素系统
│   ├── geojson/    # GeoJSON 解析
│   ├── style/      # 样式规则
│   └── lod/        # 层级细节
├── sketch/         # 绘制系统
├── edit/           # 编辑系统
├── history/        # 历史管理
├── analysis/       # 空间分析
├── material/       # 材质系统
├── layer/          # 图层系统
├── adapter-cesium/ # CesiumJS 适配器
├── adapter-vue/    # Vue 3 适配器
└── provider-cn/    # 国内地图服务
```

## 🧪 开发

```bash
# 安装依赖
pnpm install

# 运行测试
pnpm test

# 类型检查
pnpm typecheck

# 代码检查
pnpm lint

# 构建
pnpm build
```

## 📚 文档

详细文档请参阅 [`docs/`](docs/) 目录：

- [快速开始](docs/guide/quick-start.md)
- [架构设计](docs/guide/architecture.md)
- [响应式系统](docs/guide/signals.md)
- [API 参考](docs/index.md)

## 🤝 贡献

欢迎贡献代码！请确保：

1. 所有代码均为原创，未复制任何第三方库
2. 遵循 TypeScript 严格模式
3. 新增功能需包含测试用例
4. 提交信息遵循规范格式

### 开发流程

```bash
# 1. Fork 并克隆
git clone git@github.com:YOUR_USERNAME/GlobalMap.git

# 2. 安装依赖
pnpm install

# 3. 创建分支
git checkout -b feature/your-feature

# 4. 开发并测试
pnpm test

# 5. 提交代码
git commit -m "feat: add your feature"

# 6. 推送并创建 PR
git push origin feature/your-feature
```

## 📄 许可证

Apache License 2.0

本项目为独立设计和实现的开源项目，未使用或复制任何第三方 Cesium 封装库代码。

## 🙏 致谢

- [CesiumJS](https://cesium.com/cesiumjs/) - 强大的三维地球引擎
- [alien-signals](https://github.com/stackblitz/alien-signals) - 轻量级响应式库

---

*独立开发 · 开源共享 · Apache-2.0*
