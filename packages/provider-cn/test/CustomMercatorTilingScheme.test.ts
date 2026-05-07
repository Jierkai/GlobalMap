import { describe, it, expect } from 'vitest';
import { ConfigurableMercatorTilingScheme } from '../src/projection/CustomMercatorTilingScheme';

function fromDegrees(longitude: number, latitude: number) {
  return {
    longitude: longitude * Math.PI / 180,
    latitude: latitude * Math.PI / 180,
  };
}

describe('ConfigurableMercatorTilingScheme', () => {
  it('should initialize with default parameters', () => {
    const scheme = new ConfigurableMercatorTilingScheme();
    expect(typeof scheme.tileXYToNativeRectangle).toBe('function');
    expect(typeof scheme.positionToTileXY).toBe('function');
  });

  it('should calculate native rectangle according to custom resolutions', () => {
    const scheme = new ConfigurableMercatorTilingScheme({
      originPt: [0, 0],
      resolutionsList: [1000],
      tileSizePx: 256
    });

    const rect = scheme.tileXYToNativeRectangle(1, 1, 0);
    expect(rect.west).toBe(256000);
    expect(rect.south).toBe(-512000); // 0 - 2*256000
    expect(rect.east).toBe(512000);
    expect(rect.north).toBe(-256000);
  });

  it('should map position to tile XY according to custom resolutions', () => {
    const scheme = new ConfigurableMercatorTilingScheme({
      resolutionsList: [156543.03392],
      tileSizePx: 256
    });

    const carto = fromDegrees(0, 0);
    const xy = scheme.positionToTileXY(carto, 0);
    expect(xy).toBeDefined();
    expect(xy!.x).toBeGreaterThanOrEqual(0);
    expect(xy!.y).toBeGreaterThanOrEqual(0);
  });
});
