import { Cesium } from '../cesium-bridge';

/**
 * @fileoverview 场景图元管理工具模块
 * 提供图元批量添加/移除的组合组件
 *
 * @module effect/utils/scene-manager
 */

/**
 * 场景图元管理组件
 *
 * @description
 * 管理一组 Cesium 图元在场景中的添加与移除操作。
 * 封装了与场景的交互细节，使天气效果类专注于自身逻辑。
 *
 * @example
 * ```typescript
 * const manager = new ScenePrimitiveManager();
 * const primitive = new Cesium.Primitive({ ... });
 * manager.register(primitive);
 * manager.addAll(scene);
 * manager.removeAll(scene);
 * ```
 */
export class ScenePrimitiveManager {
  /** 已注册的图元集合 */
  private _primitives: Array<InstanceType<typeof Cesium.Primitive>> = [];

  /**
   * 注册一个图元
   *
   * @param primitive - 要注册的 Cesium 图元
   */
  register(primitive: InstanceType<typeof Cesium.Primitive>): void {
    this._primitives.push(primitive);
  }

  /**
   * 将所有已注册的图元添加到场景
   *
   * @param scene - Cesium 场景对象
   */
  addAll(scene: InstanceType<typeof Cesium.Scene>): void {
    for (const primitive of this._primitives) {
      if (!primitive.isDestroyed() && !scene.primitives.contains(primitive)) {
        scene.primitives.add(primitive);
      }
    }
  }

  /**
   * 从场景中移除所有已注册的图元
   *
   * @param scene - Cesium 场景对象
   */
  removeAll(scene: InstanceType<typeof Cesium.Scene>): void {
    for (const primitive of this._primitives) {
      if (!primitive.isDestroyed() && scene.primitives.contains(primitive)) {
        scene.primitives.remove(primitive);
      }
    }
  }

  /**
   * 销毁所有已注册的图元并清空集合
   */
  disposeAll(): void {
    for (const primitive of this._primitives) {
      if (!primitive.isDestroyed()) {
        primitive.destroy();
      }
    }
    this._primitives.length = 0;
  }
}
