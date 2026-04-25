// @ts-nocheck
import * as Cesium from "cesium";

export interface CustomGeographicConfig {
  originPt?: [number, number];
  resolutionsList?: number[];
  levelOffset?: number;
  tileSizePx?: number;
}

export class ConfigurableGeographicTilingScheme extends Cesium.GeographicTilingScheme {
  private readonly _originPt: [number, number];
  private readonly _resolutionsList: number[];
  private readonly _levelOffset: number;
  private readonly _tileSizePx: number;

  constructor(cfg: CustomGeographicConfig = {}) {
    super();
    this._originPt = cfg.originPt ?? [-180, 90];
    this._resolutionsList = cfg.resolutionsList ?? [];
    this._levelOffset = cfg.levelOffset ?? 0;
    this._tileSizePx = cfg.tileSizePx ?? 256;
  }

  override tileXYToNativeRectangle(x: number, y: number, level: number, result?: Cesium.Rectangle): Cesium.Rectangle {
    const res = this._resolutionsList[level + this._levelOffset];
    if (!res) return Cesium.Rectangle.MAX_VALUE;
    
    const tileSpan = res * this._tileSizePx;
    
    const w = Cesium.Math.toRadians(this._originPt[0] + x * tileSpan);
    const s = Cesium.Math.toRadians(this._originPt[1] - (y + 1) * tileSpan);
    const e = Cesium.Math.toRadians(this._originPt[0] + (x + 1) * tileSpan);
    const n = Cesium.Math.toRadians(this._originPt[1] - y * tileSpan);
    
    if (!Cesium.defined(result)) {
      return new Cesium.Rectangle(w, s, e, n);
    }
    
    result!.west = w;
    result!.south = s;
    result!.east = e;
    result!.north = n;
    return result!;
  }

  override positionToTileXY(pos: Cesium.Cartographic, level: number, result?: Cesium.Cartesian2): Cesium.Cartesian2 | undefined {
    const res = this._resolutionsList[level + this._levelOffset];
    if (!res) return new Cesium.Cartesian2();
    
    const tileSpan = res * this._tileSizePx;
    
    const lngDeg = Cesium.Math.toDegrees(pos.longitude);
    const latDeg = Cesium.Math.toDegrees(pos.latitude);
    
    const tx = Math.floor((lngDeg - this._originPt[0]) / tileSpan);
    const ty = Math.floor((this._originPt[1] - latDeg) / tileSpan);
    
    if (!Cesium.defined(result)) {
      return new Cesium.Cartesian2(Math.max(0, tx), Math.max(0, ty));
    }
    
    result!.x = Math.max(0, tx);
    result!.y = Math.max(0, ty);
    return result!;
  }
}
