import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CgxViewer } from '../src/viewer/CgxViewer.js';
import { CgxError, ErrorCodes } from '../src/errors/CgxError.js';
import type { Capability } from '../src/capability/Capability.js';
import type { EngineAdapter } from '../src/adapter/EngineAdapter.js';

function createMockAdapter(): EngineAdapter & { __nativeViewer: unknown } {
  const nativeViewer = { scene: {}, camera: {} };
  return {
    __nativeViewer: nativeViewer,
    bootstrap: vi.fn().mockResolvedValue(undefined),
    dispose: vi.fn().mockResolvedValue(undefined),
    mountLayer: vi.fn(() => ({ id: 'mock', dispose: vi.fn(), update: vi.fn(), setVisible: vi.fn(), setOpacity: vi.fn(), setZIndex: vi.fn() })),
    unmountLayer: vi.fn(),
    mountFeature: vi.fn(() => ({ id: 'mock', dispose: vi.fn(), update: vi.fn(), flyTo: vi.fn().mockResolvedValue(undefined) })),
    unmountFeature: vi.fn(),
    mountWeatherEffect: vi.fn(() => ({ id: 'mock', dispose: vi.fn(), update: vi.fn() })),
    unmountWeatherEffect: vi.fn(),
    pickAt: vi.fn(() => null),
    project: vi.fn(() => ({ x: 0, y: 0, z: 0 })),
    unproject: vi.fn(() => ({ lng: 0, lat: 0, alt: 0 })),
    unsafeNative: vi.fn(() => nativeViewer),
  };
}

describe('CgxViewer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize and reach ready status', async () => {
    const adapter = createMockAdapter();
    const viewer = new CgxViewer({
      adapter,
      scene: {
        center: { lng: 120, lat: 30 },
        resolutionScale: 1.25,
      },
      basemaps: [
        {
          id: 'base-gaode',
          provider: 'gaode',
          style: 'img',
        },
      ],
    });
    expect(viewer.status()).toBe('idle');
    expect(viewer.options).toEqual({
      scene: {
        center: { lng: 120, lat: 30 },
        resolutionScale: 1.25,
      },
      terrain: undefined,
      basemaps: [
        {
          id: 'base-gaode',
          provider: 'gaode',
          style: 'img',
        },
      ],
      layers: undefined,
    });

    const onReady = vi.fn();
    viewer.on('ready', onReady);

    await viewer.ready();
    expect(viewer.status()).toBe('ready');
    expect(adapter.bootstrap).toHaveBeenCalledWith(viewer.options);
    expect(onReady).toHaveBeenCalledWith({ viewer });
  });

  it('should handle dispose idempotently', async () => {
    const adapter = createMockAdapter();
    const viewer = new CgxViewer({ adapter });
    await viewer.ready();

    const onDispose = vi.fn();
    viewer.on('dispose', onDispose);

    await viewer.dispose();
    expect(viewer.status()).toBe('disposed');
    expect(adapter.dispose).toHaveBeenCalledTimes(1);
    expect(onDispose).toHaveBeenCalledWith({ viewer });

    await viewer.dispose();
    expect(adapter.dispose).toHaveBeenCalledTimes(1);
  });

  it('should return the native Cesium viewer', () => {
    const adapter = createMockAdapter();
    const viewer = new CgxViewer({ adapter });

    expect(viewer.getCesiumViewer()).toBe(adapter.__nativeViewer);
    expect(viewer.unsafeNative()).toBe(adapter.__nativeViewer);
  });

  it('should inject capabilities and reject duplicates', async () => {
    const adapter = createMockAdapter();
    const viewer = new CgxViewer({ adapter });

    const mockCap: Capability<{ test: boolean }> = {
      id: 'mockCap',
      install: () => ({ test: true }),
      dispose: vi.fn(),
    };

    const instance = viewer.use(mockCap);
    expect(instance.test).toBe(true);

    expect(() => viewer.use(mockCap)).toThrowError(CgxError);
    try {
      viewer.use(mockCap);
    } catch (e) {
      expect(e).toBeInstanceOf(CgxError);
      expect((e as CgxError).code).toBe(ErrorCodes.CAPABILITY_ALREADY_INSTALLED);
    }
  });

  it('should clean up capabilities on dispose', async () => {
    const adapter = createMockAdapter();
    const viewer = new CgxViewer({ adapter });
    const disposeFn = vi.fn();
    const mockCap: Capability<unknown> = {
      id: 'mockCap',
      install: () => ({}),
      dispose: disposeFn,
    };

    viewer.use(mockCap);
    await viewer.dispose();
    expect(disposeFn).toHaveBeenCalledTimes(1);
  });

  it('should notify uncaught handlers when event listeners throw', async () => {
    const adapter = createMockAdapter();
    const viewer = new CgxViewer({ adapter });
    const uncaught = vi.fn();

    viewer.onUncaught(uncaught);
    viewer.on('ready', () => {
      throw new Error('boom');
    });

    await viewer.ready();
    expect(uncaught).toHaveBeenCalledTimes(1);
    expect(uncaught.mock.calls[0][0]).toBeInstanceOf(Error);
  });

  it('should reject ready after dispose', async () => {
    const adapter = createMockAdapter();
    const viewer = new CgxViewer({ adapter });

    await viewer.dispose();

    await expect(viewer.ready()).rejects.toMatchObject({
      code: ErrorCodes.VIEWER_NOT_READY,
    });
  });

  it('should validate malformed base options', () => {
    expect(() => new CgxViewer({
      adapter: undefined as any,
    })).toThrowError(CgxError);

    const adapter = createMockAdapter();
    expect(() => new CgxViewer({
      adapter,
      scene: {
        center: { lng: Number.NaN, lat: 30 },
      },
    })).toThrowError(CgxError);

    expect(() => new CgxViewer({
      adapter,
      scene: {
        resolutionScale: 0,
      },
    })).toThrowError(CgxError);

    expect(() => new CgxViewer({
      adapter,
      basemaps: [
        {
          id: 'invalid-basemap',
          kind: 'data',
          sourceType: 'geojson',
        },
      ] as any,
    })).toThrowError(CgxError);
  });

  it('should reject legacy nested options explicitly', () => {
    const adapter = createMockAdapter();
    expect(() => new CgxViewer({
      adapter,
      ...( {
        options: {
          scene: {
            center: { lng: 120, lat: 30 },
          },
        },
      } as any),
    } as any)).toThrowError(CgxError);
  });
});
