import { describe, it, expect } from 'vitest';
import { BaiduMapTilingScheme } from '../src/projection/BaiduMercatorTilingScheme';

function fromDegrees(longitude: number, latitude: number) {
  return {
    longitude: longitude * Math.PI / 180,
    latitude: latitude * Math.PI / 180,
  };
}

function toDegrees(radians: number): number {
  return radians * 180 / Math.PI;
}

describe('BaiduMercatorTilingScheme', () => {
  it('should initialize and perform correct projection wrapping', () => {
    const resolutions = [2000, 1000, 500];
    const scheme = new BaiduMapTilingScheme({ resolutions });

    const carto = fromDegrees(116.404, 39.915);
    const projected = scheme.projection.project(carto);
    const unprojected = scheme.projection.unproject(projected);

    expect(Math.abs(toDegrees(unprojected.longitude) - 116.404)).toBeLessThan(1e-4);
    expect(Math.abs(toDegrees(unprojected.latitude) - 39.915)).toBeLessThan(1e-4);
  });

  it('should compute tile native rectangle', () => {
    const resolutions = [2000, 1000, 500];
    const scheme = new BaiduMapTilingScheme({ resolutions });
    const rect = scheme.tileXYToNativeRectangle(1, 1, 1);
    expect(rect.west).toBe(1000);
    expect(rect.east).toBe(2000);
  });

  it('should map position to tile XY', () => {
    const resolutions = [2000, 1000, 500];
    const scheme = new BaiduMapTilingScheme({ resolutions });
    // position at origin will project, tile calculation depends on resolution
    const carto = fromDegrees(0, 0);
    const xy = scheme.positionToTileXY(carto, 1);
    expect(xy).toBeDefined();
  });
});
