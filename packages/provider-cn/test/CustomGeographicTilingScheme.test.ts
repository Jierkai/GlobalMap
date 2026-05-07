import { describe, it, expect } from 'vitest';
import { ConfigurableGeographicTilingScheme } from '../src/projection/CustomGeographicTilingScheme';

function fromDegrees(longitude: number, latitude: number) {
  return {
    longitude: longitude * Math.PI / 180,
    latitude: latitude * Math.PI / 180,
  };
}

function toRadians(degrees: number): number {
  return degrees * Math.PI / 180;
}

describe('ConfigurableGeographicTilingScheme', () => {
  it('should initialize and inherit from GeographicTilingScheme', () => {
    const scheme = new ConfigurableGeographicTilingScheme();
    expect(typeof scheme.tileXYToNativeRectangle).toBe('function');
    expect(typeof scheme.positionToTileXY).toBe('function');
  });

  it('should correctly calculate tile bounding rectangle based on custom origins', () => {
    const scheme = new ConfigurableGeographicTilingScheme({
      originPt: [-180, 90],
      resolutionsList: [0.703125],
      tileSizePx: 256
    });

    const rect = scheme.tileXYToNativeRectangle(0, 0, 0);
    // tileSpan = 0.703125 * 256 = 180 degrees
    // w = -180, e = 0, n = 90, s = -90
    expect(rect.west).toBeCloseTo(toRadians(-180), 9);
    expect(rect.east).toBeCloseTo(toRadians(0), 9);
    expect(rect.north).toBeCloseTo(toRadians(90), 9);
    expect(rect.south).toBeCloseTo(toRadians(-90), 9);
  });

  it('should correctly convert position to tile indices', () => {
    const scheme = new ConfigurableGeographicTilingScheme({
      originPt: [-180, 90],
      resolutionsList: [0.703125],
      tileSizePx: 256
    });

    // Lon: -90, Lat: 0 => inside tile x:0, y:0
    const carto = fromDegrees(-90, 0);
    const xy = scheme.positionToTileXY(carto, 0);
    expect(xy).toBeDefined();
    expect(xy!.x).toBe(0);
    expect(xy!.y).toBe(0);
  });
});
