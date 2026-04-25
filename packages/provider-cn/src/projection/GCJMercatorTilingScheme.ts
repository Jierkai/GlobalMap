// @ts-nocheck
import * as Cesium from "cesium";

const A_PARAM = 6378245.0;
const EE_PARAM = 0.00669342162296594323;

function isInsideChina(lng: number, lat: number): boolean {
  return lng > 72.004 && lng < 137.8347 && lat > 0.8293 && lat < 55.8271;
}

function computeLngOffset(lng: number, lat: number): number {
  let r = 300.0 + lng + 2.0 * lat + 0.1 * lng * lng + 0.1 * lng * lat + 0.1 * Math.sqrt(Math.abs(lng));
  r += (20.0 * Math.sin(6.0 * lng * Math.PI) + 20.0 * Math.sin(2.0 * lng * Math.PI)) * 2.0 / 3.0;
  r += (20.0 * Math.sin(lng * Math.PI) + 40.0 * Math.sin(lng / 3.0 * Math.PI)) * 2.0 / 3.0;
  r += (150.0 * Math.sin(lng / 12.0 * Math.PI) + 300.0 * Math.sin(lng / 30.0 * Math.PI)) * 2.0 / 3.0;
  return r;
}

function computeLatOffset(lng: number, lat: number): number {
  let r = -100.0 + 2.0 * lng + 3.0 * lat + 0.2 * lat * lat + 0.1 * lng * lat + 0.2 * Math.sqrt(Math.abs(lat));
  r += (20.0 * Math.sin(6.0 * lng * Math.PI) + 20.0 * Math.sin(2.0 * lng * Math.PI)) * 2.0 / 3.0;
  r += (20.0 * Math.sin(lat * Math.PI) + 40.0 * Math.sin(lat / 3.0 * Math.PI)) * 2.0 / 3.0;
  r += (160.0 * Math.sin(lat / 12.0 * Math.PI) + 320.0 * Math.sin(lat * Math.PI / 30.0)) * 2.0 / 3.0;
  return r;
}

export function applyGcj02Offset(lng: number, lat: number): [number, number] {
  if (!isInsideChina(lng, lat)) return [lng, lat];
  
  const dl = computeLngOffset(lng - 105.0, lat - 35.0);
  const dp = computeLatOffset(lng - 105.0, lat - 35.0);
  
  const radLat = lat / 180.0 * Math.PI;
  const magic = Math.sin(radLat);
  const calMagic = 1 - EE_PARAM * magic * magic;
  const sqrtMagic = Math.sqrt(calMagic);
  
  const outLng = lng + (dl * 180.0) / (A_PARAM / sqrtMagic * Math.cos(radLat) * Math.PI);
  const outLat = lat + (dp * 180.0) / ((A_PARAM * (1 - EE_PARAM)) / (calMagic * sqrtMagic) * Math.PI);
  
  return [outLng, outLat];
}

export function revertGcj02Offset(lng: number, lat: number): [number, number] {
  if (!isInsideChina(lng, lat)) return [lng, lat];
  
  const dl = computeLngOffset(lng - 105.0, lat - 35.0);
  const dp = computeLatOffset(lng - 105.0, lat - 35.0);
  
  const radLat = lat / 180.0 * Math.PI;
  const magic = Math.sin(radLat);
  const calMagic = 1 - EE_PARAM * magic * magic;
  const sqrtMagic = Math.sqrt(calMagic);
  
  const outLng = lng - (dl * 180.0) / (A_PARAM / sqrtMagic * Math.cos(radLat) * Math.PI);
  const outLat = lat - (dp * 180.0) / ((A_PARAM * (1 - EE_PARAM)) / (calMagic * sqrtMagic) * Math.PI);
  
  return [outLng, outLat];
}

export class Gcj02TilingScheme extends Cesium.WebMercatorTilingScheme {
  constructor() {
    super();
    
    const internalProj = new Cesium.WebMercatorProjection();
    const currentProj = this.projection as any;
    
    currentProj.project = (carto: Cesium.Cartographic): Cesium.Cartesian3 => {
      const lngDeg = Cesium.Math.toDegrees(carto.longitude);
      const latDeg = Cesium.Math.toDegrees(carto.latitude);
      
      const [shiftedLng, shiftedLat] = applyGcj02Offset(lngDeg, latDeg);
      
      const shiftedCarto = new Cesium.Cartographic(
        Cesium.Math.toRadians(shiftedLng),
        Cesium.Math.toRadians(shiftedLat)
      );
      
      return internalProj.project(shiftedCarto);
    };
    
    currentProj.unproject = (cartesian: Cesium.Cartesian3): Cesium.Cartographic => {
      const unproj = internalProj.unproject(cartesian);
      
      const lngDeg = Cesium.Math.toDegrees(unproj.longitude);
      const latDeg = Cesium.Math.toDegrees(unproj.latitude);
      
      const [origLng, origLat] = revertGcj02Offset(lngDeg, latDeg);
      
      return new Cesium.Cartographic(
        Cesium.Math.toRadians(origLng),
        Cesium.Math.toRadians(origLat)
      );
    };
  }
}
