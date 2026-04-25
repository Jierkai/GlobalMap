# @cgx/adapter-cesium

## 功能
`adapter-cesium` 是 Cesium 渲染引擎的官方适配层。它将强大的 CesiumJS 接入到 `core` 模块定义的统一地图架构中，提供视图控制、坐标转换、场景管理和原生事件代理。

## 架构
该模块将底层的 `Cesium.Viewer` 进行了封装和抽象，并桥接了 Cgx 的信号系统和事件机制。
- **Viewer 创建**: 提供 `createViewer` 作为 Cesium Viewer 实例的工厂函数。
- **坐标转换**: `toCartesian3`, `fromCartesian3` 等经纬度与笛卡尔坐标的转换工具。
- **事件处理**: `ScreenSpaceEmitter` 用于拦截和代理 Cesium 原生的 `ScreenSpaceEventHandler` 鼠标事件。
- **逃生舱口 (Escape Hatch)**: 提供 `unsafeGetCesium` 以便开发者直接访问底层的 Cesium 对象。

## 示例
```typescript
import { createViewer, toCartesian3, ScreenSpaceEmitter } from '@cgx/adapter-cesium';

// 创建基于 Cesium 的 Viewer 实例
const viewer = createViewer('cesiumContainer', { shouldAnimate: true });

// 坐标转换
const position = toCartesian3({ lng: 116.39, lat: 39.9, alt: 1000 });

// 事件处理
const emitter = new ScreenSpaceEmitter(viewer.scene, viewer.canvas);
emitter.on('click', (payload) => {
  console.log('点击位置坐标:', payload.position);
});
```
