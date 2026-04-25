import { createBaseLayer, type Layer } from './types.js';

export interface TilesetLayerOptions {
  id?: string;
  url: string;
  visible?: boolean;
  opacity?: number;
  zIndex?: number;
}

export interface TilesetLayer extends Layer {
  readonly type: 'tileset';
  readonly url: string;
}

export function createTilesetLayer(opts: TilesetLayerOptions): TilesetLayer {
  const base = createBaseLayer(opts.id || crypto.randomUUID(), 'tileset');
  if (opts.visible !== undefined) base.visible(opts.visible);
  if (opts.opacity !== undefined) base.opacity(opts.opacity);
  if (opts.zIndex !== undefined) base.zIndex(opts.zIndex);

  return {
    ...base,
    type: 'tileset',
    url: opts.url
  };
}
