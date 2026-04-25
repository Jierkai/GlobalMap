# @cgx/reactive

This is the **L2 Reactive Kernel Layer** for Cgx. 
It provides framework-agnostic signal primitives using a robust Push-Pull architecture, backed by `alien-signals`.

## Features
- **Zero Framework Dependency**: Operates independently of Vue/React.
- **Micro Footprint**: Less than 3KB min+gz.
- **Tree-shakeable**: Import only what you use.

## Core API

```typescript
import { signal, computed, effect, batch, untrack, peek } from '@cgx/reactive';

const count = signal(0);
const double = computed(() => count.get() * 2);

const off = effect(() => {
  console.log(`Count is ${count.get()} and double is ${double.get()}`);
});

// Logs: Count is 0 and double is 0

batch(() => {
  count.set(1);
  count.set(2);
});

// Logs: Count is 2 and double is 4
// Batch prevents intermediate execution.

off(); // Disposes the effect
```

## Collections API

```typescript
import { ObservableList, ObservableMap } from '@cgx/reactive/collections';

const list = new ObservableList([1, 2, 3]);
effect(() => console.log('List length:', list.length));

list.push(4); // Trigger!
```

## Restrictions
- **NEVER** import `cesium` directly into this package. L2+ is strictly decoupled from the global `Cesium` context.
