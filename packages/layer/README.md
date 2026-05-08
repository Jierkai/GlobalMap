# @cgx/layer

## 功能
`layer` 模块专门负责地图图层的加载和管理，包括影像图层 (Imagery)、瓦片图层 (Tileset)、矢量图层 (Vector) 以及地形图层 (Terrain)。

## 架构
模块通过一致的工厂函数创建图层，并抽象了不同的服务提供商（Providers）：
- **图层工厂**: 如 `createImageryLayer`, `createVectorLayer`, `createTilesetLayer` 等。
- **LayerManager**: 统筹管理所有图层的集合，可通过 `Layers` 能力注册。
- **Providers**: 提供对 `XYZ`, `WMS`, `WMTS` 等地图服务接口的支持（例如 `createXyzProvider`）。
- **GraphicLayer 渲染模式**: `createGraphicLayer({ renderMode })` 支持 `entity` 和 `primitive`。图层默认值可被单个图元的 `renderMode` 覆盖。

## 示例
```typescript
import { createImageryLayer, createXyzProvider } from '@cgx/layer';

// 创建 XYZ 提供商
const xyzProvider = createXyzProvider({
  url: 'https://example.com/tiles/{z}/{x}/{y}.png'
});

// 创建影像图层
const layer = createImageryLayer({
  id: 'base-map',
  provider: xyzProvider,
  alpha: 0.8,
  show: true
});

// 将其加至图层管理器或具体业务流中
```

```typescript
import { createGraphicLayer } from '@cgx/layer';

const graphics = createGraphicLayer({
  id: 'graphics',
  renderMode: 'primitive'
});

graphics.addPoint({
  id: 'p1',
  position: [116.4, 39.9],
  label: { text: 'Point 1' }
});

graphics.addText({
  id: 'text-1',
  position: [116.41, 39.91],
  text: 'Only text'
});
```
