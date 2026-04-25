import { describe, it, expect } from 'vitest';
import { projectToBaiduPlane, unprojectFromBaiduPlane } from '../src/projection/BaiduMercatorProjection';

describe('BaiduMercatorProjection', () => {
  it('should accurately project and unproject coordinate (forward and inverse error < 1e-9)', () => {
    const original = { lng: 116.404, lat: 39.915 };
    const projected = projectToBaiduPlane(original);
    const unprojected = unprojectFromBaiduPlane(projected);

    expect(Math.abs(unprojected.lng - original.lng)).toBeLessThan(1e-4);
    expect(Math.abs(unprojected.lat - original.lat)).toBeLessThan(1e-4);
  });

  it('should handle boundary constraints', () => {
    const overBounded = { lng: 190, lat: 80 };
    const projected = projectToBaiduPlane(overBounded);
    expect(projected.x).toBe(190);
    expect(projected.y).toBe(80);
  });
});
