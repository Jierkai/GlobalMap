import * as Cesium from 'cesium';
import type { BingBasemapSpec } from '@cgx/core';

/**
 * 解析提供者对象，提取原始提供者实例
 *
 * @description
 * 如果提供者对象包含 raw() 方法（如适配器包装对象），
 * 则调用 raw() 获取原始提供者实例。
 *
 * @param provider - 提供者对象或原始实例
 * @returns {unknown} 原始提供者实例
 */
export function resolveProvider(provider: unknown): unknown {
  if (provider && typeof provider === 'object' && 'raw' in provider && typeof provider.raw === 'function') {
    return provider.raw();
  }

  if (provider && typeof provider === 'object' && 'toRenderSpec' in provider && typeof provider.toRenderSpec === 'function') {
    return resolveProvider(provider.toRenderSpec());
  }

  if (provider && typeof provider === 'object' && 'provider' in provider) {
    const spec = provider as Record<string, unknown>;
    if (spec.provider === 'bing') {
      const bing = spec as unknown as BingBasemapSpec;
      if (typeof bing.key !== 'string' || bing.key.length === 0) {
        throw new Error('bing basemap requires a non-empty key');
      }
      const options: Record<string, unknown> = {
        key: bing.key,
      };
      if (bing.style !== undefined) options.mapStyle = bing.style;
      if (bing.culture !== undefined) options.culture = bing.culture;
      if (bing.mapLayer !== undefined) options.mapLayer = bing.mapLayer;
      return Cesium.BingMapsImageryProvider.fromUrl('https://dev.virtualearth.net', options as any);
    }
  }

  if (provider && typeof provider === 'object' && 'type' in provider) {
    const spec = provider as Record<string, unknown>;
    if (spec.type === 'xyz' && typeof spec.url === 'string') {
      const imageryOptions: {
        url: string;
        minimumLevel?: number;
        maximumLevel?: number;
        subdomains?: string[];
      } = {
        url: spec.url,
      };
      if (typeof spec.minimumLevel === 'number') imageryOptions.minimumLevel = spec.minimumLevel;
      if (typeof spec.maximumLevel === 'number') imageryOptions.maximumLevel = spec.maximumLevel;
      if (Array.isArray(spec.subdomains)) {
        imageryOptions.subdomains = spec.subdomains.filter((value): value is string => typeof value === 'string');
      }
      return new Cesium.UrlTemplateImageryProvider({
        ...imageryOptions,
      });
    }
    if (spec.type === 'wms' && typeof spec.url === 'string' && typeof spec.layers === 'string') {
      return new Cesium.WebMapServiceImageryProvider({
        url: spec.url,
        layers: spec.layers,
        parameters: spec.parameters as Record<string, unknown> | undefined,
      });
    }
  }

  return provider;
}
