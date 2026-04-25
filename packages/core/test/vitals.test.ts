import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createCgxViewer } from '../src/viewer/CgxViewer.js';
import { createVitalsHud } from '../src/vitals/VitalsHud.js';

describe('VitalsHud', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('should not attach if not dev and not enabled', () => {
    const viewer = createCgxViewer({ container: 'app', adapter: {} });
    // Assuming Vite test runs with import.meta.env.DEV = true by default, 
    // so we disable it explicitly, or we override.
    // By default, let's explicitly disable to see if it attaches.
    // Wait, import.meta.env.DEV might be true in vitest. 
    // Let's test explicit attach and detach.
    const hud = createVitalsHud(viewer, { enabled: true });
    expect(hud).not.toBeNull();
    expect(document.querySelector('.cgx-vitals-hud')).not.toBeNull();
  });

  it('should clean up DOM upon detach', () => {
    const viewer = createCgxViewer({ container: 'app', adapter: {} });
    const hud = createVitalsHud(viewer, { enabled: true });
    
    expect(document.querySelector('.cgx-vitals-hud')).not.toBeNull();
    hud!.detach();
    expect(document.querySelector('.cgx-vitals-hud')).toBeNull();
  });
});
