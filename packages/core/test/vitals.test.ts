import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CgxViewer } from '../src/viewer/CgxViewer.js';
import { createVitalsHud } from '../src/vitals/VitalsHud.js';
import type { EngineAdapter } from '../src/adapter/EngineAdapter.js';

function createMockAdapter(): EngineAdapter {
  return {
    bootstrap: vi.fn(),
    dispose: vi.fn(),
    mountLayer: vi.fn(() => ({ id: 'mock', dispose: vi.fn(), update: vi.fn() })),
    unmountLayer: vi.fn(),
    mountFeature: vi.fn(() => ({ id: 'mock', dispose: vi.fn(), update: vi.fn() })),
    unmountFeature: vi.fn(),
    mountWeatherEffect: vi.fn(() => ({ id: 'mock', dispose: vi.fn(), update: vi.fn() })),
    unmountWeatherEffect: vi.fn(),
    pickAt: vi.fn(() => null),
    project: vi.fn(() => ({ x: 0, y: 0, z: 0 })),
    unproject: vi.fn(() => ({ lng: 0, lat: 0, alt: 0 })),
    unsafeNative: vi.fn(),
  };
}

describe('VitalsHud', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('should not attach if not dev and not enabled', () => {
    const adapter = createMockAdapter();
    const viewer = new CgxViewer({ adapter });
    const hud = createVitalsHud(viewer, { enabled: true });
    expect(hud).not.toBeNull();
    expect(document.querySelector('.cgx-vitals-hud')).not.toBeNull();
  });

  it('should clean up DOM upon detach', () => {
    const adapter = createMockAdapter();
    const viewer = new CgxViewer({ adapter });
    const hud = createVitalsHud(viewer, { enabled: true });
    
    expect(document.querySelector('.cgx-vitals-hud')).not.toBeNull();
    hud!.detach();
    expect(document.querySelector('.cgx-vitals-hud')).toBeNull();
  });
});
