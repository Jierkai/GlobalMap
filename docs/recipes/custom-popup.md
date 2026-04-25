# Custom Popup

Create popups with custom content and positioning.

```ts
import { createPopup } from '@cgx/ui';

// Simple text popup
const popup = createPopup({
  content: 'Hello from Cgx!',
  position: { x: 100, y: 200 },
  placement: 'top',
  offset: [0, 10],
});

popup.show();

// HTML content
const htmlPopup = createPopup({
  content: '<div class="info"><h3>Beijing</h3><p>Population: 21M</p></div>',
  position: { x: 300, y: 150 },
  placement: 'bottom',
});

htmlPopup.show();

// Dynamic content (render function)
const dynamicPopup = createPopup({
  content: () => {
    const el = document.createElement('div');
    el.innerHTML = `<strong>Dynamic</strong> at ${Date.now()}`;
    return el;
  },
  lifecycle: 'follow', // Follows position updates
});

// Update position
dynamicPopup.updatePosition({ x: 400, y: 300 });

// Events
popup.on('opened', () => console.log('Popup opened'));
popup.on('closed', () => console.log('Popup closed'));
popup.on('position-changed', ({ position }) => {
  console.log('Moved to:', position);
});

// Cleanup
popup.destroy();
```

## Lifecycle Modes

| Mode | Behavior |
|------|----------|
| `pinned` | Stays at fixed position |
| `follow` | Updates position when `updatePosition` is called |
| `once` | Auto-destroys after first hide |
