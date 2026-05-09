/**
 * @fileoverview 坐标转换工具模块
 * 提供经纬度坐标与 Cesium 笛卡尔坐标之间的双向转换功能
 * @module coord
 */

import * as Cesium from 'cesium';
import type { LngLat, NativeCartesian3 } from './types';

/**
 * 经纬度位置输入类型联合
 *
 * @description
 * 支持多种格式的坐标输入：
 * - string: 逗号分隔的坐标字符串（如 "116.39,39.91"）
 * - readonly number[]: 数字数组 [lng, lat, alt?]
 * - LngLat: 经纬度对象 { lng, lat, alt? }
 * - LngLatPosition: LngLatPosition 实例
 * - NativeCartesian3: Cesium 笛卡尔3坐标（不透明类型）
 * - Cesium.Cartesian3: Cesium 笛卡尔3坐标
 * - Cesium.Cartographic: Cesium 地理坐标（弧度）
 */
export type LngLatPositionInput =
  | string
  | readonly number[]
  | LngLat
  | LngLatPosition
  | NativeCartesian3
  | Cesium.Cartesian3
  | Cesium.Cartographic;

/**
 * Web 墨卡托投影坐标点
 */
type WebMercatorPoint = { x: number; y: number; z?: number };

/**
 * 类型守卫：判断值是否为数字数组
 *
 * @param value - 待检测的值
 * @returns {boolean} 如果值是数组则返回 true
 */
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

/**
 * 经纬度位置类
 *
 * @description
 * 表示一个地理坐标位置，使用度（degrees）作为经纬度单位，米（meters）作为高度单位。
 * 提供多种静态工厂方法用于从不同格式创建实例，
 * 以及实例方法用于转换为其他坐标格式。
 *
 * @implements {LngLat}
 *
 * @example
 * ```typescript
 * // 从经纬度创建
 * const pos = new LngLatPosition(116.3974, 39.9093, 100);
 *
 * // 从数组创建
 * const pos2 = LngLatPosition.fromArray([116.3974, 39.9093]);
 *
 * // 从字符串创建
 * const pos3 = LngLatPosition.fromString('116.3974,39.9093');
 *
 * // 转换为 Cesium 笛卡尔坐标
 * const cartesian = pos.toCartesian3();
 * ```
 */
export class LngLatPosition implements LngLat {
  /** 经度（度） */
  lng: number;
  /** 纬度（度） */
  lat: number;
  /** 海拔高度（米） */
  alt: number;

  /**
   * 创建经纬度位置实例
   *
   * @param lng - 经度（度）
   * @param lat - 纬度（度）
   * @param alt - 海拔高度（米），可选，默认为 0
   */
  constructor(lng: number, lat: number, alt?: number) {
    this.lng = lng;
    this.lat = lat;
    this.alt = alt ?? 0;
  }

  /**
   * 从度数坐标创建 LngLatPosition 实例
   *
   * @param lng - 经度（度）
   * @param lat - 纬度（度）
   * @param alt - 海拔高度（米），可选
   * @returns {LngLatPosition} 新的 LngLatPosition 实例
   */
  static fromDegrees(lng: number, lat: number, alt?: number): LngLatPosition;
  /**
   * 从 LngLat 对象创建 LngLatPosition 实例
   *
   * @param position - LngLat 对象
   * @returns {LngLatPosition} 新的 LngLatPosition 实例
   */
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

  /**
   * 从弧度坐标创建 LngLatPosition 实例
   *
   * @param longitude - 经度（弧度）
   * @param latitude - 纬度（弧度）
   * @param height - 海拔高度（米），可选
   * @returns {LngLatPosition} 新的 LngLatPosition 实例
   */
  static fromRadians(longitude: number, latitude: number, height?: number): LngLatPosition;
  /**
   * 从 Cesium Cartographic 对象创建 LngLatPosition 实例
   *
   * @param cartographic - Cesium Cartographic 对象（使用弧度单位）
   * @returns {LngLatPosition} 新的 LngLatPosition 实例
   */
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

  /**
   * 从 Cesium Cartographic 对象创建 LngLatPosition 实例
   *
   * @param cartographic - Cesium Cartographic 对象
   * @returns {LngLatPosition} 新的 LngLatPosition 实例
   */
  static fromCartographic(cartographic: Cesium.Cartographic): LngLatPosition {
    return LngLatPosition.fromRadians(cartographic);
  }

