import { describe, it, expect, vi } from 'vitest';
import type { FeatureHandle } from '@cgx/core';
import { __test__ } from '../../src';
import { createViewer } from '../../src/viewer';
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

  it('entity updates are coalesced until flush', () => {
    __test__.resetMetrics();
    __test__.resetPools();
    const viewer = createViewer('test-container');

    const h = createEntityFeatureHandle(viewer, {
      id: 'p3',
      kind: 'point',
      position: { lng: 0, lat: 0 },
      point: { pixelSize: 4 },
    });
    const entity = h.unsafeNative?.() as any;

    h.update({ point: { pixelSize: 8 } });
    h.update({ point: { pixelSize: 12 } });

    expect(entity.point).toEqual(expect.objectContaining({ pixelSize: 4 }));

    __test__.flushUpdates();

    expect(entity.point).toEqual(expect.objectContaining({ pixelSize: 12 }));
    expect(__test__.getMetricsSnapshot()).toEqual({
      framePatchCount: 2,
      frameNativeWriteCount: 1,
    });

    h.dispose();
    viewer.destroy();
  });

  it('same-id entity handles do not share a batch queue entry', () => {
    __test__.resetMetrics();
    __test__.resetPools();
    const firstViewer = createViewer('test-container-a');
    const secondViewer = createViewer('test-container-b');

    const first = createEntityFeatureHandle(firstViewer, {
      id: 'shared-id',
      kind: 'point',
      position: { lng: 0, lat: 0 },
      point: { pixelSize: 4 },
    });
    const second = createEntityFeatureHandle(secondViewer, {
      id: 'shared-id',
      kind: 'point',
      position: { lng: 1, lat: 1 },
      point: { pixelSize: 6 },
    });
    const firstEntity = first.unsafeNative?.() as any;
    const secondEntity = second.unsafeNative?.() as any;

    first.update({ point: { pixelSize: 8 } });
    second.update({ point: { pixelSize: 12 } });

    __test__.flushUpdates();

    expect(firstEntity.point).toEqual(expect.objectContaining({ pixelSize: 8 }));
    expect(secondEntity.point).toEqual(expect.objectContaining({ pixelSize: 12 }));

    first.dispose();
    second.dispose();
    firstViewer.destroy();
    secondViewer.destroy();
  });
});
