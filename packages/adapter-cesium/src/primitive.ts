import * as Cesium from 'cesium';
import { CesiumViewerHandle } from './types';
import { _getInternalViewer } from './viewer';

export class EntityBridge {
  static addEntity(handle: CesiumViewerHandle, options: Cesium.Entity.ConstructorOptions): Cesium.Entity | undefined {
    const viewer = _getInternalViewer(handle);
    if (!viewer) return undefined;
    return viewer.entities.add(options);
  }

  static removeEntity(handle: CesiumViewerHandle, entity: Cesium.Entity): boolean {
    const viewer = _getInternalViewer(handle);
    if (!viewer) return false;
    return viewer.entities.remove(entity);
  }

  static updateEntity(entity: Cesium.Entity, options: Partial<Cesium.Entity.ConstructorOptions>): void {
    if (options.position) {
      entity.position = options.position as any;
    }
    if (options.point) {
      this.updateProperty(entity, 'point', options.point);
    }
    if (options.polyline) {
      this.updateProperty(entity, 'polyline', options.polyline);
    }
    if (options.polygon) {
      this.updateProperty(entity, 'polygon', options.polygon);
    }
    if (options.model) {
      this.updateProperty(entity, 'model', options.model);
    }
    if (options.properties) {
      entity.properties = options.properties as any;
    }
  }

  private static updateProperty(entity: Cesium.Entity, key: string, value: any) {
    if (!entity[key as keyof Cesium.Entity]) {
      (entity as any)[key] = value;
    } else {
      const prop = entity[key as keyof Cesium.Entity] as any;
      Object.keys(value).forEach((k) => {
        prop[k] = value[k];
      });
    }
  }
}
