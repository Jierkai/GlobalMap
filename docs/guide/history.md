# Commands & History

Cgx uses the **Command Pattern** for undo/redo, implemented in `@cgx/history`.

## Basic Usage

```ts
import { createHistory } from '@cgx/history';

const history = createHistory({ data: myApp });

// Execute a command
await history.execute({
  id: crypto.randomUUID(),
  kind: 'move',
  payload: { x: 10, y: 20 },
  apply(ctx) { ctx.data.moveTo(10, 20); },
  revert(ctx) { ctx.data.moveTo(0, 0); },
});

// Undo / Redo
await history.undo();
await history.redo();

// Check state
history.can.undo.get(); // boolean
history.can.redo.get(); // boolean
```

## Command Coalescing

```ts
// Consecutive drag commands merge into one
const dragCmd = {
  kind: 'drag',
  payload: { x, y },
  apply(ctx) { /* ... */ },
  revert(ctx) { /* ... */ },
  coalesceWith(next) {
    return { ...this, payload: next.payload };
  },
};
```

## Integration with Sketch/Edit

Both `@cgx/sketch` and `@cgx/edit` use `@cgx/history` internally:

```ts
import { createHistory } from '@cgx/history';
import { createFeatureEditor } from '@cgx/edit';

const history = createHistory({ data: null });
const editor = createFeatureEditor({ history, features: [...] });

editor.translate(10, 20);
await editor.undo(); // Undo translation
```
