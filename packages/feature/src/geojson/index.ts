import type { FeatureKind, Feature, FeatureOptions } from '../kinds/Feature.js';
import { createFeature } from '../kinds/Feature.js';

/**
 * 将一个 Cgx Feature 对象序列化为标准的 GeoJSON Feature 对象。
 * 在 properties 中保留了如 `_cgx_kind` 这样的框架专用元数据特征。
 * @param feature 需要序列化的 Feature 实例。
 * @returns 生成的标准化 GeoJSON Feature 对象。
 */
export function toGeoJSON(feature: Feature<FeatureKind>): Record<string, unknown> {
  let geometry: Record<string, unknown> | null = null;
  const kind = feature.kind;
  
  if ('position' in feature) {
    const pos = (feature.position as () => unknown)();
    // 假设 pos 是一个兼容 GeoJSON 的简单数组 [lng, lat] 或者包含 {lng, lat} 的对象
    const coords = Array.isArray(pos) ? pos : (pos ? [(pos as {lng: number; lat: number}).lng, (pos as {lng: number; lat: number}).lat] : [0, 0]);
    geometry = { type: 'Point', coordinates: coords };
  } else if ('positions' in feature) {
    const posArr = (feature.positions as () => unknown[])();
    const coords = posArr.map((p: unknown) => Array.isArray(p) ? p : [(p as {lng: number; lat: number}).lng, (p as {lng: number; lat: number}).lat]);
    geometry = { type: kind === 'polygon' ? 'Polygon' : 'LineString', coordinates: kind === 'polygon' ? [coords] : coords };
  }

  return {
    type: 'Feature',
    properties: { ...feature.properties, _cgx_kind: kind },
    geometry
  };
}

/**
 * 反序列化，将一个标准的 GeoJSON Feature 对象转化为 Cgx Feature 实例。
 * 基于 `_cgx_kind` 属性或者是集合类型 (geometry type) 来推断重构几何特征的类别。
 * @param gj 需要被解析重建的 GeoJSON Feature 对象。
 * @returns 反序列化得到的 Cgx Feature 实例。
 */
export function fromGeoJSON(gj: Record<string, unknown>): Feature<FeatureKind> {
  if (gj.type !== 'Feature' || !gj.geometry) {
    throw new Error('Invalid GeoJSON Feature');
  }

  const geometry = gj.geometry as Record<string, unknown>;
  const props = (gj.properties as Record<string, unknown>) ?? {};
  const kind = (props._cgx_kind as string) ?? 
               (geometry.type === 'Point' ? 'point' : 
                geometry.type === 'Polygon' ? 'polygon' : 'polyline');
                
  const opts: FeatureOptions<FeatureKind> = {
    properties: { ...props }
  };
  delete opts.properties!._cgx_kind;

  if (geometry.type === 'Point') {
    opts.position = geometry.coordinates;
  } else if (geometry.type === 'Polygon') {
    opts.positions = (geometry.coordinates as unknown[][])[0] ?? [];
  } else if (geometry.type === 'LineString') {
    opts.positions = geometry.coordinates as unknown[];
  }

  return createFeature(kind as FeatureKind, opts);
}
