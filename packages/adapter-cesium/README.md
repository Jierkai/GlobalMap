# @cgx/adapter-cesium

## 功能
`adapter-cesium` 是 CGX 内部使用的 Cesium runtime。最终用户优先从 `cgx` 包创建 `CgxViewer`，不需要手动创建或理解适配器对象。

## 架构
该模块将底层的 `Cesium.Viewer` 进行了封装，并桥接了 Cgx 的信号系统和事件机制。
- **Viewer 创建**: 提供 `createViewer` 作为 Cesium Viewer 实例的工厂函数。
- **坐标转换**: `toCartesian3`, `fromCartesian3` 等经纬度与笛卡尔坐标的转换工具。
- **事件处理**: `ScreenSpaceEmitter` 用于拦截和代理 Cesium 原生的 `ScreenSpaceEventHandler` 鼠标事件。
- **逃生舱口 (Escape Hatch)**: 提供 `unsafeGetCesium` 以便开发者直接访问底层的 Cesium 对象。

## 示例
推荐入口：

```typescript
import { CgxViewer } from 'cgx';

const viewer = new CgxViewer({
  container: 'cesiumContainer',
  cesium: {
    animation: true,
    shouldAnimate: true,
  },
});

await viewer.ready();
const cesiumViewer = viewer.getCesiumViewer();
```

内部 runtime 工具仍可在维护 runtime 时直接使用：

```typescript
import { createViewer, toCartesian3, ScreenSpaceEmitter } from '@cgx/adapter-cesium';

// 创建基于 Cesium 的 Viewer 句柄，options 直接使用 Cesium.Viewer 原生配置
const viewer = createViewer('cesiumContainer', {
  animation: true,
  shouldAnimate: true,
});

// 坐标转换
const position = toCartesian3({ lng: 116.39, lat: 39.9, alt: 1000 });

// 事件处理
const emitter = new ScreenSpaceEmitter(viewer.scene, viewer.canvas);
emitter.on('click', (payload) => {
  console.log('点击位置坐标:', payload.position);
});
```
