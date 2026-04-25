# Signals

Cgx uses a **signal-based reactive system** powered by `alien-signals`.

## Basic Usage

```ts
import { signal, computed, effect } from '@cgx/reactive';

// Create a signal
const count = signal(0);

// Create a derived signal
const doubled = computed(() => count.get() * 2);

// Create a side effect
const stop = effect(() => {
  console.log('Count:', count.get(), 'Doubled:', doubled.get());
});

count.set(5); // Logs: Count: 5 Doubled: 10

stop(); // Clean up
```

## Batch Updates

```ts
import { batch } from '@cgx/reactive';

const a = signal(1);
const b = signal(2);

effect(() => console.log('Sum:', a.get() + b.get()));

batch(() => {
  a.set(10);
  b.set(20);
  // Only one log: Sum: 30
});
```

## Framework Integration

### Vue 3

```ts
import { toRef } from '@cgx/adapter-vue';

const count = signal(0);
const vueRef = toRef(count); // Vue Ref<number>
```

