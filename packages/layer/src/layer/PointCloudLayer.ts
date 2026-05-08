import { createDataLayer, type DataLayer } from './DataLayer.js';

export interface PointCloudLayerOptions {
  id?: string;
  url: string;
  options?: Record<string, unknown>;
  visible?: boolean;
  opacity?: number;
  zIndex?: number;
}

export interface PointCloudLayer extends DataLayer {
  readonly sourceType: 'point-cloud';
  readonly url: string;
}

export function createPointCloudLayer(opts: PointCloudLayerOptions): PointCloudLayer {
  const layer = createDataLayer({
    sourceType: 'point-cloud',
    payload: { url: opts.url },
    ...(opts.id !== undefined ? { id: opts.id } : {}),
    ...(opts.options !== undefined ? { options: opts.options } : {}),
    ...(opts.visible !== undefined ? { visible: opts.visible } : {}),
    ...(opts.opacity !== undefined ? { opacity: opts.opacity } : {}),
    ...(opts.zIndex !== undefined ? { zIndex: opts.zIndex } : {}),
  });

  return {
    ...layer,
    sourceType: 'point-cloud',
    url: opts.url,
  } as PointCloudLayer;
}
