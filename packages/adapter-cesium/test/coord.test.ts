import { describe, it, expect } from 'vitest';
import { toCartesian3, fromCartesian3 } from '../src/coord';

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
});