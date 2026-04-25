import { describe, it, expect } from 'vitest';
import * as Cesium from "cesium";
import { ColorGradient } from '../src/util/ColorRamp';

describe('ColorGradient', () => {
  it('should interpolate colors linearly', () => {
    const gradient = new ColorGradient({
      colorPalette: ['#ff0000', '#00ff00'],
      stops: [0, 100]
    });

    const midColor = gradient.evaluateColor(50);
    // r should be half of 255 (128), g should be half of 255 (128)
    expect(midColor).toBe('rgba(128, 128, 0, 0.8)');
  });

  it('should clamp values outside stops', () => {
    const gradient = new ColorGradient({
      colorPalette: ['#000000', '#ffffff'],
      stops: [10, 20]
    });

    expect(gradient.evaluateColor(5)).toBe('rgba(0, 0, 0, 0.8)');
    expect(gradient.evaluateColor(25)).toBe('rgba(255, 255, 255, 0.8)');
  });

  it('should return Cesium.Color correctly', () => {
    const gradient = new ColorGradient({
      colorPalette: ['#ff0000', '#0000ff'],
      stops: [0, 1]
    });

    const cColor = gradient.evaluateCesiumColor(0.5, 1);
    expect(cColor).toBeInstanceOf(Cesium.Color);
    expect(cColor.red).toBeCloseTo(128 / 255, 1);
    expect(cColor.blue).toBeCloseTo(128 / 255, 1);
  });
});
