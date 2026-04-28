import { createFeature, type FeatureOptions, type Feature } from './Feature.js';
import { EntityBridge } from '@cgx/adapter-cesium';
import { effect } from 'alien-signals';

/**
 * 可挂载要素接口
 *
 * @description
 * 实现此接口的要素对象可以在指定适配器上进行挂载和卸载操作。
 */
export interface MountableFeature {
  _mount(adapter: any): void;
  _unmount(adapter: any): void;
}

/** 点要素配置选项 */
export type PointFeatureOptions = FeatureOptions<'point'> & { pixelSize?: number; color?: any };
/** 折线要素配置选项 */
export type PolylineFeatureOptions = FeatureOptions<'polyline'> & { width?: number; material?: any; clampToGround?: boolean };
/** 多边形要素配置选项 */
export type PolygonFeatureOptions = FeatureOptions<'polygon'> & { extrudedHeight?: number; material?: any };
/** 模型要素配置选项 */
export type ModelFeatureOptions = FeatureOptions<'model'> & { uri?: string; scale?: number };
/** 标签要素配置选项 */
export type LabelFeatureOptions = FeatureOptions<'label'> & { text?: string; font?: string; scale?: number };

/**
 * 创建点要素
 *
 * @description
 * 创建并返回一个可挂载的点要素，在挂载时会通过 EntityBridge 创建 Cesium Entity，
 * 并通过 alien-signals 的 effect 实现位置响应式同步。
 *
 * @param opts - 点要素配置选项
 * @returns 包含挂载/卸载能力的点要素
 */
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
        name: feature.name ,
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

/**
 * 创建折线要素
 *
 * @description
 * 创建并返回一个可挂载的折线要素，支持线宽、材质和贴地等配置。
 * 挂载后通过 effect 实现折线顶点位置的响应式同步。
 *
 * @param opts - 折线要素配置选项
 * @returns 包含挂载/卸载能力的折线要素
 */
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

/**
 * 创建多边形要素
 *
 * @description
 * 创建并返回一个可挂载的多边形要素，支持挤出高度和材质配置。
 * 挂载后通过 effect 实现多边形顶点位置的响应式同步。
 *
 * @param opts - 多边形要素配置选项
 * @returns 包含挂载/卸载能力的多边形要素
 */
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

/**
 * 创建模型要素
 *
 * @description
 * 创建并返回一个可挂载的 3D 模型要素，支持 glTF 模型 URI 和缩放比例。
 * 挂载后通过 effect 实现模型位置的响应式同步。
 *
 * @param opts - 模型要素配置选项
 * @returns 包含挂载/卸载能力的模型要素
 */
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

/**
 * 创建标签要素
 *
 * @description
 * 创建并返回一个可挂载的文本标签要素，支持文本内容、字体和缩放比例。
 * 挂载后通过 effect 实现标签位置的响应式同步。
 *
 * @param opts - 标签要素配置选项
 * @returns 包含挂载/卸载能力的标签要素
 */
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
