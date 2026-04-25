# @cgx/core 架构概览

`@cgx/core` 构成了整个 Cgx 框架的 L2 Domain Kernel 和 L3 基础入口。其主要职责是提供与 Cesium 无关的业务模型，并以强类型和响应式的方式管理 Viewer 的生命周期。

## 核心设计

1. **响应式内核 (`alien-signals`)**
   Viewer 的状态、图层、能力等数据都是响应式驱动的。这在 L4 层桥接框架（Vue/React）时提供了极简体验。
   
2. **生命周期管理**
   Viewer 拥有 `idle`, `ready`, `disposing`, `disposed` 状态机。
   初始化时依赖 L1 的适配器 (Adapter)，卸载时具备幂等性，并负责销毁其挂载的所有 Capability。
   
3. **强类型事件 (`Emitter`)**
   取代了传统的全局常量表模式，采用了带有类型推导的事件总线。这确保了在 `viewer.on('event', payload => {})` 中，payload 的类型得到静态保证。
   
4. **能力系统 (Composition over Inheritance)**
   摒弃了传统庞大 Base 类继承的方式，提供 `viewer.use(Capability)`。每个功能块通过独立的包引入（如 `CameraOps`, `ClockOps`, `InputOps`）。

5. **错误边界**
   提供统一的 `CgxError` 与 `ErrorCodes`，防止内部组件失败污染全局。允许用户挂载 `viewer.onUncaught` 以捕获渲染循环内发生的异常。

6. **轻量化原则 (Tree-shaking 友好)**
   如 Vitals HUD 之类的调试工具设计为按需挂载或纯开发环境下可执行，从而保证生产环境 Bundle 的极致微小（< 8KB）。
