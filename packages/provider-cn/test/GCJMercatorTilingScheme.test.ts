import { describe, it, expect } from 'vitest';
import * as Cesium from "cesium";
import { applyGcj02Offset, revertGcj02Offset, Gcj02TilingScheme } from '../src/projection/GCJMercatorTilingScheme';

describe('GCJMercatorTilingScheme', () => {
  it('should correctly apply and revert GCJ-02 offset inside China', () => {
    // A coordinate inside China (e.g., Beijing)
    const lng = 116.404;
    const lat = 39.915;
    
    const [shiftedLng, shiftedLat] = applyGcj02Offset(lng, lat);
    const [revertedLng, revertedLat] = revertGcj02Offset(shiftedLng, shiftedLat);
    
    // Check if error is within acceptable range
    expect(Math.abs(revertedLng - lng)).toBeLessThan(1e-5); // GCJ-02 analytical inverse is an approximation
    expect(Math.abs(revertedLat - lat)).toBeLessThan(1e-5);
  });

  it('should bypass offset for points outside China', () => {
    const lng = -122.4194;
    const lat = 37.7749;
    
    const [shiftedLng, shiftedLat] = applyGcj02Offset(lng, lat);
    expect(shiftedLng).toBe(lng);
    expect(shiftedLat).toBe(lat);
  });

  it('should correctly integrate with Cesium Projection in Scheme', () => {
    const scheme = new Gcj02TilingScheme();
    const carto = Cesium.Cartographic.fromDegrees(116.404, 39.915);
    const projected = scheme.projection.project(carto);
    const unprojected = scheme.projection.unproject(projected);
    
    expect(Math.abs(Cesium.Math.toDegrees(unprojected.longitude) - 116.404)).toBeLessThan(1e-5);
    expect(Math.abs(Cesium.Math.toDegrees(unprojected.latitude) - 39.915)).toBeLessThan(1e-5);
  });
});
