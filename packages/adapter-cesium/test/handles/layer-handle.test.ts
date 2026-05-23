import { describe, it, expect, vi } from 'vitest';
import type { LayerHandle } from '@cgx/core';
import {
  createImageryLayerHandle,
  createTerrainLayerHandle,
} from '../../src/handles/layer';

const fakeViewerHandle = { destroy: vi.fn() } as any;

describe('imagery LayerHandle factory', () => {
  it('returns a Handle satisfying core LayerHandle shape', () => {
    const handle: LayerHandle = createImageryLayerHandle(fakeViewerHandle, {
      id: 'i1', kind: 'imagery', provider: { type: 'xyz', url: 'x' },
    });
    expect(handle.id).toBe('i1');
    expect(typeof handle.dispose).toBe('function');
    expect(typeof handle.update).toBe('function');
    expect(typeof handle.setVisible).toBe('function');
    expect(typeof handle.setOpacity).toBe('function');
    expect(typeof handle.setZIndex).toBe('function');
  });
});

describe('terrain LayerHandle factory', () => {
  it('exposes the same Handle surface', () => {
    const handle = createTerrainLayerHandle(fakeViewerHandle, {
      id: 't1', kind: 'terrain', provider: {},
    });
    expect(handle.id).toBe('t1');
    expect(typeof handle.dispose).toBe('function');
    expect(typeof handle.setVisible).toBe('function');
  });
});
