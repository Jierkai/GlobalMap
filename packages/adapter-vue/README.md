# @cgx/adapter-vue

## 功能
`adapter-vue` 提供 Vue 3 的适配和桥接。这是一个薄封装层，不包含核心业务逻辑，主要提供 Composables 将 Cgx 的底层响应式信号 (Signal) 桥接为 Vue 的 `Ref`。

## 架构
不复制核心逻辑，仅利用 Vue 3 的 Composition API 和 `@cgx/reactive`：
- **单向绑定**: `toRef` 将 Cgx Signal 转换为 Vue Ref，当 Signal 变化时 Vue 自动触发更新。
- **双向绑定**: `fromRef` 将 Vue Ref 转换为 Cgx Signal。
- **生命周期**: 自动在 Vue 组件 `onUnmounted` 时清理信号订阅。

## 示例
```vue
<template>
  <div>
    <p>当前值: {{ count }}</p>
  </div>
</template>

<script setup lang="ts">
import { toRef, fromRef } from '@cgx/adapter-vue';
import { signal } from '@cgx/reactive';

// 将 Cgx Signal 引入 Vue
const countSignal = signal(0);
const count = toRef(countSignal);

// 将 Vue Ref 变为 Cgx Signal 给底层使用
import { ref } from 'vue';
const vueRef = ref('some-val');
const mySignal = fromRef(vueRef);
</script>
```
