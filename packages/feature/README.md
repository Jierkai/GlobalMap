# @cgx/feature

## 功能
`feature` 模块用于封装和描述地图上的各类实体要素（点、线、多边形等），并提供样式配置 (Styling)、详细等级 (LOD) 和 GeoJSON 的导入/导出能力。

## 架构
不直接绑定具体渲染引擎，而是通过定义 `Feature` 数据结构和特性：
- **FeatureKinds**: 定义了 `point`, `polyline`, `polygon`, `billboard`, `model` 等。
- **Capabilities**: 使用 Mixin 的思想组合如 `Pickable`, `Hoverable`, `Styleable` 等能力接口。
- **GeoJSON**: 提供 `toGeoJSON` 和 `fromGeoJSON` 的转换能力。
- **StyleSystem**: 提供统一的 `StyleRule` 和 `createStyleSystem`。

## 示例
```typescript
import { createFeature, toGeoJSON } from '@cgx/feature';

// 创建一个基础点要素
const pointFeature = createFeature('point', {
  id: 'point-1',
  position: { lng: 116.4, lat: 39.9, alt: 0 },
  style: {
    color: '#FF0000',
    pixelSize: 10
  }
});

// 转换为 GeoJSON
const geoJsonData = toGeoJSON(pointFeature);
console.log(geoJsonData);
```
