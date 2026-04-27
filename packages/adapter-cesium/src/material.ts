import * as Cesium from 'cesium';

/**
 * Cesium Fabric 材质配置选项
 */
export interface FabricMaterialOptions {
  /** 材质类型标识 */
  type: string;
  /** 自定义统一变量 */
  uniforms?: Record<string, any>;
  /** 着色器组件定义 */
  components?: {
    diffuse?: string;
    specular?: string;
    alpha?: string;
    material?: string;
  };
  /** GLSL 源码 */
  source?: string;
}

/**
 * 材质桥接器
 *
 * @description
 * 封装 Cesium Fabric 材质系统，提供自定义材质的创建和注册功能。
 * Cesium 在首次创建材质类型后会缓存该类型，后续相同类型可直接使用。
 */
export class MaterialBridge {
  /**
   * 使用 Fabric 着色器创建 Cesium 材质
   *
   * @param options - 材质配置选项
   * @returns Cesium Material 实例
   */
  static createMaterial(options: FabricMaterialOptions): Cesium.Material {
    return new Cesium.Material({
      fabric: {
        type: options.type,
        uniforms: options.uniforms,
        components: options.components,
        source: options.source,
      },
    });
  }

  /**
   * 注册自定义材质类型到 Cesium 内部缓存
   *
   * @description
   * 调用此方法会在 Cesium 内部注册材质类型，使后续创建相同
   * 类型的材质时可以直接从缓存中获取，无需重新编译着色器。
   *
   * @param options - 材质配置选项
   */
  static registerCustomMaterial(options: FabricMaterialOptions): void {
    // Calling new Cesium.Material registers the type in Cesium's internal cache
    // if a type is provided in the fabric options.
    this.createMaterial(options);
  }
}
