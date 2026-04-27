import * as Cesium from 'cesium';
import { CesiumViewerHandle } from './types';
import { _getInternalViewer } from './viewer';

/**
 * 图元桥接器
 *
 * @description
 * 封装 Cesium Entity 的增删改操作，提供统一的图元管理接口。
 * 通过 CesiumViewerHandle 获取内部 Viewer 实例进行操作。
 */
export class EntityBridge {
  /**
   * 向场景中添加一个新的 Entity 图元
   *
   * @param handle - Cesium Viewer 句柄
   * @param options - Cesium Entity 构造选项
   * @returns 成功返回创建的 Entity，失败返回 undefined
   */
  static addEntity(handle: CesiumViewerHandle, options: Cesium.Entity.ConstructorOptions): Cesium.Entity | undefined {
    const viewer = _getInternalViewer(handle);
    if (!viewer) return undefined;
    return viewer.entities.add(options);
  }

  /**
   * 从场景中移除指定的 Entity
   *
   * @param handle - Cesium Viewer 句柄
   * @param entity - 要移除的 Entity 实例
   * @returns 移除成功返回 true，失败返回 false
   */
  static removeEntity(handle: CesiumViewerHandle, entity: Cesium.Entity): boolean {
    const viewer = _getInternalViewer(handle);
    if (!viewer) return false;
    return viewer.entities.remove(entity);
  }

  /**
   * 更新 Entity 的属性
   *
   * @description
   * 支持部分更新 Entity 的可选属性，包括 position、point、
   * polyline、polygon、model 和 properties。
   * 对于已存在的图形属性，会进行增量合并更新。
   *
   * @param entity - 要更新的 Entity 实例
   * @param options - 需要更新的属性选项
   */
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

  /**
   * 更新或设置 Entity 的单个属性
   *
   * @description
   * 如果属性不存在，直接赋值；如果已存在，则进行增量合并。
   *
   * @param entity - Cesium Entity 实例
   * @param key - 属性名称
   * @param value - 属性值
   */
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
