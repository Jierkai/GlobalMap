# Cesium 静态资源

Cesium 运行时需要加载 Worker、Assets、Widgets 等静态资源，路径由 `window.CESIUM_BASE_URL` 决定。GlobalMap **自动识别**该路径，消费者无需手动配置。

## 自动识别机制

GlobalMap 内部按以下探测链自动识别 `CESIUM_BASE_URL`：

1. **`window.CESIUM_BASE_URL` 已设** -- npm 依赖场景：打包器插件自动注入（推荐）；
2. **script 标签探测** -- lib 场景：遍历 `document.scripts`，匹配 `Cesium.js` 的 src 推导其所在目录；
3. **回退 `/cesium`** -- 以上均未命中时回退约定值并 `console.warn` 引导装插件。

## npm 依赖场景（推荐，零配置）

### Vite：vite-plugin-cesium

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

插件会自动：

- dev 模式 serve Cesium 静态资源到 `/cesium` 目录；
- build 时复制资源到 `dist/cesium`；
- 往 chunk intro 注入 `window.CESIUM_BASE_URL = '/cesium'`。

创建地图时**无需传任何 Cesium 路径参数**：

```typescript
const map = new Map3D({
  container: 'map-container',
})
```

### Webpack：copy-webpack-plugin + DefinePlugin

```bash
pnpm add -D copy-webpack-plugin
```

```javascript
// webpack.config.js
const CopyWebpackPlugin = require('copy-webpack-plugin')
const webpack = require('webpack')

module.exports = {
  plugins: [
    new CopyWebpackPlugin({
      patterns: [{ from: 'node_modules/cesium/Build/Cesium', to: 'cesium' }],
    }),
    new webpack.DefinePlugin({
      CESIUM_BASE_URL: JSON.stringify('/cesium'),
    }),
  ],
}
```

`DefinePlugin` 将 `window.CESIUM_BASE_URL` 替换为字面量，探测①命中，同样零配置。

## lib 场景（script 引入）

将 Cesium 拷入 public 目录并通过 `<script>` 引入：

```html
<script src="/lib/cesium/Cesium.js"></script>
```

GlobalMap 从 script 标签的 src 推导出目录 `/lib/cesium`，探测②命中，无需额外配置。

## 边缘场景说明

Cesium **并非在模块加载时**读取 `CESIUM_BASE_URL`，而是在**首次创建 Worker / 加载资源时**才读取。因此 `new Map3D()` 构造时识别通常是安全的。

如果你的应用在创建地图之前就触发了 Cesium 资源加载（例如提前使用了某些 Cesium 工具函数），可以在 `new Map3D()` 之前手动设置：

```typescript
// 在创建任何 Cesium 资源之前手动设置
window.CESIUM_BASE_URL = '/cesium'

const map = new Map3D({
  container: 'map-container',
})
```
