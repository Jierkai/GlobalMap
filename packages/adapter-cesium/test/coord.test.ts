import { describe, it, expect } from 'vitest';
import { LngLatPosition, toCartesian3, fromCartesian3 } from '../src/coord';

describe('coord', () => {
  it('should convert LngLat to Cartesian3 and back', () => {
    const original = { lng: 116.4, lat: 39.9, alt: 100 };
    const cart3 = toCartesian3(original);
    
    expect(cart3).toBeDefined();
    
    const restored = fromCartesian3(cart3);
    // Based on our mock, they should match exactly because of math
    expect(restored.lng).toBeCloseTo(116.4);
    expect(restored.lat).toBeCloseTo(39.9);
    expect(restored.alt).toBeCloseTo(100);
  });

  it('should create LngLatPosition from degrees and radians', () => {
    expect(LngLatPosition.fromDegrees(116.4, 39.9, 100)).toMatchObject({
      lng: 116.4,
      lat: 39.9,
      alt: 100,
    });

    const fromRadians = LngLatPosition.fromRadians(Math.PI, Math.PI / 2, 50);
    expect(fromRadians.lng).toBeCloseTo(180);
    expect(fromRadians.lat).toBeCloseTo(90);
    expect(fromRadians.alt).toBe(50);
  });

  it('should create LngLatPosition from Cartesian3 and WebMercator coordinates', () => {
    const fromCartesian = LngLatPosition.fromCartesian3({ x: 116.4, y: 39.9, z: 100 } as any);
    expect(fromCartesian.lng).toBeCloseTo(116.4);
    expect(fromCartesian.lat).toBeCloseTo(39.9);
    expect(fromCartesian.alt).toBeCloseTo(100);

    const radius = 6378137;
    const fromMercator = LngLatPosition.fromWebMercator({
      x: Math.PI * radius,
      y: 0,
      z: 12,
    });
    expect(fromMercator.lng).toBeCloseTo(180);
    expect(fromMercator.lat).toBeCloseTo(0);
    expect(fromMercator.alt).toBe(12);
  });

  it('should parse comma strings, arrays and generic inputs', () => {
    expect(LngLatPosition.fromCommaString('116.4,39.9,100')).toMatchObject({
      lng: 116.4,
      lat: 39.9,
      alt: 100,
    });
    expect(LngLatPosition.fromArray([120, 30])).toMatchObject({ lng: 120, lat: 30, alt: 0 });
    expect(LngLatPosition.from('121,31')).toMatchObject({ lng: 121, lat: 31, alt: 0 });
    expect(LngLatPosition.from([122, 32, 10])).toMatchObject({ lng: 122, lat: 32, alt: 10 });
    expect(LngLatPosition.from({ lng: 123, lat: 33, alt: 20 })).toMatchObject({ lng: 123, lat: 33, alt: 20 });
  });
});
