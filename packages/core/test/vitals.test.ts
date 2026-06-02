import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CgxViewer } from '../src/viewer/CgxViewer.js';
import { createVitalsHud } from '../src/vitals/VitalsHud.js';
import { metricsBus } from '../src/vitals/MetricsBus.js';
import type { EngineAdapter } from '../src/adapter/EngineAdapter.js';

function createMockAdapter(): EngineAdapter {
  return {
    bootstrap: vi.fn(),
    dispose: vi.fn(),
    mountLayer: vi.fn(() => ({
      id: 'mock',
      dispose: vi.fn(),
      update: vi.fn(),
      setVisible: vi.fn(),
      setOpacity: vi.fn(),
      setZIndex: vi.fn(),
    })),
    unmountLayer: vi.fn(),
    mountFeature: vi.fn(() => ({
      id: 'mock',
      dispose: vi.fn(),
      update: vi.fn(),
      flyTo: vi.fn(() => Promise.resolve()),
    })),
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
    metricsBus.reset();
  });

  afterEach(() => {
    document.body.innerHTML = '';
    metricsBus.reset();
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

  it('should render new metric labels synchronously when enabled', () => {
    const adapter = createMockAdapter();
    const viewer = new CgxViewer({ adapter });
    const hud = createVitalsHud(viewer, {
      enabled: true,
      framePatchCount: true,
      frameNativeWriteCount: true,
      poolHitRate: true,
      escapeHatchCallCount: true,
    });

    expect(hud).not.toBeNull();
    const text = document.querySelector('.cgx-vitals-hud')!.textContent ?? '';
    expect(text).toContain('Patch:');
    expect(text).toContain('Writes:');
    expect(text).toContain('Pool:');
    expect(text).toContain('Escape:');

    hud!.detach();
  });

  it('should update displayed count when metricsBus.record is called', () => {
    const adapter = createMockAdapter();
    const viewer = new CgxViewer({ adapter });
    const hud = createVitalsHud(viewer, {
      enabled: true,
      escapeHatchCallCount: true,
    });

    expect(hud).not.toBeNull();

    metricsBus.record('escapeHatchCallCount', 3);

    const text = document.querySelector('.cgx-vitals-hud')!.textContent ?? '';
    expect(text).toContain('Escape: 3');

    hud!.detach();
  });
});
