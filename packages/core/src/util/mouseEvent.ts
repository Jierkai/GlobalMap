import type { ScreenPoint } from '../adapter/EngineAdapter.js';

export interface ScreenInteractSource {
  canvas: EventTarget;
  pickPosition?(screenPt: ScreenPoint): unknown;
}

export type ScreenInteractCallback = (screenPt: ScreenPoint, worldPt?: unknown) => void;

/**
 * 屏幕交互侦听器，用于代理 Cesium 原生的输入操作
 */
export class ScreenInteractor {
  private readonly _source: ScreenInteractSource;
  private readonly _listeners: Array<{ type: string; handler: EventListener }> = [];

  constructor(source: ScreenInteractSource) {
    this._source = source;
  }

  registerLeftClick(cb: ScreenInteractCallback): void {
    this._bind('click', cb);
  }

  registerLeftDoubleClick(cb: ScreenInteractCallback): void {
    this._bind('dblclick', cb);
  }

  registerRightClick(cb: ScreenInteractCallback): void {
    this._bind('contextmenu', cb);
  }

  registerPointerMove(cb: ScreenInteractCallback): void {
    this._bind('mousemove', cb, true);
  }

  dispose(): void {
    for (const { type, handler } of this._listeners) {
      this._source.canvas.removeEventListener(type, handler);
    }
    this._listeners.length = 0;
  }

  private _bind(type: string, cb: ScreenInteractCallback, useClientPosition = false): void {
    const handler = (evt: Event) => {
      if (!(evt instanceof MouseEvent)) return;
      const screenPt: ScreenPoint = {
        x: useClientPosition ? evt.clientX : evt.clientX,
        y: useClientPosition ? evt.clientY : evt.clientY,
      };
      const worldPt = this._source.pickPosition?.(screenPt);
      cb(screenPt, worldPt);
    };

    this._source.canvas.addEventListener(type, handler);
    this._listeners.push({ type, handler });
  }
}
