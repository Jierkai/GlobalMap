# 快速开始

GlobalMap 是基于 Cesium 二次封装的三维地图库，采用组合式架构，通过 `Map3D` 组合根暴露全部能力域。

## 安装

```bash
npm install @globalmap/core cesium
# 或
pnpm add @globalmap/core cesium
```

`cesium` 是 peer 依赖（`>=1.120.0 <1.124.0`），需要显式安装。

## 最小示例

```typescript
import { Map3D } from '@globalmap/core'

const map = new Map3D({
  container: 'map-container', // DOM id 或 HTMLElement
  cesiumBaseUrl: '/cesium', // Cesium 静态资源目录，见「Cesium 静态资源」
})

// map3d:ready 是判断地图就绪的唯一信号
map.eventBus.on('map3d:ready', () => {
  console.log('地图就绪')
})
```

对应 HTML：

```html
<div id="map-container" style="width: 100%; height: 100%"></div>
```

## 能力域

`Map3D` 实例通过 getter 暴露 13 个能力域 Manager：

| getter          | 域       |
| --------------- | -------- |
| `map.layer`     | 图层管理 |
| `map.graphic`   | 业务图元 |
| `map.primitive` | 底层图元 |
| `map.plot`      | 标绘     |
| `map.measure`   | 测量     |
| `map.roam`      | 漫游     |
| `map.effect`    | 特效     |
| `map.material`  | 材质     |
| `map.analyse`   | 空间分析 |
| `map.transform` | 坐标转换 |
| `map.control`   | UI 控件  |
| `map.resource`  | 资源加载 |
| `map.scene`     | 场景管理 |

## 销毁

```typescript
map.destroy() // 幂等；逆序销毁全部 Manager 与 Viewer，最后销毁 EventBus
```

完整可运行示例见仓库 `packages/example`（`pnpm dev` 后访问 `/case/BasicMap`）。
