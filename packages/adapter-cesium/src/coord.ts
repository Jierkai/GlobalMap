/**
 * @fileoverview 坐标转换工具模块
 * 提供经纬度坐标与 Cesium 笛卡尔坐标之间的双向转换功能
 * @module coord
 */

import * as Cesium from 'cesium';
import type { LngLat, NativeCartesian3 } from './types';

/**
 * 将 Cgx 经纬度坐标转换为 Cesium 笛卡尔3坐标
 * 
 * @description 该函数用于将通用的经纬度坐标格式转换为 Cesium 内部使用的笛卡尔3坐标。
 * 笛卡尔3坐标是基于地心的三维直角坐标系，单位为米。
 * 
 * @param {LngLat} lngLat - 经纬度坐标对象
 * @param {number} lngLat.lng - 经度（度）
 * @param {number} lngLat.lat - 纬度（度）
 * @param {number} [lngLat.alt=0] - 海拔高度（米），可选，默认为0
 * @returns {NativeCartesian3} Cesium 笛卡尔3坐标对象
 * 
 * @example
 * ```typescript
 * const lngLat = { lng: 116.3974, lat: 39.9093, alt: 100 };
 * const cartesian3 = toCartesian3(lngLat);
 * ```
 */
export function toCartesian3(lngLat: LngLat): NativeCartesian3 {
  const cart3 = Cesium.Cartesian3.fromDegrees(lngLat.lng, lngLat.lat, lngLat.alt ?? 0);
  return cart3 as unknown as NativeCartesian3;
}

/**
 * 将 Cesium 笛卡尔3坐标转换为 Cgx 经纬度坐标
 * 
 * @description 该函数用于将 Cesium 内部的笛卡尔3坐标转换为通用的经纬度坐标格式。
 * 如果输入坐标无效或转换失败，将返回默认坐标 { lng: 0, lat: 0, alt: 0 }。
 * 
 * @param {NativeCartesian3} nativeCartesian3 - Cesium 笛卡尔3坐标对象
 * @returns {LngLat} 经纬度坐标对象
 * @returns {number} returns.lng - 经度（度）
 * @returns {number} returns.lat - 纬度（度）
 * @returns {number} returns.alt - 海拔高度（米）
 * 
 * @example
 * ```typescript
 * const cartesian3 = viewer.camera.position;
 * const lngLat = fromCartesian3(cartesian3);
 * console.log(lngLat); // { lng: 116.3974, lat: 39.9093, alt: 100 }
 * ```
 */
export function fromCartesian3(nativeCartesian3: NativeCartesian3): LngLat {
  const cart3 = nativeCartesian3 as unknown as Cesium.Cartesian3;
  
  // 检查输入坐标是否有效
  if (!cart3) {
    return { lng: 0, lat: 0, alt: 0 };
  }
  
  // 将笛卡尔坐标转换为地理坐标（弧度）
  const carto = Cesium.Cartographic.fromCartesian(cart3);
  if (!carto) {
    return { lng: 0, lat: 0, alt: 0 };
  }
  
  // 将弧度转换为度，并返回经纬度坐标
  return {
    lng: Cesium.Math.toDegrees(carto.longitude),
    lat: Cesium.Math.toDegrees(carto.latitude),
    alt: carto.height
  };
}