# @cgx/core

## 功能
`core` 模块是整个地图库的核心基础设施。它提供了独立于具体渲染引擎的基础类库、状态机、事件中心、错误处理和通用工具方法。所有其他高级功能模块和引擎适配器都依赖于此核心模块定义的接口和规范。

## 架构
该模块采用无框架和无引擎依赖的纯 TypeScript 编写。主要包含以下部分：
- **CgxViewer**: 地图容器的核心基类。
- **FSM (状态机)**: 提供应用状态和交互模式的管理 (`defineFsm`)。
- **Typed Events (类型化事件)**: 提供强类型的事件发布/订阅机制 (`TypedEmitter`)。
- **Capability**: 灵活的能力注册机制，方便子模块的扩展和解耦。
- **Vitals**: 系统性能监控和检测 (`createVitalsHud`)。

## 示例
```typescript
import { createCgxViewer, defineFsm } from '@cgx/core';

// 创建核心的 Viewer 实例（通常由特定引擎如 Cesium 的适配器包装使用）
const viewer = createCgxViewer('map-container');

// 定义状态机
const fsm = defineFsm({
  initial: 'idle',
  states: {
    idle: {
      on: { START: 'active' }
    },
    active: {
      on: { STOP: 'idle' }
    }
  }
});
```
