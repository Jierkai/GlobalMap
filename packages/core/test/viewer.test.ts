import { describe, it, expect, vi } from 'vitest';
import { createCgxViewer } from '../src/viewer/CgxViewer.js';
import { CgxError, ErrorCodes } from '../src/errors/CgxError.js';
import type { Capability } from '../src/capability/Capability.js';

describe('CgxViewer', () => {
  it('should initialize and reach ready status', async () => {
    const mockAdapter = {
      initialize: vi.fn().mockResolvedValue(undefined),
      dispose: vi.fn().mockResolvedValue(undefined),
    };

    const viewer = createCgxViewer({ container: 'app', adapter: mockAdapter });
    expect(viewer.status()).toBe('idle');
    
    await viewer.ready();
    expect(viewer.status()).toBe('ready');
    expect(mockAdapter.initialize).toHaveBeenCalledWith('app');
  });

  it('should handle dispose idempotently', async () => {
    const mockAdapter = {
      initialize: vi.fn().mockResolvedValue(undefined),
      dispose: vi.fn().mockResolvedValue(undefined),
    };

    const viewer = createCgxViewer({ container: 'app', adapter: mockAdapter });
    await viewer.ready();
    
    await viewer.dispose();
    expect(viewer.status()).toBe('disposed');
    expect(mockAdapter.dispose).toHaveBeenCalledTimes(1);

    await viewer.dispose();
    expect(mockAdapter.dispose).toHaveBeenCalledTimes(1);
  });

  it('should inject capabilities and reject duplicates', async () => {
    const viewer = createCgxViewer({ container: 'app', adapter: {} });
    
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
    } catch (e: any) {
      expect(e.code).toBe(ErrorCodes.CAPABILITY_ALREADY_INSTALLED);
    }
  });

  it('should clean up capabilities on dispose', async () => {
    const viewer = createCgxViewer({ container: 'app', adapter: {} });
    const disposeFn = vi.fn();
    const mockCap: Capability<any> = {
      id: 'mockCap',
      install: () => ({}),
      dispose: disposeFn,
    };

    viewer.use(mockCap);
    await viewer.dispose();
    expect(disposeFn).toHaveBeenCalledTimes(1);
  });
});
