import { createDataLayer, type DataLayer } from './DataLayer.js';

export interface GeoJsonLayerOptions {
  id?: string;
  data: unknown;
  options?: Record<string, unknown>;
  visible?: boolean;
  opacity?: number;
  zIndex?: number;
}

export interface GeoJsonLayer extends DataLayer {
  readonly sourceType: 'geojson';
  readonly data: unknown;
}

export function createGeoJsonLayer(opts: GeoJsonLayerOptions): GeoJsonLayer {
  const layer = createDataLayer({
    sourceType: 'geojson',
    payload: opts.data,
    ...(opts.id !== undefined ? { id: opts.id } : {}),
    ...(opts.options !== undefined ? { options: opts.options } : {}),
    ...(opts.visible !== undefined ? { visible: opts.visible } : {}),
    ...(opts.opacity !== undefined ? { opacity: opts.opacity } : {}),
    ...(opts.zIndex !== undefined ? { zIndex: opts.zIndex } : {}),
  });

  return {
    ...layer,
    sourceType: 'geojson',
    data: opts.data,
  } as GeoJsonLayer;
}
