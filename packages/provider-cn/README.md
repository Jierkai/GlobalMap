# @cgx/provider-cn

## 功能
`provider-cn` 模块专门针对中国大陆地图服务提供商做了底图切片加载支持，同时自动处理了不同坐标系 (GCJ-02, BD-09, WGS-84) 间的投影与偏移转换。

## 架构
该模块提供了国内几家主流厂商的开箱即用的图层 `ImageryProvider` 实现及底层的切片规则 (`TilingScheme`):
- **Providers**: 提供 `createGaodeProvider`、`createBaiduProvider`、`createTiandituProvider` 函数快速接入图源。
- **投影与纠偏**: 提供 `applyGcj02Offset`, `revertGcj02Offset` 和基于这些转换派生出的自定义 `TilingScheme`（如 `BaiduMapTilingScheme` 等）。

## 示例
```typescript
import { createGaodeProvider } from '@cgx/provider-cn';

// 创建高德地图提供商（内置自动进行 GCJ-02 坐标纠偏）
const gaodeProvider = createGaodeProvider({
  style: 'vec', // 'vec' | 'img'
});

// 配合 layer 模块生成影像图层
import { ImageryLayer } from '@cgx/layer';
const amapLayer = new ImageryLayer({
  id: 'amap-base',
  provider: gaodeProvider
});
```
