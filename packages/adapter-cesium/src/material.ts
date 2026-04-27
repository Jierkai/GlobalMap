import * as Cesium from 'cesium';

export interface FabricMaterialOptions {
  type: string;
  uniforms?: Record<string, any>;
  components?: {
    diffuse?: string;
    specular?: string;
    alpha?: string;
    material?: string;
  };
  source?: string;
}

export class MaterialBridge {
  /**
   * Create a Cesium Material using Fabric shader
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
   * Registers a custom material type in Cesium if caching is needed.
   * Note: Cesium caches material by type once created. 
   * This is a utility to prime the cache or encapsulate the creation.
   */
  static registerCustomMaterial(options: FabricMaterialOptions): void {
    // Calling new Cesium.Material registers the type in Cesium's internal cache
    // if a type is provided in the fabric options.
    this.createMaterial(options);
  }
}
