/**
 * @fileoverview 拾取桥接器模块
 * 提供 Cesium 场景拾取功能的封装，支持要素数据绑定和拾取查询
 * 
 * @module picking
 * @description
 * 该模块封装了 Cesium 的场景拾取（Picking）功能，提供：
 * - 要素数据与 Cesium 对象的绑定/解绑
 * - 单点拾取和深度拾取
 * - 自动返回绑定的要素数据而非原始 Cesium 对象
 */

import * as Cesium from 'cesium';
import { CesiumViewerHandle } from './types';
import { _getInternalViewer } from './viewer';

/**
 * 拾取桥接器
 * 
 * @description
 * 管理 Cesium 对象与要素数据之间的映射关系，提供统一的拾取接口。
 * 使用 WeakMap 存储对象类型映射（自动垃圾回收），
 * 使用 Map 存储原始类型（字符串/数字/Symbol）映射。
 */
export class PickingBridge {
  /** 对象类型到要素数据的弱映射（Entity、Primitive 等） */
  private static objectToFeatureMap = new WeakMap<object, any>();
  /** 原始类型到要素数据的映射（用于集合项的 ID 绑定） */
  private static primitiveToFeatureMap = new Map<string | number | symbol, any>();

  /**
   * 绑定要素数据到 Cesium 对象
   * 
   * @description
   * 将要素数据对象与 Cesium Entity 或 Primitive 建立映射关系。
   * 对于对象类型使用 WeakMap（自动垃圾回收），
   * 对于原始类型（如集合项 ID）使用普通 Map。
   * 
   * @param cesiumObject - Cesium 对象（Entity、Primitive 或原始 ID）
   * @param feature - 要绑定的要素数据对象
   */
  static setFeature(cesiumObject: any, feature: any): void {
    if (cesiumObject) {
      if (typeof cesiumObject === 'object' || typeof cesiumObject === 'function') {
        this.objectToFeatureMap.set(cesiumObject, feature);
      } else {
        this.primitiveToFeatureMap.set(cesiumObject, feature);
      }
    }
  }

  /**
   * 获取绑定的要素数据
   * 
   * @param cesiumObject - Cesium 对象（Entity、Primitive 或原始 ID）
   * @returns {any | undefined} 绑定的要素数据，未找到返回 undefined
   */
  static getFeature(cesiumObject: any): any | undefined {
    if (!cesiumObject) return undefined;
    if (typeof cesiumObject === 'object' || typeof cesiumObject === 'function') {
      return this.objectToFeatureMap.get(cesiumObject);
    }
    return this.primitiveToFeatureMap.get(cesiumObject);
  }

  /**
   * 解绑要素数据
   * 
   * @param cesiumObject - Cesium 对象（Entity、Primitive 或原始 ID）
   */
  static removeFeature(cesiumObject: any): void {
    if (cesiumObject) {
      if (typeof cesiumObject === 'object' || typeof cesiumObject === 'function') {
        this.objectToFeatureMap.delete(cesiumObject);
      } else {
        this.primitiveToFeatureMap.delete(cesiumObject);
      }
    }
  }

  /**
   * 在指定屏幕位置拾取单个对象
   * 
   * @description
   * 使用 scene.pick() 进行单点拾取，返回最前面的对象。
   * 如果拾取到的对象绑定了要素数据，则返回要素数据；
   * 否则返回原始拾取结果。
   * 
   * @param handle - Cesium Viewer 句柄
   * @param windowPosition - 屏幕窗口坐标
   * @returns {any | undefined} 拾取到的要素数据或原始对象，未拾取到返回 undefined
   */
  static pick(handle: CesiumViewerHandle, windowPosition: Cesium.Cartesian2): any | undefined {
    const viewer = _getInternalViewer(handle);
    if (!viewer) return undefined;
    
    const pickedObject = viewer.scene.pick(windowPosition);
    if (pickedObject) {
      const target = pickedObject.id || pickedObject.primitive || pickedObject;
      return this.getFeature(target) || pickedObject;
    }
    return undefined;
  }

  /**
   * 在指定屏幕位置深度拾取所有对象
   * 
   * @description
   * 使用 scene.drillPick() 进行深度拾取，返回该位置所有重叠的对象。
   * 对每个拾取结果，优先返回绑定的要素数据。
   * 
   * @param handle - Cesium Viewer 句柄
   * @param windowPosition - 屏幕窗口坐标
   * @param limit - 最大拾取数量限制，可选
   * @returns {any[]} 拾取到的要素数据或原始对象数组
   */
  static drillPick(handle: CesiumViewerHandle, windowPosition: Cesium.Cartesian2, limit?: number): any[] {
    const viewer = _getInternalViewer(handle);
    if (!viewer) return [];
    
    const pickedObjects = viewer.scene.drillPick(windowPosition, limit);
    return pickedObjects.map(pickedObject => {
      const target = pickedObject.id || pickedObject.primitive || pickedObject;
      return this.getFeature(target) || pickedObject;
    });
  }
}
