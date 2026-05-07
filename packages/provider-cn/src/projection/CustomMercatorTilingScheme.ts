import type { Cartesian2, Cartographic, Rectangle } from './types.js';

export interface CustomMercatorConfig {
  originPt?: [number, number];
  resolutionsList?: number[];
  levelOffset?: number;
  tileSizePx?: number;
}

export class ConfigurableMercatorTilingScheme {
  private readonly _originPt: [number, number];
  private readonly _resolutionsList: number[];
  private readonly _levelOffset: number;
  private readonly _tileSizePx: number;
  readonly projection = {
    project: (pos: Cartographic): { x: number; y: number; z: number } => ({
      x: pos.longitude,
      y: pos.latitude,
      z: pos.height ?? 0,
    }),
    unproject: (point: { x: number; y: number; z?: number }): Cartographic => ({
      longitude: point.x,
      latitude: point.y,
      height: point.z ?? 0,
    }),
  };

  constructor(cfg: CustomMercatorConfig = {}) {
    this._originPt = cfg.originPt ?? [-20037508.3427892, 20037508.3427892];
    this._resolutionsList = cfg.resolutionsList ?? [];
    this._levelOffset = cfg.levelOffset ?? 0;
    this._tileSizePx = cfg.tileSizePx ?? 256;
  }

  tileXYToNativeRectangle(x: number, y: number, level: number, result?: Rectangle): Rectangle {
    const res = this._resolutionsList[level + this._levelOffset];
    if (!res) return { west: 0, south: 0, east: 0, north: 0 };

    const tileSpan = res * this._tileSizePx;
    const west = this._originPt[0] + x * tileSpan;
    const south = this._originPt[1] - (y + 1) * tileSpan;
    const east = this._originPt[0] + (x + 1) * tileSpan;
    const north = this._originPt[1] - y * tileSpan;

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

    const p = this.projection.project(pos);
    const span = res * this._tileSizePx;
    const tx = Math.floor((p.x - this._originPt[0]) / span);
    const ty = Math.floor((this._originPt[1] - p.y) / span);

    if (!result) {
      return { x: Math.max(0, tx), y: Math.max(0, ty) };
    }

    result.x = Math.max(0, tx);
    result.y = Math.max(0, ty);
    return result;
  }
}
