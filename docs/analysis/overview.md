# @cgx/analysis — 空间分析工具集

> **模块层级**：L3 Feature API
> **依赖**：`@cgx/reactive`、`@cgx/core`
> **不依赖**：Cesium（零 Cesium import）

---

## 概述

`@cgx/analysis` 提供空间分析能力，所有耗时计算在 Worker 中执行（或主线程异步），支持 AbortController 中止。

**设计原则**：
- **Worker 优先**：所有耗时计算在 Worker 中执行，主线程只做任务分发与结果处理
- **可中止**：所有任务支持 AbortSignal，调用端可随时取消
- **纯数据**：Worker 模块禁止 import 'cesium'，输入/输出均为纯数据（Float64Array / GeoJSON）
- **协议统一**：主线程与 Worker 共用 `protocol.ts`，消息格式 `{ id, kind, input } → { id, ok, result | error }`

---

## 快速开始

```ts
import { createAnalysisRunner } from '@cgx/analysis';

const runner = createAnalysisRunner();

// 缓冲区分析
const buffer = await runner.run('buffer', {
  geojson: { type: 'Point', coordinates: [116.4, 39.9] },
  distance: 1000,
});

// 沿线剖面
const profile = await runner.run('profile', {
  line: new Float64Array([116.0, 39.0, 116.1, 39.0, 116.2, 39.1]),
  sampleDistance: 1000,
  elevation: 100,
});

// 可视域分析
const viewshed = await runner.run('viewshed', {
  observer: [116.4, 39.9, 100],
  heading: 0,
  fov: 90,
  maxDistance: 5000,
  cellSize: 100,
  elevation: 50,
});

// 带中止
const ac = new AbortController();
setTimeout(() => ac.abort(), 5000);
try {
  const result = await runner.run('profile', input, { signal: ac.signal });
} catch (err) {
  if (err instanceof DOMException && err.name === 'AbortError') {
    console.log('任务已中止');
  }
}
```

---

## API

### `createAnalysisRunner(opts?)`

创建 AnalysisRunner 实例。

| 参数 | 类型 | 说明 |
|------|------|------|
| `opts.poolSize` | `number` | Worker 池大小（首版固定为 1） |
| `opts.workerUrl` | `string \| URL` | Worker 入口 URL（构建工具生成） |

### `AnalysisRunner` 接口

| 方法 / 属性 | 说明 |
|-------------|------|
| `run(kind, input, opts?)` | 执行分析任务，返回 `Promise<TaskOutput<K>>` |
| `dispose()` | 销毁 Runner，终止所有 Worker |
| `disposed` | 是否已销毁 |

---

## 任务类型

### buffer — 缓冲区分析

```ts
runner.run('buffer', {
  geojson: { type: 'Point', coordinates: [lng, lat] },
  distance: 1000, // 米
  steps: 32,      // 可选，精度
});
// 返回: GeoJSON Polygon
```

支持 Point / LineString / Polygon / MultiPoint。

### union / intersect / difference — 布尔运算

```ts
runner.run('union', {
  a: { type: 'Polygon', coordinates: [...] },
  b: { type: 'Polygon', coordinates: [...] },
});
// 返回: GeoJSON Polygon | null
```

首版使用简化算法（边界框近似），后续可接入 @turf/boolean-ops。

### profile — 沿线剖面

```ts
runner.run('profile', {
  line: new Float64Array([lng0, lat0, lng1, lat1, ...]),
  sampleDistance: 1000, // 米
  elevation: 100,       // 固定高程或 Float64Array
});
// 返回: { points, elevations, distances }
```

### viewshed — 可视域分析

```ts
runner.run('viewshed', {
  observer: [lng, lat, alt],
  heading: 0,          // 度，0=北
  fov: 90,             // 度
  maxDistance: 5000,    // 米
  cellSize: 100,       // 米
  elevation: 50,       // 固定高程或 Float64Array
});
// 返回: { grid, width, height, origin, cellSizeDeg }
```

---

## Worker 通信协议

```ts
// 主线程 → Worker
interface TaskRequest {
  id: string;
  kind: TaskKind;
  input: TaskInput;
}

// Worker → 主线程
type TaskResponse =
  | { id: string; ok: true; result: TaskOutput }
  | { id: string; ok: false; error: string }
  | { id: string; ok: false; aborted: true };

// 主线程 → Worker（中止）
interface AbortMessage {
  type: 'abort';
  id: string;
}
```

---

## 约束

- **禁止**在 Worker 中 import 'cesium'
- **禁止**把 @turf/* 全量打进主 bundle（按需 import）
- 所有输入/输出为纯数据（Float64Array / GeoJSON）
- 首版分析算法为简化实现，后续迭代优化精度
