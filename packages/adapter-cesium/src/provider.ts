import * as Cesium from 'cesium';

/**
 * XYZ 瓦片影像提供者配置选项
 */
export interface XYZImageryOptions {
  /** 瓦片服务 URL 模板 */
  url: string;
  /** 最大层级 */
  maximumLevel?: number;
  /** 最小层级 */
  minimumLevel?: number;
}

/**
 * WMS 影像提供者配置选项
 */
export interface WMSImageryOptions {
  /** WMS 服务地址 */
  url: string;
  /** 图层名称，逗号分隔 */
  layers: string;
  /** 额外的 WMS 请求参数 */
  parameters?: Record<string, any>;
}

/**
 * 地形提供者配置选项
 */
export interface TerrainOptions {
  /** 地形服务 URL */
  url: string;
  /** 是否请求顶点法线 */
  requestVertexNormals?: boolean;
  /** 是否请求水面遮罩 */
  requestWaterMask?: boolean;
}

/**
 * 创建 XYZ 瓦片影像提供者
 *
 * @param options - XYZ 瓦片配置选项
 * @returns Cesium UrlTemplateImageryProvider 实例
 */
export function createXYZImageryProvider(options: XYZImageryOptions): Cesium.UrlTemplateImageryProvider {
  // 确保最大层级和最小层级是数字类型
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
 * @param options - WMS 配置选项
 * @returns Cesium WebMapServiceImageryProvider 实例
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
 * @param options - 地形配置选项
 * @returns Cesium CesiumTerrainProvider 实例
 */
export async function createTerrainProvider(options: TerrainOptions): Promise<Cesium.CesiumTerrainProvider> {
  // 确保请求顶点法线和水面遮罩是布尔类型
  const requestVertexNormals = options.requestVertexNormals ?? false;
  const requestWaterMask = options.requestWaterMask ?? false;

  // 异步创建地形提供者
  return await Cesium.CesiumTerrainProvider.fromUrl(options.url, {
    requestVertexNormals,
    requestWaterMask,
  });
}
