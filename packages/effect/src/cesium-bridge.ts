import { unsafeGetCesium } from '@cgx/adapter-cesium';

export const Cesium = unsafeGetCesium();

export type Viewer = InstanceType<typeof Cesium.Viewer>;
export type Scene = InstanceType<typeof Cesium.Scene>;
export type Camera = InstanceType<typeof Cesium.Camera>;
export type PostProcessStage = InstanceType<typeof Cesium.PostProcessStage>;
export type Billboard = InstanceType<typeof Cesium.Billboard>;
export type BillboardCollection = InstanceType<typeof Cesium.BillboardCollection>;
export type Primitive = InstanceType<typeof Cesium.Primitive>;
export type Cartesian3 = InstanceType<typeof Cesium.Cartesian3>;
export type Color = InstanceType<typeof Cesium.Color>;
