import * as Cesium from 'cesium';
import { CesiumViewerHandle } from './types';
import { _getInternalViewer } from './viewer';

/**
 * 图层桥接器
 *
 * @description
 * 提供图层相关的 Cesium 原生 API 封装，包括影像图层、3D Tileset、
 * 地形提供者和数据源的添加与移除操作。
 * 所有方法均为静态方法，通过 CesiumViewerHandle 获取内部 Viewer 实例。
 */
export class LayerBridge {
  /**
   * 向场景中添加影像图层
   *
   * @param handle - Cesium Viewer 句柄
   * @param provider - Cesium 影像提供者实例
   * @returns 成功返回创建的 ImageryLayer，失败返回 undefined
   */
  static addImageryLayer(handle: CesiumViewerHandle, provider: Cesium.ImageryProvider): Cesium.ImageryLayer | undefined {
    const viewer = _getInternalViewer(handle);
    if (!viewer) return undefined;
    return viewer.imageryLayers.addImageryProvider(provider);
  }

  /**
   * 从场景中移除影像图层
   *
   * @param handle - Cesium Viewer 句柄
   * @param layer - 要移除的 ImageryLayer 实例
   * @returns 移除成功返回 true，失败返回 false
   */
  static removeImageryLayer(handle: CesiumViewerHandle, layer: Cesium.ImageryLayer): boolean {
    const viewer = _getInternalViewer(handle);
    if (!viewer) return false;
    return viewer.imageryLayers.remove(layer);
  }

  /**
   * 异步加载并添加 3D Tileset 到场景
   *
   * @param handle - Cesium Viewer 句柄
   * @param url - Tileset 的 URL 地址
   * @param options - 可选的加载配置项
   * @returns 成功返回创建的 Cesium3DTileset，失败返回 undefined
   */
  static async add3DTileset(handle: CesiumViewerHandle, url: string, options?: any): Promise<Cesium.Cesium3DTileset | undefined> {
    const viewer = _getInternalViewer(handle);
    if (!viewer) return undefined;
    const tileset = await Cesium.Cesium3DTileset.fromUrl(url, options);
    viewer.scene.primitives.add(tileset);
    return tileset;
  }

  /**
   * 从场景中移除 3D Tileset
   *
   * @param handle - Cesium Viewer 句柄
   * @param tileset - 要移除的 Cesium3DTileset 实例
   * @returns 移除成功返回 true，失败返回 false
   */
  static remove3DTileset(handle: CesiumViewerHandle, tileset: Cesium.Cesium3DTileset): boolean {
    const viewer = _getInternalViewer(handle);
    if (!viewer) return false;
    return viewer.scene.primitives.remove(tileset);
  }

  /**
   * 设置场景的地形提供者
   *
   * @param handle - Cesium Viewer 句柄
   * @param provider - Cesium TerrainProvider 实例
   */
  static setTerrainProvider(handle: CesiumViewerHandle, provider: Cesium.TerrainProvider): void {
    const viewer = _getInternalViewer(handle);
    if (viewer) {
      viewer.scene.terrainProvider = provider;
    }
  }

  /**
   * 移除地形提供者，恢复为默认椭球地形
   *
   * @param handle - Cesium Viewer 句柄
   */
  static removeTerrainProvider(handle: CesiumViewerHandle): void {
    const viewer = _getInternalViewer(handle);
    if (viewer) {
      viewer.scene.terrainProvider = new Cesium.EllipsoidTerrainProvider();
    }
  }

  /**
   * 向 Viewer 添加数据源
   *
   * @param handle - Cesium Viewer 句柄
   * @param dataSource - Cesium DataSource 实例
   * @returns 成功返回 Promise<DataSource>，失败返回 undefined
   */
  static addDataSource(handle: CesiumViewerHandle, dataSource: Cesium.DataSource): Promise<Cesium.DataSource> | undefined {
    const viewer = _getInternalViewer(handle);
    if (!viewer) return undefined;
    
    return viewer.dataSources.add(dataSource);
  }

  /**
   * 从 Viewer 移除数据源
   *
   * @param handle - Cesium Viewer 句柄
   * @param dataSource - 要移除的 Cesium DataSource 实例
   * @returns 移除成功返回 true，失败返回 false
   */
  static removeDataSource(handle: CesiumViewerHandle, dataSource: Cesium.DataSource): boolean {
    const viewer = _getInternalViewer(handle);
    if (!viewer) return false;
    return viewer.dataSources.remove(dataSource);
  }
}
