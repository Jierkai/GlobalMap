import * as Cesium from 'cesium';

export interface XYZImageryOptions {
  url: string;
  maximumLevel?: number;
  minimumLevel?: number;
}

export interface WMSImageryOptions {
  url: string;
  layers: string;
  parameters?: Record<string, any>;
}

export interface TerrainOptions {
  url: string;
  requestVertexNormals?: boolean;
  requestWaterMask?: boolean;
}

export function createXYZImageryProvider(options: XYZImageryOptions): Cesium.UrlTemplateImageryProvider {
  return new Cesium.UrlTemplateImageryProvider({
    url: options.url,
    maximumLevel: options.maximumLevel,
    minimumLevel: options.minimumLevel,
  });
}

export function createWMSImageryProvider(options: WMSImageryOptions): Cesium.WebMapServiceImageryProvider {
  return new Cesium.WebMapServiceImageryProvider({
    url: options.url,
    layers: options.layers,
    parameters: options.parameters,
  });
}

export async function createTerrainProvider(options: TerrainOptions): Promise<Cesium.CesiumTerrainProvider> {
  return await Cesium.CesiumTerrainProvider.fromUrl(options.url, {
    requestVertexNormals: options.requestVertexNormals,
    requestWaterMask: options.requestWaterMask,
  });
}
