import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CgxViewer } from '../src/viewer/CgxViewer.js';
import { CgxError, ErrorCodes } from '../src/errors/CgxError.js';
import type { Capability } from '../src/capability/Capability.js';

const mocks = vi.hoisted(() => {
  const nativeViewer = { scene: {}, camera: {} };
  const handle = { destroy: vi.fn() };
  const runtime = {
    bootstrap: vi.fn().mockResolvedValue(undefined),
    dispose: vi.fn().mockResolvedValue(undefined),
    unsafeNative: vi.fn(() => nativeViewer),
  };
  return {
    nativeViewer,
    handle,
    runtime,
    createCesiumViewer: vi.fn(() => handle),
    createCesiumRuntime: vi.fn(() => runtime),
  };
});

vi.mock('@cgx/adapter-cesium', () => ({
  createViewer: mocks.createCesiumViewer,
  createCesiumRuntime: mocks.createCesiumRuntime,
}));

describe('CgxViewer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize and reach ready status', async () => {
    const viewer = new CgxViewer({
      container: 'app',
      cesium: { shouldAnimate: true },
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
    expect(mocks.createCesiumViewer).toHaveBeenCalledWith('app', { shouldAnimate: true });

    const onReady = vi.fn();
    viewer.on('ready', onReady);

    await viewer.ready();
    expect(viewer.status()).toBe('ready');
    expect(mocks.runtime.bootstrap).toHaveBeenCalledWith(viewer.options);
    expect(onReady).toHaveBeenCalledWith({ viewer });
  });

  it('should handle dispose idempotently', async () => {
    const viewer = new CgxViewer({ container: 'app' });
    await viewer.ready();

    const onDispose = vi.fn();
    viewer.on('dispose', onDispose);

    await viewer.dispose();
    expect(viewer.status()).toBe('disposed');
    expect(mocks.runtime.dispose).toHaveBeenCalledTimes(1);
    expect(mocks.handle.destroy).toHaveBeenCalledTimes(1);
    expect(onDispose).toHaveBeenCalledWith({ viewer });

    await viewer.dispose();
    expect(mocks.runtime.dispose).toHaveBeenCalledTimes(1);
    expect(mocks.handle.destroy).toHaveBeenCalledTimes(1);
  });

  it('should return the native Cesium viewer', () => {
    const viewer = new CgxViewer({ container: 'app' });

    expect(viewer.getCesiumViewer()).toBe(mocks.nativeViewer);
    expect(viewer.unsafeNative()).toBe(mocks.nativeViewer);
  });

  it('should inject capabilities and reject duplicates', async () => {
    const viewer = new CgxViewer({ container: 'app' });

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
    const viewer = new CgxViewer({ container: 'app' });
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
    const viewer = new CgxViewer({ container: 'app' });
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
    const viewer = new CgxViewer({ container: 'app' });

    await viewer.dispose();

    await expect(viewer.ready()).rejects.toMatchObject({
      code: ErrorCodes.VIEWER_NOT_READY,
    });
  });

  it('should validate malformed base options', () => {
    expect(() => new CgxViewer({
      container: '',
    })).toThrowError(CgxError);

    expect(() => new CgxViewer({
      container: 'app',
      scene: {
        center: { lng: Number.NaN, lat: 30 },
      },
    })).toThrowError(CgxError);

    expect(() => new CgxViewer({
      container: 'app',
      scene: {
        resolutionScale: 0,
      },
    })).toThrowError(CgxError);

    expect(() => new CgxViewer({
      container: 'app',
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
    expect(() => new CgxViewer({
      container: 'app',
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
