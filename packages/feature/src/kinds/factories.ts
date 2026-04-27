import { createFeature, type FeatureOptions, type Feature } from './Feature.js';
import { EntityBridge } from '@cgx/adapter-cesium';
import { effect } from 'alien-signals';

export interface MountableFeature {
  _mount(adapter: any): void;
  _unmount(adapter: any): void;
}

export type PointFeatureOptions = FeatureOptions<'point'> & { pixelSize?: number; color?: any };
export type PolylineFeatureOptions = FeatureOptions<'polyline'> & { width?: number; material?: any; clampToGround?: boolean };
export type PolygonFeatureOptions = FeatureOptions<'polygon'> & { extrudedHeight?: number; material?: any };
export type ModelFeatureOptions = FeatureOptions<'model'> & { uri?: string; scale?: number };
export type LabelFeatureOptions = FeatureOptions<'label'> & { text?: string; font?: string; scale?: number };

export function createPointFeature(opts: PointFeatureOptions): Feature<'point'> & MountableFeature {
  const feature = createFeature('point', opts);
  let entity: any = null;
  let effectDisposer: (() => void) | null = null;

  return {
    ...feature,
    _mount(adapter: any) {
      if (!adapter) return;
      
      const options = {
        id: feature.id,
        name: feature.name,
        position: feature.position?.(),
        point: {
          pixelSize: opts.pixelSize ?? 10,
          color: opts.color
        }
      };
      entity = EntityBridge.addEntity(adapter, options);
      
      if (entity) {
        effectDisposer = effect(() => {
           if (feature.position) {
              EntityBridge.updateEntity(entity, { position: feature.position() as any });
           }
        });
      }
    },
    _unmount(adapter: any) {
      if (effectDisposer) {
        effectDisposer();
        effectDisposer = null;
      }
      if (entity && adapter) {
        EntityBridge.removeEntity(adapter, entity);
        entity = null;
      }
    }
  } as any;
}

export function createPolylineFeature(opts: PolylineFeatureOptions): Feature<'polyline'> & MountableFeature {
  const feature = createFeature('polyline', opts);
  let entity: any = null;
  let effectDisposer: (() => void) | null = null;

  return {
    ...feature,
    _mount(adapter: any) {
      if (!adapter) return;
      
      const options = {
        id: feature.id,
        name: feature.name,
        polyline: {
          positions: feature.positions?.(),
          width: opts.width ?? 2,
          material: opts.material,
          clampToGround: opts.clampToGround
        }
      };
      entity = EntityBridge.addEntity(adapter, options);
      
      if (entity) {
        effectDisposer = effect(() => {
           if (feature.positions) {
              EntityBridge.updateEntity(entity, { polyline: { positions: feature.positions() } as any });
           }
        });
      }
    },
    _unmount(adapter: any) {
      if (effectDisposer) { effectDisposer(); effectDisposer = null; }
      if (entity && adapter) { EntityBridge.removeEntity(adapter, entity); entity = null; }
    }
  } as any;
}

export function createPolygonFeature(opts: PolygonFeatureOptions): Feature<'polygon'> & MountableFeature {
  const feature = createFeature('polygon', opts);
  let entity: any = null;
  let effectDisposer: (() => void) | null = null;

  return {
    ...feature,
    _mount(adapter: any) {
      if (!adapter) return;
      
      const options = {
        id: feature.id,
        name: feature.name,
        polygon: {
          hierarchy: feature.positions?.(),
          extrudedHeight: opts.extrudedHeight,
          material: opts.material
        }
      };
      entity = EntityBridge.addEntity(adapter, options);
      
      if (entity) {
        effectDisposer = effect(() => {
           if (feature.positions) {
              EntityBridge.updateEntity(entity, { polygon: { hierarchy: feature.positions() } as any });
           }
        });
      }
    },
    _unmount(adapter: any) {
      if (effectDisposer) { effectDisposer(); effectDisposer = null; }
      if (entity && adapter) { EntityBridge.removeEntity(adapter, entity); entity = null; }
    }
  } as any;
}

export function createModelFeature(opts: ModelFeatureOptions): Feature<'model'> & MountableFeature {
  const feature = createFeature('model', opts);
  let entity: any = null;
  let effectDisposer: (() => void) | null = null;

  return {
    ...feature,
    _mount(adapter: any) {
      if (!adapter) return;
      
      const options = {
        id: feature.id,
        name: feature.name,
        position: feature.position?.(),
        model: {
          uri: opts.uri,
          scale: opts.scale ?? 1.0
        }
      };
      entity = EntityBridge.addEntity(adapter, options);
      
      if (entity) {
        effectDisposer = effect(() => {
           if (feature.position) {
              EntityBridge.updateEntity(entity, { position: feature.position() as any });
           }
        });
      }
    },
    _unmount(adapter: any) {
      if (effectDisposer) { effectDisposer(); effectDisposer = null; }
      if (entity && adapter) { EntityBridge.removeEntity(adapter, entity); entity = null; }
    }
  } as any;
}

export function createLabelFeature(opts: LabelFeatureOptions): Feature<'label'> & MountableFeature {
  const feature = createFeature('label', opts);
  let entity: any = null;
  let effectDisposer: (() => void) | null = null;

  return {
    ...feature,
    _mount(adapter: any) {
      if (!adapter) return;
      
      const options = {
        id: feature.id,
        name: feature.name,
        position: feature.position?.(),
        label: {
          text: opts.text ?? '',
          font: opts.font,
          scale: opts.scale ?? 1.0
        }
      };
      entity = EntityBridge.addEntity(adapter, options);
      
      if (entity) {
        effectDisposer = effect(() => {
           if (feature.position) {
              EntityBridge.updateEntity(entity, { position: feature.position() as any });
           }
        });
      }
    },
    _unmount(adapter: any) {
      if (effectDisposer) { effectDisposer(); effectDisposer = null; }
      if (entity && adapter) { EntityBridge.removeEntity(adapter, entity); entity = null; }
    }
  } as any;
}
