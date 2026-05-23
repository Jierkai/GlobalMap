import { describe, it, expect, vi } from 'vitest';
import type { FeatureHandle } from '@cgx/core';
import { createEntityFeatureHandle } from '../../src/handles/feature-entity';
import {
  createPrimitiveFeatureHandle,
  createBatchedPrimitiveFeatureHandle,
} from '../../src/handles/feature-primitive';

const fakeViewer = { destroy: vi.fn() } as any;

describe('FeatureHandle factories', () => {
  it('entity factory returns FeatureHandle shape', () => {
    const h: FeatureHandle = createEntityFeatureHandle(fakeViewer, {
      id: 'p1', kind: 'point', position: { lng: 0, lat: 0 },
    });
    expect(h.id).toBe('p1');
    expect(typeof h.flyTo).toBe('function');
    expect(typeof h.dispose).toBe('function');
    expect(typeof h.update).toBe('function');
    expect(typeof h.unsafeNative).toBe('function');
  });

  it('primitive factory returns FeatureHandle shape', () => {
    const h: FeatureHandle = createPrimitiveFeatureHandle(fakeViewer, {
      id: 'm1', kind: 'model', position: { lng: 0, lat: 0 }, model: { uri: 'x.glb' } as any,
    });
    expect(h.id).toBe('m1');
    expect(typeof h.dispose).toBe('function');
  });

  it('batched factory accepts a batch of features', () => {
    const h: FeatureHandle = createBatchedPrimitiveFeatureHandle(fakeViewer, [
      { id: 'a', kind: 'point', position: { lng: 0, lat: 0 } },
      { id: 'b', kind: 'point', position: { lng: 1, lat: 1 } },
    ]);
    expect(h.id).toBe('a');
    expect(typeof h.dispose).toBe('function');
  });

  it('entity dispose is idempotent', () => {
    const h = createEntityFeatureHandle(fakeViewer, {
      id: 'p2', kind: 'point', position: { lng: 0, lat: 0 },
    });
    h.dispose();
    expect(() => h.dispose()).not.toThrow();
  });
});
