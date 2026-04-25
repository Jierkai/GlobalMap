# Edit Feature

Edit feature vertices with undo/redo support.

```ts
import { createHistory } from '@cgx/history';
import { createFeatureEditor } from '@cgx/edit';

const history = createHistory({ data: null });
const editor = createFeatureEditor({
  history,
  features: [
    {
      id: 'polygon-1',
      kind: 'polygon',
      vertices: [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 10, y: 10 },
        { x: 0, y: 10 },
      ],
    },
  ],
});

// Select and drag a vertex
editor.select('polygon-1');
editor.startDrag('polygon-1', 0);
editor.updateDrag({ x: 5, y: 5 });
await editor.endDrag();

// Undo the drag
await editor.undo();

// Batch operations
editor.translate(10, 20);
editor.rotate(Math.PI / 4);
editor.scale(2);

// All operations are undoable
await editor.undo(); // Undo scale
await editor.undo(); // Undo rotate
await editor.undo(); // Undo translate
```

## Events

```ts
editor.on('vertex-dragged', ({ before, after, diff }) => {
  console.log('Before:', before);
  console.log('After:', after);
  console.log('Changed:', diff);
});

editor.on('batch-transformed', ({ before, after }) => {
  console.log('Transformed');
});
```
