import { describe, it, expect, vi } from 'vitest';
import { CgxViewer } from '../src/viewer/CgxViewer.js';
import { CgxError, ErrorCodes } from '../src/errors/CgxError.js';
import type { Capability } from '../src/capability/Capability.js';

describe('CgxViewer', () => {
  it('should initialize and reach ready status', async () => {
    const mockAdapter = {
      initialize: vi.fn().mockResolvedValue(undefined),
      dispose: vi.fn().mockResolvedValue(undefined),
    };

    const viewer = new CgxViewer({ container: 'app', adapter: mockAdapter });
    expect(viewer.status()).toBe('idle');

    const onReady = vi.fn();
    viewer.on('ready', onReady);

    await viewer.ready();
    expect(viewer.status()).toBe('ready');
    expect(mockAdapter.initialize).toHaveBeenCalledWith('app');
    expect(onReady).toHaveBeenCalledWith({ viewer });
  });

  it('should handle dispose idempotently', async () => {
    const mockAdapter = {
      initialize: vi.fn().mockResolvedValue(undefined),
      dispose: vi.fn().mockResolvedValue(undefined),
    };

    const viewer = new CgxViewer({ container: 'app', adapter: mockAdapter });
    await viewer.ready();

    const onDispose = vi.fn();
    viewer.on('dispose', onDispose);

    await viewer.dispose();
    expect(viewer.status()).toBe('disposed');
    expect(mockAdapter.dispose).toHaveBeenCalledTimes(1);
    expect(onDispose).toHaveBeenCalledWith({ viewer });

    await viewer.dispose();
    expect(mockAdapter.dispose).toHaveBeenCalledTimes(1);
  });

  it('should inject capabilities and reject duplicates', async () => {
    const viewer = new CgxViewer({ container: 'app', adapter: {} });

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
    const viewer = new CgxViewer({ container: 'app', adapter: {} });
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
    const viewer = new CgxViewer({ container: 'app', adapter: {} });
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
    const viewer = new CgxViewer({ container: 'app', adapter: {} });

    await viewer.dispose();

    await expect(viewer.ready()).rejects.toMatchObject({
      code: ErrorCodes.VIEWER_NOT_READY,
    });
  });
});
