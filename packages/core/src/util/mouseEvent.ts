import * as Cesium from "cesium";

export type ScreenInteractCallback = (screenPt: Cesium.Cartesian2, worldPt?: Cesium.Cartesian3) => void;

/**
 * 屏幕交互侦听器，用于代理 Cesium 原生的输入操作
 */
export class ScreenInteractor {
  private _eventHandler: Cesium.ScreenSpaceEventHandler | null;
  private readonly _viewerScene: Cesium.Scene;

  constructor(sceneInstance: Cesium.Scene) {
    this._viewerScene = sceneInstance;
    this._eventHandler = new Cesium.ScreenSpaceEventHandler(sceneInstance.canvas);
  }

  registerLeftClick(cb: ScreenInteractCallback): void {
    if (!this._eventHandler) return;
    this._eventHandler.setInputAction((evt: { position: Cesium.Cartesian2 }) => {
      const wPt = this._viewerScene.pickPosition(evt.position);
      cb(evt.position, wPt);
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
  }

  registerLeftDoubleClick(cb: ScreenInteractCallback): void {
    if (!this._eventHandler) return;
    this._eventHandler.setInputAction((evt: { position: Cesium.Cartesian2 }) => {
      const wPt = this._viewerScene.pickPosition(evt.position);
      cb(evt.position, wPt);
    }, Cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK);
  }

  registerRightClick(cb: ScreenInteractCallback): void {
    if (!this._eventHandler) return;
    this._eventHandler.setInputAction((evt: { position: Cesium.Cartesian2 }) => {
      const wPt = this._viewerScene.pickPosition(evt.position);
      cb(evt.position, wPt);
    }, Cesium.ScreenSpaceEventType.RIGHT_CLICK);
  }

  registerPointerMove(cb: ScreenInteractCallback): void {
    if (!this._eventHandler) return;
    this._eventHandler.setInputAction((evt: { endPosition: Cesium.Cartesian2 }) => {
      const wPt = this._viewerScene.pickPosition(evt.endPosition);
      cb(evt.endPosition, wPt);
    }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);
  }

  dispose(): void {
    if (this._eventHandler) {
      this._eventHandler.destroy();
      this._eventHandler = null;
    }
  }
}
