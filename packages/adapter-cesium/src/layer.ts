/**
 * @fileoverview 图层桥接器模块
 * 提供图层相关的 Cesium 原生 API 封装
 * 
 * @module layer
 * @description
 * 该模块封装了 Cesium 的图层管理 API，提供统一的静态方法接口，
 * 包括影像图层、3D Tileset、地形提供者和数据源的添加与移除操作。
 */

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
   * @param provider - Cesium 影像提供者实例（如 UrlTemplateImageryProvider、WebMapServiceImageryProvider 等）
   * @returns {Cesium.ImageryLayer | undefined} 成功返回创建的 ImageryLayer，Viewer 无效时返回 undefined
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
   * @returns {boolean} 移除成功返回 true，Viewer 无效或移除失败返回 false
   */
  static removeImageryLayer(handle: CesiumViewerHandle, layer: Cesium.ImageryLayer): boolean {
    const viewer = _getInternalViewer(handle);
    if (!viewer) return false;
    return viewer.imageryLayers.remove(layer);
  }

  /**
   * 异步加载并添加 3D Tileset 到场景
   *
   * @description
   * 使用 Cesium3DTileset.fromUrl() 异步加载 Tileset 数据，
   * 加载完成后自动添加到场景的 primitives 集合中。
   *
   * @param handle - Cesium Viewer 句柄
   * @param url - Tileset 的 URL 地址（.json 或 .tileset 文件）
   * @param options - 可选的加载配置项（如 maximumScreenSpaceError 等）
   * @returns {Promise<Cesium.Cesium3DTileset | undefined>} 成功返回创建的 Cesium3DTileset，Viewer 无效时返回 undefined
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
   * @returns {boolean} 移除成功返回 true，Viewer 无效或移除失败返回 false
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
   * @param provider - Cesium TerrainProvider 实例（如 CesiumTerrainProvider、EllipsoidTerrainProvider 等）
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
   * @description
   * 将场景的地形提供者重置为 EllipsoidTerrainProvider，
   * 即无地形的平滑椭球面。
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
   * @description
   * 将 DataSource（如 GeoJsonDataSource、CzmlDataSource 等）添加到 Viewer 的数据源集合中。
   *
   * @param handle - Cesium Viewer 句柄
   * @param dataSource - Cesium DataSource 实例
   * @returns {Promise<Cesium.DataSource> | undefined} 成功返回 Promise<DataSource>，Viewer 无效时返回 undefined
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
   * @returns {boolean} 移除成功返回 true，Viewer 无效或移除失败返回 false
   */
  static removeDataSource(handle: CesiumViewerHandle, dataSource: Cesium.DataSource): boolean {
    const viewer = _getInternalViewer(handle);
    if (!viewer) return false;
    return viewer.dataSources.remove(dataSource);
  }
}
