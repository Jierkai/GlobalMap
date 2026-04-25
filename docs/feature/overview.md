# @cgx/feature 架构概览

@cgx/feature 是 Cgx 框架的核心图形要素包，承担着构建 3D 几何与标绘能力的使命。

## 核心设计
1. **彻底摒弃 BaseGraphic 继承树**
   - 不再向外提供类似 `BaseGraphic` 或 `BaseFeature` 的 OOP 继承。
   - 所有创建的要素由入口工厂 `createFeature(kind, opts)` 生成，这保证了要素是组合式的契约对象而非厚重的类实例。

2. **能力的组合 (Capabilities)**
   - Feature 的功能划分为正交的能力 (Capabilities) 接口，例如 `Identified`, `Positionable`, `Styleable`, `Pickable` 等。
   - 通过 TypeScript 的映射类型自动推导指定 kind 特有的属性（例如 Point 具有 `position`，Polygon 具有 `positions`）。

3. **信号响应与样式系统 (StyleSystem)**
   - 每个 Feature 具有一个独立的 `style` 系统，包含了 `patch()` 和条件样式 (rules) 评估逻辑。
   - `style.patch` 触发的是 signal 的响应式管道，禁止通过引用的方式去 mutate (如 `feature.style.color = 'red'`)。它不仅保证了数据流的单向性，同时也是 L1 Adapter 执行最小按需更新的根本依据。
   
4. **GeoJSON 与无 Cesium 耦合**
   - 原生的 GeoJSON `toGeoJSON` 及 `fromGeoJSON` 序列化/反序列化功能由纯粹的 TypeScript 实现。它完全不依赖于底层的 L1 adapter 或是 cesium 本身的装载逻辑，保证了高度的同构能力和 Worker 侧运行可行性。
