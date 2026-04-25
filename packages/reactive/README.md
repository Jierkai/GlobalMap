# @cgx/reactive

## 功能
`reactive` 为整个地图系统提供了无框架依赖的响应式内核机制。底层基于极速的 `alien-signals` 驱动，提供了 Push-Pull 架构的信号 (Signal) 状态追踪能力。

## 架构
提供标准的信号原语，方便上层业务实现响应式更新：
- `signal`: 创建读写的响应式信号。
- `computed`: 创建依赖自动追踪的只读派生信号。
- `effect`: 追踪依赖并在值变更时执行副作用。
- `batch` / `untrack` / `peek`: 高级调度工具。

## 示例
```typescript
import { signal, computed, effect, batch } from '@cgx/reactive';

// 创建响应式状态
const count = signal(0);
const double = computed(() => count.get() * 2);

// 监听响应式更新
const stop = effect(() => {
  console.log(`count: ${count.get()}, double: ${double.get()}`);
});

// 批量更新，触发一次 effect
batch(() => {
  count.set(1);
  count.set(2);
});

// 取消监听
stop();
```
