// @ts-nocheck
import * as Cesium from "cesium";

export interface GradientOptions {
  colorPalette?: string[];
  stops?: number[];
}

interface RgbaChannel {
  r: number;
  g: number;
  b: number;
  a: number;
}

function boundValue(v: number, lower: number, upper: number): number {
  return Math.max(lower, Math.min(upper, v));
}

function interpolate(start: number, end: number, factor: number): number {
  return start + (end - start) * factor;
}

function hexToRgba(hexStr: string): RgbaChannel {
  const hex6 = hexStr.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})?$/i);
  if (hex6) {
    return {
      r: parseInt(hex6[1], 16),
      g: parseInt(hex6[2], 16),
      b: parseInt(hex6[3], 16),
      a: hex6[4] ? parseInt(hex6[4], 16) / 255 : 1
    };
  }
  
  const hex3 = hexStr.match(/^#([0-9a-f])([0-9a-f])([0-9a-f])([0-9a-f])?$/i);
  if (hex3) {
    return {
      r: parseInt(hex3[1] + hex3[1], 16),
      g: parseInt(hex3[2] + hex3[2], 16),
      b: parseInt(hex3[3] + hex3[3], 16),
      a: hex3[4] ? parseInt(hex3[4] + hex3[4], 16) / 255 : 1
    };
  }
  return { r: 0, g: 0, b: 0, a: 1 };
}

export class ColorGradient {
  public palette: string[];
  public milestones: number[];
  private _parsedRgba: RgbaChannel[];

  constructor(cfg: GradientOptions = {}) {
    this.palette = Array.isArray(cfg.colorPalette) ? cfg.colorPalette : [];
    this.milestones = Array.isArray(cfg.stops) ? cfg.stops : [];
    this._parsedRgba = this.palette.map(hexToRgba);

    if (this.milestones.length !== this.palette.length) {
      const len = this.palette.length;
      this.milestones = len > 1 ? Array.from({ length: len }, (_, k) => k / (len - 1)) : [0];
    }
  }

  evaluateColor(val: number, fallbackAlpha = 0.8): string {
    const ch = this._computeChannel(val, fallbackAlpha);
    const r = Math.round(boundValue(ch.r, 0, 255));
    const g = Math.round(boundValue(ch.g, 0, 255));
    const b = Math.round(boundValue(ch.b, 0, 255));
    const a = boundValue(ch.a, 0, 1);
    return `rgba(${r}, ${g}, ${b}, ${a})`;
  }

  evaluateCesiumColor(val: number, fallbackAlpha = 0.8): Cesium.Color {
    const ch = this._computeChannel(val, fallbackAlpha);
    const r = Math.round(boundValue(ch.r, 0, 255));
    const g = Math.round(boundValue(ch.g, 0, 255));
    const b = Math.round(boundValue(ch.b, 0, 255));
    const a = Math.round(boundValue(ch.a, 0, 1) * 255);
    return Cesium.Color.fromBytes(r, g, b, a);
  }

  private _computeChannel(val: number, defAlpha: number): RgbaChannel {
    if (!this.milestones.length || !this._parsedRgba.length) {
      return { r: 0, g: 0, b: 0, a: defAlpha };
    }
    
    if (!Number.isFinite(val)) return { ...this._parsedRgba[0], a: defAlpha };

    if (val <= this.milestones[0]) return { ...this._parsedRgba[0], a: defAlpha };
    
    const lastIdx = this.milestones.length - 1;
    if (val >= this.milestones[lastIdx]) return { ...this._parsedRgba[lastIdx], a: defAlpha };

    for (let k = 1; k <= lastIdx; k++) {
      const m0 = this.milestones[k - 1];
      const m1 = this.milestones[k];
      if (val <= m1) {
        const ratio = (val - m0) / (m1 - m0 || 1);
        const c0 = this._parsedRgba[k - 1];
        const c1 = this._parsedRgba[k];
        return {
          r: interpolate(c0.r, c1.r, ratio),
          g: interpolate(c0.g, c1.g, ratio),
          b: interpolate(c0.b, c1.b, ratio),
          a: defAlpha
        };
      }
    }
    return { ...this._parsedRgba[lastIdx], a: defAlpha };
  }
}
