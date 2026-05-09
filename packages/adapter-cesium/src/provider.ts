/**
 * @fileoverview 影像和地形提供者工厂模块
 * 提供常用影像和地形提供者的创建函数
 * 
 * @module provider
 * @description
 * 该模块封装了 Cesium 常用的影像和地形提供者创建逻辑，
 * 提供简化的工厂函数接口，包括：
 * - XYZ 瓦片影像提供者
 * - WMS 影像提供者
 * - 地形提供者
 */

import * as Cesium from 'cesium';

/**
 * XYZ 瓦片影像提供者配置选项
 * 
 * @description
 * 用于创建基于 URL 模板的瓦片影像提供者，
 * 适用于标准的 XYZ 瓦片服务（如 OpenStreetMap）。
 */
export interface XYZImageryOptions {
  /** 瓦片服务 URL 模板，支持 {x}、{y}、{z} 占位符 */
  url: string;
  /** 最大层级，默认 18 */
  maximumLevel?: number;
  /** 最小层级，默认 1 */
  minimumLevel?: number;
}

/**
 * WMS 影像提供者配置选项
 * 
 * @description
 * 用于创建 OGC WMS 标准的影像提供者。
 */
export interface WMSImageryOptions {
  /** WMS 服务地址 */
  url: string;
  /** 图层名称，多个图层用逗号分隔 */
  layers: string;
  /** 额外的 WMS 请求参数（如 VERSION、FORMAT 等） */
  parameters?: Record<string, any>;
}

/**
 * 地形提供者配置选项
 * 
 * @description
 * 用于创建 Cesium 地形提供者，支持高程数据加载。
 */
export interface TerrainOptions {
  /** 地形服务 URL（如 Cesium Ion 资源地址） */
  url: string;
  /** 是否请求顶点法线，用于光照计算，默认 false */
  requestVertexNormals?: boolean;
  /** 是否请求水面遮罩，用于水面渲染效果，默认 false */
  requestWaterMask?: boolean;
}

/**
 * 创建 XYZ 瓦片影像提供者
 *
 * @description
 * 创建基于 URL 模板的瓦片影像提供者，适用于标准的 XYZ 瓦片服务。
 * 
 * @param options - XYZ 瓦片配置选项
 * @returns {Cesium.UrlTemplateImageryProvider} Cesium UrlTemplateImageryProvider 实例
 * 
 * @example
 * ```typescript
 * const provider = createXYZImageryProvider({
 *   url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
 *   maximumLevel: 19,
 * });
 * ```
 */
export function createXYZImageryProvider(options: XYZImageryOptions): Cesium.UrlTemplateImageryProvider {
  const maximumLevel = options.maximumLevel ?? 18;
  const minimumLevel = options.minimumLevel ?? 1;
  
  return new Cesium.UrlTemplateImageryProvider({
    url: options.url,
    maximumLevel,
    minimumLevel,
  });
}

/**
 * 创建 WMS 影像提供者
 *
 * @description
 * 创建符合 OGC WMS 标准的影像提供者。
 * 
 * @param options - WMS 配置选项
 * @returns {Cesium.WebMapServiceImageryProvider} Cesium WebMapServiceImageryProvider 实例
 * 
 * @example
 * ```typescript
 * const provider = createWMSImageryProvider({
 *   url: 'https://example.com/wms',
 *   layers: 'layer1,layer2',
 *   parameters: { transparent: true, format: 'image/png' },
 * });
 * ```
 */
export function createWMSImageryProvider(options: WMSImageryOptions): Cesium.WebMapServiceImageryProvider {
  return new Cesium.WebMapServiceImageryProvider({
    url: options.url,
    layers: options.layers,
    parameters: options.parameters,
  });
}

/**
 * 异步创建地形提供者
 *
 * @description
 * 使用 CesiumTerrainProvider.fromUrl() 异步加载地形数据。
 * 支持顶点法线和水面遮罩的可选配置。
 * 
 * @param options - 地形配置选项
 * @returns {Promise<Cesium.CesiumTerrainProvider>} Cesium CesiumTerrainProvider 实例
 * 
 * @example
 * ```typescript
 * const terrain = await createTerrainProvider({
 *   url: 'https://assets.agi.com/stk-terrain/v1/tilesets/world/tiles',
 *   requestVertexNormals: true,
 *   requestWaterMask: true,
 * });
 * ```
 */
export async function createTerrainProvider(options: TerrainOptions): Promise<Cesium.CesiumTerrainProvider> {
  const requestVertexNormals = options.requestVertexNormals ?? false;
  const requestWaterMask = options.requestWaterMask ?? false;

  return await Cesium.CesiumTerrainProvider.fromUrl(options.url, {
    requestVertexNormals,
    requestWaterMask,
  });
}
