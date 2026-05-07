import { projectToBaiduPlane, unprojectFromBaiduPlane } from './BaiduMercatorProjection.js';
import type { Cartesian2, Cartographic, Rectangle } from './types.js';

export interface BaiduTilingSchemeConfig {
  resolutions: number[];
  originX?: number;
  originY?: number;
}

function degreesToRadians(deg: number): number {
  return deg * Math.PI / 180;
}

function radiansToDegrees(rad: number): number {
  return rad * 180 / Math.PI;
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

export class BaiduMapTilingScheme {
  private readonly _customResolutions: number[];
  private readonly _originX: number;
  private readonly _originY: number;
  readonly projection = {
    project: (carto: Cartographic): { x: number; y: number; z: number } => {
      const lng = clamp(radiansToDegrees(carto.longitude), -180, 180);
      const lat = clamp(radiansToDegrees(carto.latitude), -85.05112877980659, 85.05112877980659);
      const pt = projectToBaiduPlane({ lng, lat });
      return { x: pt.x, y: pt.y, z: carto.height ?? 0 };
    },
    unproject: (cartesian: { x: number; y: number; z?: number }): Cartographic => {
      const coord = unprojectFromBaiduPlane({ x: cartesian.x, y: cartesian.y });
      return {
        longitude: degreesToRadians(coord.lng),
        latitude: degreesToRadians(coord.lat),
        height: cartesian.z ?? 0,
      };
    },
  };

  constructor(config: BaiduTilingSchemeConfig) {
    this._customResolutions = config.resolutions || [];
    this._originX = config.originX ?? 0;
    this._originY = config.originY ?? 0;
  }
  
  tileXYToNativeRectangle(
    x: number,
    y: number,
    level: number,
    result?: Rectangle,
  ): Rectangle {
    const res = this._customResolutions[level];
    if (!res) return { west: 0, south: 0, east: 0, north: 0 };
    
    const w = this._originX + x * res;
    const e = this._originX + (x + 1) * res;
    const n = ((y = -y) + 1) * res;
    const s = y * res;
    
    if (!result) {
      return { west: w, south: this._originY + s, east: e, north: this._originY + n };
    }
    
    result.west = w;
    result.south = this._originY + s;
    result.east = e;
    result.north = this._originY + n;
    return result;
  }

  positionToTileXY(
    position: Cartographic,
    level: number,
    result?: Cartesian2,
  ): Cartesian2 | undefined {
    const p = this.projection.project(position);
    const res = this._customResolutions[level];
    if (!res) return undefined;
    
    const tileX = Math.floor((p.x - this._originX) / res);
    const tileY = -Math.floor((p.y - this._originY) / res);
    
    if (!result) {
      return { x: tileX, y: tileY };
    }
    
    result.x = tileX;
    result.y = tileY;
    return result;
  }
}
