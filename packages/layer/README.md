# @cgx/layer

## 功能
`layer` 模块专门负责地图图层的加载和管理，包括影像图层 (Imagery)、瓦片图层 (Tileset)、矢量图层 (Vector)、地形图层 (Terrain)、图形图层 (Graphic) 以及通用数据图层 (Data)。

## 架构
模块采用基于类的领域对象 API，所有图层类继承自内部 `BaseLayer` 抽象基类：

- **`ImageryLayer`** — 影像图层，接受 `ImageryProvider` 作为数据源
- **`TerrainLayer`** — 地形图层
- **`DataLayer`** — 通用数据图层，承载任意数据源类型
- **`GeoJsonLayer`** — GeoJSON 图层（继承 DataLayer）
- **`PointCloudLayer`** — 点云图层（继承 DataLayer）
- **`TilesetLayer`** — 3D Tileset 图层（继承 DataLayer）
- **`VectorLayer`** — 矢量图层（继承 GeoJsonLayer，Legacy 兼容）
- **`GraphicLayer`** — 图形图层，管理一组 Feature，支持聚合和渲染模式切换
- **`LayerManager`** — 图层管理器，统筹管理所有图层集合

## 使用示例

```typescript
import { ImageryLayer } from '@cgx/layer';
import { createXyzProvider } from '@cgx/layer/provider/xyz';

// 创建影像图层
const layer = new ImageryLayer({
  id: 'base-map',
  provider: createXyzProvider({
    url: 'https://example.com/tiles/{z}/{x}/{y}.png'
  }),
  opacity: 0.8,
});

// 将其加至图层管理器或具体业务流中
viewer.layers.add(layer);
```

### 图形图层

```typescript
import { GraphicLayer } from '@cgx/layer';

const graphics = new GraphicLayer({
  id: 'graphics',
  renderMode: 'primitive',
  clustering: { enabled: true, pixelRange: 24 },
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

viewer.layers.add(graphics);
```

## 类继承关系

```
BaseLayer (abstract, 内部)
├── ImageryLayer
├── TerrainLayer
├── DataLayer
│   ├── GeoJsonLayer
│   │   └── VectorLayer<F>
│   ├── PointCloudLayer
│   └── TilesetLayer
└── GraphicLayer
```
