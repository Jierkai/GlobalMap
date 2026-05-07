import { Cesium } from '../cesium-bridge';

/**
 * @fileoverview 相机跟随工具模块
 * 提供将图元绑定到相机位置的组合组件，供雨、雪、云等天气效果复用
 *
 * @module effect/utils/camera-binder
 */

/**
 * 相机跟随组件
 *
 * @description
 * 将一组 Cesium 图元绑定到相机位置，使天气效果始终围绕观察者渲染。
 * 通过组合方式注入到需要相机跟随的天气效果中。
 *
 * 工作原理：
 * - 每帧根据相机位置和朝向计算天气效果的包围盒中心
 * - 自动更新所有已绑定图元的 modelMatrix，使其跟随相机移动
 * - 支持设置偏移半径，控制效果覆盖范围
 *
 * @example
 * ```typescript
 * const binder = new CameraBinder();
 * binder.bind(rainPrimitive);
 *
 * // 在动画循环中调用
 * animator.start((dt) => {
 *   binder.update(viewer.scene.camera);
 * });
 * ```
 */
export class CameraBinder {
  /** 已绑定的图元集合 */
  private _primitives = new Set<InstanceType<typeof Cesium.Primitive>>();

  /** 效果包围盒中心（本地坐标），缓存以避免每帧分配 */
  private _centerScratch = new Cesium.Cartesian3();

  /** 相机方向向量，缓存以避免每帧分配 */
  private _directionScratch = new Cesium.Cartesian3();

  /**
   * 绑定一个图元到相机位置
   *
   * @param primitive - 要绑定的 Cesium 图元
   */
  bind(primitive: InstanceType<typeof Cesium.Primitive>): void {
    this._primitives.add(primitive);
  }

  /**
   * 解除所有图元的绑定
   */
  unbindAll(): void {
    this._primitives.clear();
  }

  /**
   * 更新所有已绑定图元的位置，使其跟随相机
   *
   * @param camera - Cesium 相机对象
   * @param radius - 效果包围盒半径（米），默认 5000
   * @param altitude - 效果海拔高度范围（米），默认 2000
   */
  update(camera: InstanceType<typeof Cesium.Camera>, radius = 5000, altitude = 2000): void {
    if (this._primitives.size === 0) return;

    const direction = Cesium.Cartesian3.normalize(
      camera.direction,
      this._directionScratch,
    );
    const offset = Cesium.Cartesian3.multiplyByScalar(
      direction,
      radius * 0.5,
      this._directionScratch,
    );
    const center = Cesium.Cartesian3.add(
      camera.position,
      offset,
      this._centerScratch,
    );

    const modelMatrix = Cesium.Transforms.eastNorthUpToFixedFrame(center);
    const scaleMatrix = Cesium.Matrix4.fromUniformScale(
      Math.max(radius, altitude),
    );

    const finalMatrix = Cesium.Matrix4.multiply(
      modelMatrix,
      scaleMatrix,
      new Cesium.Matrix4(),
    );

    for (const primitive of this._primitives) {
      if (!primitive.isDestroyed()) {
        primitive.modelMatrix = finalMatrix;
      }
    }
  }
}
