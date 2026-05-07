import * as Cesium from 'cesium';
import { CesiumViewerHandle } from './types';
import { _getInternalViewer } from './viewer';

export class PickingBridge {
  private static objectToFeatureMap = new WeakMap<object, any>();
  private static primitiveToFeatureMap = new Map<string | number | symbol, any>();

  /**
   * Bind a feature data object to a Cesium entity or primitive.
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
   * Retrieve the bound feature data object from a Cesium entity or primitive.
   */
  static getFeature(cesiumObject: any): any | undefined {
    if (!cesiumObject) return undefined;
    if (typeof cesiumObject === 'object' || typeof cesiumObject === 'function') {
      return this.objectToFeatureMap.get(cesiumObject);
    }
    return this.primitiveToFeatureMap.get(cesiumObject);
  }

  /**
   * Unbind a feature data object.
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
   * Pick an object at a specific window position.
   * Returns the bound feature if it exists, otherwise the picked object.
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
   * Drill pick all objects at a specific window position.
   * Returns the bound features if they exist, otherwise the picked objects.
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