  /**
   * 从 Cesium 笛卡尔3坐标创建 LngLatPosition 实例
   *
   * @param nativeCartesian3 - Cesium 笛卡尔3坐标（NativeCartesian3 或 Cesium.Cartesian3）
   * @returns {LngLatPosition} 新的 LngLatPosition 实例，坐标无效时返回 (0, 0, 0)
   */
  static fromCartesian3(nativeCartesian3: NativeCartesian3 | Cesium.Cartesian3): LngLatPosition {
    const cart3 = nativeCartesian3 as unknown as Cesium.Cartesian3;
    if (!cart3) return new LngLatPosition(0, 0, 0);

    const cartographic = Cesium.Cartographic.fromCartesian(cart3);
    if (!cartographic) return new LngLatPosition(0, 0, 0);

    return LngLatPosition.fromCartographic(cartographic);
  }

  /**
   * 从 Web 墨卡托投影坐标创建 LngLatPosition 实例
   *
   * @description
   * 支持对象格式 { x, y, z? } 或数组格式 [x, y, z?]。
   * 优先使用 Cesium.WebMercatorProjection 进行转换，
   * 如果不可用则使用手动公式计算。
   *
   * @param position - Web 墨卡托投影坐标
   * @returns {LngLatPosition} 新的 LngLatPosition 实例
   * @throws {TypeError} 如果 x 或 y 不是数字
   */
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

  /**
   * 从数字数组创建 LngLatPosition 实例
   *
   * @param values - 坐标数组 [lng, lat, alt?]
   * @returns {LngLatPosition} 新的 LngLatPosition 实例
   * @throws {TypeError} 如果数组不包含有效的经纬度数字
   */
  static fromArray(values: readonly number[]): LngLatPosition {
    const [lng, lat, alt] = values;
    if (typeof lng !== 'number' || typeof lat !== 'number') {
      throw new TypeError('Coordinate array must include numeric longitude and latitude');
    }

    return new LngLatPosition(lng, lat, alt);
  }

  /**
   * 从逗号分隔的字符串创建 LngLatPosition 实例
   *
   * @param value - 逗号分隔的坐标字符串（如 "116.39,39.91" 或 "116.39,39.91,100"）
   * @returns {LngLatPosition} 新的 LngLatPosition 实例
   * @throws {TypeError} 如果字符串格式无效
   */
  static fromCommaString(value: string): LngLatPosition {
    const values = value.split(',').map((part) => Number(part.trim()));
    if (values.length < 2 || values.length > 3 || values.some((num) => !Number.isFinite(num))) {
      throw new TypeError('Coordinate string must be "lng,lat" or "lng,lat,alt"');
    }

    return LngLatPosition.fromArray(values);
  }

  /**
   * 从字符串创建 LngLatPosition 实例（fromCommaString 的别名）
   *
   * @param value - 坐标字符串
   * @returns {LngLatPosition} 新的 LngLatPosition 实例
   */
  static fromString(value: string): LngLatPosition {
    return LngLatPosition.fromCommaString(value);
  }

  /**
   * 通用工厂方法：从任意支持的输入格式创建 LngLatPosition 实例
   *
   * @description
   * 自动检测输入格式并调用对应的工厂方法：
   * - LngLatPosition 实例：直接返回
   * - 字符串：调用 fromString
   * - 数组：调用 fromArray
   * - LngLat 对象：调用 fromDegrees
   * - Cartographic 对象：调用 fromCartographic
   * - Cartesian3 对象：调用 fromCartesian3
   *
   * @param input - 支持的坐标输入格式
   * @returns {LngLatPosition} 新的 LngLatPosition 实例
   * @throws {TypeError} 如果输入格式不支持
   */
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

  /**
   * 转换为 Cesium 笛卡尔3坐标
   *
   * @returns {NativeCartesian3} Cesium 笛卡尔3坐标（不透明类型）
   */
  toCartesian3(): NativeCartesian3 {
    const cart3 = Cesium.Cartesian3.fromDegrees(this.lng, this.lat, this.alt);
    return cart3 as unknown as NativeCartesian3;
  }

  /**
   * 转换为数字数组
   *
   * @returns {[number, number, number]} [lng, lat, alt] 格式的坐标数组
   */
  toArray(): [number, number, number] {
    return [this.lng, this.lat, this.alt];
  }

  /**
   * 转换为逗号分隔的字符串
   *
   * @returns {string} "lng,lat,alt" 格式的坐标字符串
   */
  toString(): string {
    return `${this.lng},${this.lat},${this.alt}`;
  }
}
