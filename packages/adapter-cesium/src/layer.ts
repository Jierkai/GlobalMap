import * as Cesium from 'cesium';
import { CesiumViewerHandle } from './types';
import { _getInternalViewer } from './viewer';

export class LayerBridge {
  static addImageryLayer(handle: CesiumViewerHandle, provider: Cesium.ImageryProvider): Cesium.ImageryLayer | undefined {
    const viewer = _getInternalViewer(handle);
    if (!viewer) return undefined;
    return viewer.imageryLayers.addImageryProvider(provider);
  }

  static removeImageryLayer(handle: CesiumViewerHandle, layer: Cesium.ImageryLayer): boolean {
    const viewer = _getInternalViewer(handle);
    if (!viewer) return false;
    return viewer.imageryLayers.remove(layer);
  }

  static async add3DTileset(handle: CesiumViewerHandle, url: string, options?: any): Promise<Cesium.Cesium3DTileset | undefined> {
    const viewer = _getInternalViewer(handle);
    if (!viewer) return undefined;
    const tileset = await Cesium.Cesium3DTileset.fromUrl(url, options);
    viewer.scene.primitives.add(tileset);
    return tileset;
  }

  static remove3DTileset(handle: CesiumViewerHandle, tileset: Cesium.Cesium3DTileset): boolean {
    const viewer = _getInternalViewer(handle);
    if (!viewer) return false;
    return viewer.scene.primitives.remove(tileset);
  }

  static setTerrainProvider(handle: CesiumViewerHandle, provider: Cesium.TerrainProvider): void {
    const viewer = _getInternalViewer(handle);
    if (viewer) {
      viewer.scene.terrainProvider = provider;
    }
  }

  static removeTerrainProvider(handle: CesiumViewerHandle): void {
    const viewer = _getInternalViewer(handle);
    if (viewer) {
      viewer.scene.terrainProvider = new Cesium.EllipsoidTerrainProvider();
    }
  }

  static addDataSource(handle: CesiumViewerHandle, dataSource: Cesium.DataSource): Promise<Cesium.DataSource> | undefined {
    const viewer = _getInternalViewer(handle);
    if (!viewer) return undefined;
    
    return viewer.dataSources.add(dataSource);
  }

  static removeDataSource(handle: CesiumViewerHandle, dataSource: Cesium.DataSource): boolean {
    const viewer = _getInternalViewer(handle);
    if (!viewer) return false;
    return viewer.dataSources.remove(dataSource);
  }
}
