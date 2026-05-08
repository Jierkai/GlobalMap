/**
 * @fileoverview 坐标转换工具模块
 * 提供经纬度坐标与 Cesium 笛卡尔坐标之间的双向转换功能
 * @module coord
 */

import * as Cesium from 'cesium';
import type { LngLat, NativeCartesian3 } from './types';

export type LngLatPositionInput =
  | string
  | readonly number[]
  | LngLat
  | LngLatPosition
  | NativeCartesian3
  | Cesium.Cartesian3
  | Cesium.Cartographic;

type WebMercatorPoint = { x: number; y: number; z?: number };

function isNumberArray(value: unknown): value is readonly number[] {
  return Array.isArray(value);
}

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
  return LngLatPosition.from(lngLat).toCartesian3();
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
  return LngLatPosition.fromCartesian3(nativeCartesian3);
}

export class LngLatPosition implements LngLat {
  lng: number;
  lat: number;
  alt: number;

  constructor(lng: number, lat: number, alt?: number) {
    this.lng = lng;
    this.lat = lat;
    this.alt = alt ?? 0;
  }

  static fromDegrees(lng: number, lat: number, alt?: number): LngLatPosition;
  static fromDegrees(position: LngLat): LngLatPosition;
  static fromDegrees(lngOrPosition: number | LngLat, lat?: number, alt?: number): LngLatPosition {
    if (typeof lngOrPosition === 'number') {
      if (typeof lat !== 'number') {
        throw new TypeError('Latitude must be provided when longitude is a number');
      }

      return new LngLatPosition(lngOrPosition, lat, alt);
    }

    return new LngLatPosition(
      lngOrPosition.lng,
      lngOrPosition.lat,
      lngOrPosition.alt,
    );
  }

  static fromRadians(longitude: number, latitude: number, height?: number): LngLatPosition;
  static fromRadians(cartographic: Pick<Cesium.Cartographic, 'longitude' | 'latitude' | 'height'>): LngLatPosition;
  static fromRadians(
    longitudeOrCartographic: number | Pick<Cesium.Cartographic, 'longitude' | 'latitude' | 'height'>,
    latitude?: number,
    height?: number,
  ): LngLatPosition {
    if (typeof longitudeOrCartographic === 'number') {
      if (typeof latitude !== 'number') {
        throw new TypeError('Latitude radians must be provided when longitude radians is a number');
      }

      return new LngLatPosition(
        Cesium.Math.toDegrees(longitudeOrCartographic),
        Cesium.Math.toDegrees(latitude),
        height,
      );
    }

    return new LngLatPosition(
      Cesium.Math.toDegrees(longitudeOrCartographic.longitude),
      Cesium.Math.toDegrees(longitudeOrCartographic.latitude),
      longitudeOrCartographic.height,
    );
  }

  static fromCartographic(cartographic: Cesium.Cartographic): LngLatPosition {
    return LngLatPosition.fromRadians(cartographic);
  }

  static fromCartesian3(nativeCartesian3: NativeCartesian3 | Cesium.Cartesian3): LngLatPosition {
    const cart3 = nativeCartesian3 as unknown as Cesium.Cartesian3;
    if (!cart3) return new LngLatPosition(0, 0, 0);

    const cartographic = Cesium.Cartographic.fromCartesian(cart3);
    if (!cartographic) return new LngLatPosition(0, 0, 0);

    return LngLatPosition.fromCartographic(cartographic);
  }

  static fromWebMercator(position: WebMercatorPoint | readonly number[]): LngLatPosition {
    let x: number | undefined;
    let y: number | undefined;
    let z: number | undefined;

    if (isNumberArray(position)) {
      [x, y, z] = position;
    } else {
      x = position.x;
      y = position.y;
      z = position.z;
    }

    if (typeof x !== 'number' || typeof y !== 'number') {
      throw new TypeError('WebMercator position must include numeric x and y');
    }

    const normalized: WebMercatorPoint = z === undefined ? { x, y } : { x, y, z };
    const Projection = (Cesium as any).WebMercatorProjection;
    if (typeof Projection === 'function') {
      const Cartesian3 = (Cesium as any).Cartesian3;
      const projected = typeof Cartesian3 === 'function'
        ? new Cartesian3(normalized.x, normalized.y, normalized.z ?? 0)
        : { x: normalized.x, y: normalized.y, z: normalized.z ?? 0 };
      const cartographic = new Projection().unproject(projected);
      return LngLatPosition.fromRadians(cartographic);
    }

    const radius = 6378137;
    const longitude = normalized.x / radius;
    const latitude = Math.PI / 2 - 2 * Math.atan(Math.exp(-normalized.y / radius));
    return LngLatPosition.fromRadians(longitude, latitude, normalized.z);
  }

  static fromArray(values: readonly number[]): LngLatPosition {
    const [lng, lat, alt] = values;
    if (typeof lng !== 'number' || typeof lat !== 'number') {
      throw new TypeError('Coordinate array must include numeric longitude and latitude');
    }

    return new LngLatPosition(lng, lat, alt);
  }

  static fromCommaString(value: string): LngLatPosition {
    const values = value.split(',').map((part) => Number(part.trim()));
    if (values.length < 2 || values.length > 3 || values.some((num) => !Number.isFinite(num))) {
      throw new TypeError('Coordinate string must be "lng,lat" or "lng,lat,alt"');
    }

    return LngLatPosition.fromArray(values);
  }

  static fromString(value: string): LngLatPosition {
    return LngLatPosition.fromCommaString(value);
  }

  static from(input: LngLatPositionInput): LngLatPosition {
    if (input instanceof LngLatPosition) return input;
    if (typeof input === 'string') return LngLatPosition.fromString(input);
    if (Array.isArray(input)) return LngLatPosition.fromArray(input);

    if (input && typeof input === 'object') {
      if ('lng' in input && 'lat' in input) {
        return LngLatPosition.fromDegrees(input as LngLat);
      }

      if ('longitude' in input && 'latitude' in input) {
        return LngLatPosition.fromCartographic(input as Cesium.Cartographic);
      }

      if ('x' in input && 'y' in input) {
        return LngLatPosition.fromCartesian3(input as Cesium.Cartesian3);
      }
    }

    throw new TypeError('Unsupported coordinate input');
  }

  toCartesian3(): NativeCartesian3 {
    const cart3 = Cesium.Cartesian3.fromDegrees(this.lng, this.lat, this.alt);
    return cart3 as unknown as NativeCartesian3;
  }

  toArray(): [number, number, number] {
    return [this.lng, this.lat, this.alt];
  }

  toString(): string {
    return `${this.lng},${this.lat},${this.alt}`;
  }
}
