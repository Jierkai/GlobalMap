# @cgx/analysis

## 功能
`analysis` 模块集成了各种空间和三维分析能力，如剖面分析 (Profile)、缓冲分析 (Buffer) 或可视域分析 (Viewshed)。支持将耗时的空间计算置于 Web Worker 中执行或异步处理，并支持使用 `AbortController` 中止计算。

## 架构
模块主要围绕任务调度和数据处理构建：
- **AnalysisRunner**: 核心的分析执行器，可通过 `createAnalysisRunner` 实例化，支持基于 Worker 的分析任务调度。
- **Protocol**: 定义了任务的输入/输出类型，如 `BufferInput`, `ProfileInput` 等。
- 采用输入/输出均为纯数据的设计，隔离了底层引擎 (Cesium) 的引入。

## 示例
```typescript
import { createAnalysisRunner } from '@cgx/analysis';

const runner = createAnalysisRunner();

async function runAnalysis() {
  const ac = new AbortController();
  
  try {
    // 运行缓冲分析
    const result = await runner.run('buffer', {
      geojson: { type: 'Point', coordinates: [116.4, 39.9] },
      distance: 1000,
    }, { signal: ac.signal });

    console.log('分析结果：', result);
  } catch (err) {
    if (err.name === 'AbortError') {
      console.log('分析被中止');
    }
  }
}
```
