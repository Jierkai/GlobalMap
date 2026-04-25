// @ts-nocheck
import * as Cesium from "cesium";
import { projectToBaiduPlane, unprojectFromBaiduPlane } from './BaiduMercatorProjection';

export interface BaiduTilingSchemeConfig {
  resolutions: number[];
  originX?: number;
  originY?: number;
}

export class BaiduMapTilingScheme extends Cesium.WebMercatorTilingScheme {
  private readonly _customResolutions: number[];

  constructor(config: BaiduTilingSchemeConfig) {
    super();
    this._customResolutions = config.resolutions || [];
    
    const projection = this.projection as any;
    
    // 覆写底层投影过程以注入百度坐标转换
    projection.project = (carto: Cesium.Cartographic): Cesium.Cartesian3 => {
      let lng = Cesium.Math.toDegrees(carto.longitude);
      let lat = Cesium.Math.toDegrees(carto.latitude);
      
      lng = Math.max(-180, Math.min(180, lng));
      lat = Math.max(-85.05112877980659, Math.min(85.05112877980659, lat));
      
      const pt = projectToBaiduPlane({ lng, lat });
      return new Cesium.Cartesian3(pt.x, pt.y, 0);
    };
    
    projection.unproject = (cartesian: Cesium.Cartesian3): Cesium.Cartographic => {
      const coord = unprojectFromBaiduPlane({ x: cartesian.x, y: cartesian.y });
      return new Cesium.Cartographic(
        Cesium.Math.toRadians(coord.lng),
        Cesium.Math.toRadians(coord.lat),
        0
      );
    };
  }
  
  override tileXYToNativeRectangle(
    x: number,
    y: number,
    level: number,
    result?: Cesium.Rectangle
  ): Cesium.Rectangle {
    const res = this._customResolutions[level];
    if (!res) return Cesium.Rectangle.MAX_VALUE;
    
    const w = x * res;
    const e = (x + 1) * res;
    const n = ((y = -y) + 1) * res;
    const s = y * res;
    
    if (!Cesium.defined(result)) {
      return new Cesium.Rectangle(w, s, e, n);
    }
    
    result!.west = w;
    result!.south = s;
    result!.east = e;
    result!.north = n;
    return result!;
  }

  override positionToTileXY(
    position: Cesium.Cartographic,
    level: number,
    result?: Cesium.Cartesian2
  ): Cesium.Cartesian2 | undefined {
    const rect = (this as any)._rectangle;
    if (!Cesium.Rectangle.contains(rect, position)) {
      return undefined;
    }
    
    const p = this.projection.project(position);
    if (!Cesium.defined(p)) {
      return undefined;
    }
    
    const res = this._customResolutions[level];
    if (!res) return undefined;
    
    const tileX = Math.floor(p.x / res);
    const tileY = -Math.floor(p.y / res);
    
    if (!Cesium.defined(result)) {
      return new Cesium.Cartesian2(tileX, tileY);
    }
    
    result!.x = tileX;
    result!.y = tileY;
    return result!;
  }
}
