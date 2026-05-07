import type { Cartesian2, Cartographic, Rectangle } from './types.js';

export interface CustomGeographicConfig {
  originPt?: [number, number];
  resolutionsList?: number[];
  levelOffset?: number;
  tileSizePx?: number;
}

function degreesToRadians(deg: number): number {
  return deg * Math.PI / 180;
}

export class ConfigurableGeographicTilingScheme {
  private readonly _originPt: [number, number];
  private readonly _resolutionsList: number[];
  private readonly _levelOffset: number;
  private readonly _tileSizePx: number;

  constructor(cfg: CustomGeographicConfig = {}) {
    this._originPt = cfg.originPt ?? [-180, 90];
    this._resolutionsList = cfg.resolutionsList ?? [];
    this._levelOffset = cfg.levelOffset ?? 0;
    this._tileSizePx = cfg.tileSizePx ?? 256;
  }

  tileXYToNativeRectangle(x: number, y: number, level: number, result?: Rectangle): Rectangle {
    const res = this._resolutionsList[level + this._levelOffset];
    if (!res) return { west: 0, south: 0, east: 0, north: 0 };

    const tileSpan = res * this._tileSizePx;
    const west = degreesToRadians(this._originPt[0] + x * tileSpan);
    const south = degreesToRadians(this._originPt[1] - (y + 1) * tileSpan);
    const east = degreesToRadians(this._originPt[0] + (x + 1) * tileSpan);
    const north = degreesToRadians(this._originPt[1] - y * tileSpan);

    if (!result) {
      return { west, south, east, north };
    }

    result.west = west;
    result.south = south;
    result.east = east;
    result.north = north;
    return result;
  }

  positionToTileXY(pos: Cartographic, level: number, result?: Cartesian2): Cartesian2 | undefined {
    const res = this._resolutionsList[level + this._levelOffset];
    if (!res) return undefined;

    const tileSpan = res * this._tileSizePx;
    const lngDeg = pos.longitude * 180 / Math.PI;
    const latDeg = pos.latitude * 180 / Math.PI;
    const tx = Math.floor((lngDeg - this._originPt[0]) / tileSpan);
    const ty = Math.floor((this._originPt[1] - latDeg) / tileSpan);

    if (!result) {
      return { x: Math.max(0, tx), y: Math.max(0, ty) };
    }

    result.x = Math.max(0, tx);
    result.y = Math.max(0, ty);
    return result;
  }
}
