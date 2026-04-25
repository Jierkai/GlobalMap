# Vue 3 Integration

Use Cgx in Vue 3 components.

## Setup

```bash
pnpm add @cgx/adapter-vue vue@^3
```

## Signal to Ref

```vue
<script setup lang="ts">
import { toRef } from '@cgx/adapter-vue';
import { signal } from '@cgx/reactive';

const count = signal(0);
const vueCount = toRef(count); // Vue Ref<number>
</script>

<template>
  <div>
    <p>Count: {{ vueCount }}</p>
    <button @click="count.set(vueCount + 1)">Increment</button>
  </div>
</template>
```

## Ref to Signal

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { fromRef } from '@cgx/adapter-vue';

const vueValue = ref(0);
const cgxSignal = fromRef(vueValue); // Cgx Signal<number>
</script>
```

## Component Pattern

```vue
<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import { createViewer } from '@cgx/core';
import { toRef } from '@cgx/adapter-vue';

const container = ref<HTMLDivElement>();
let viewer: ReturnType<typeof createViewer> | null = null;

onMounted(() => {
  if (container.value) {
    viewer = createViewer(container.value);
  }
});

onUnmounted(() => {
  viewer?.dispose();
});
</script>

<template>
  <div ref="container" style="width: 100%; height: 100vh;" />
</template>
```
