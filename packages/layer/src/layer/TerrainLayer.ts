import { createBaseLayer, type Layer } from './types.js';

export interface TerrainLayerOptions {
  id?: string;
  provider: any; // e.g. Promise<TerrainProvider> | TerrainProvider
  visible?: boolean;
}

export interface TerrainLayer extends Layer {
  readonly type: 'terrain';
  readonly provider: any;
}

export function createTerrainLayer(opts: TerrainLayerOptions): TerrainLayer {
  const base = createBaseLayer(opts.id || crypto.randomUUID(), 'terrain');
  if (opts.visible !== undefined) base.visible(opts.visible);

  return {
    ...base,
    type: 'terrain',
    provider: opts.provider
  };
}
