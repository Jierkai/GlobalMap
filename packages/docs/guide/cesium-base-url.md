# Cesium 静态资源

Cesium 运行时需要加载 Worker、Assets、Widgets 等静态资源，路径由 `window.CESIUM_BASE_URL` 决定。GlobalMap 要求显式传入该路径，不做隐式猜测。

## 边缘场景说明

Cesium **并非在模块加载时**读取 `CESIUM_BASE_URL`，而是在**首次创建 Worker / 加载资源时**才读取。因此在 `new Map3D()` 构造函数内设置通常是安全的；但如果你的应用在创建地图之前就触发了 Cesium 资源加载（例如提前使用了某些 Cesium 工具函数），则需要**更早**设置。

## Vite：vite-plugin-cesium

```bash
pnpm add -D vite-plugin-cesium
```

```typescript
// vite.config.ts
import { defineConfig } from 'vite'
import cesium from 'vite-plugin-cesium'

export default defineConfig({
  plugins: [cesium()],
})
```

插件会把 Cesium 静态资源拷贝/serve 到 `/cesium` 目录，创建地图时传入：

```typescript
const map = new Map3D({
  container: 'map-container',
  cesiumBaseUrl: import.meta.env.BASE_URL + 'cesium',
})
```

## Webpack：copy-webpack-plugin

```bash
pnpm add -D copy-webpack-plugin
```

```javascript
// webpack.config.js
const CopyWebpackPlugin = require('copy-webpack-plugin')

module.exports = {
  plugins: [
    new CopyWebpackPlugin({
      patterns: [{ from: 'node_modules/cesium/Build/Cesium', to: 'cesium' }],
    }),
  ],
}
```

```typescript
const map = new Map3D({
  container: 'map-container',
  cesiumBaseUrl: '/cesium',
})
```

## 提前设置：setCesiumBaseUrl

如遇上述边缘场景（需在 `new Map3D()` **之前**显式设置静态资源路径），可使用独立导出的 `setCesiumBaseUrl`：

```typescript
import { setCesiumBaseUrl, Map3D } from '@globalmap/core'

// 在创建任何 Cesium 资源之前调用
setCesiumBaseUrl('/cesium')

const map = new Map3D({
  container: 'map-container',
  cesiumBaseUrl: '/cesium',
})
```

说明：传入值**原样透传**到 `window.CESIUM_BASE_URL`，不做路径规范化（尾斜杠等由调用方负责）。`Map3D` 构造函数内部复用的正是这个函数。
