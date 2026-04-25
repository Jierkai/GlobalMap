/**
 * @fileoverview 屏幕空间事件发射器模块
 * 提供统一的屏幕空间事件处理接口，将 Cesium 的屏幕空间事件转换为标准化的事件格式
 * 
 * @module event
 * @description
 * 该模块封装了 Cesium 的 ScreenSpaceEventHandler，提供统一的事件处理接口。
 * 支持鼠标点击、双击、按下、抬起、右键点击和鼠标移动等事件。
 * 所有事件都会自动将屏幕坐标转换为地理坐标（经纬度）。
 */

import * as Cesium from 'cesium';
import type { TypedEvents, NativeScene, Off } from './types';
import { fromCartesian3 } from './coord';

/**
 * 屏幕空间事件发射器类
 * 
 * @description
 * 该类封装了 Cesium 的屏幕空间事件处理，提供统一的事件订阅和发射机制。
 * 它将 Cesium 的原生屏幕空间事件转换为标准化的地理坐标事件格式，
 * 使上层代码无需关心底层坐标转换的细节。
 * 
 * @example
 * ```typescript
 * const emitter = new ScreenSpaceEmitter(scene, canvas);
 * 
 * // 订阅点击事件
 * const off = emitter.on('click', (payload) => {
 *   console.log('点击位置:', payload.position);
 *   console.log('屏幕坐标:', payload.windowPosition);
 * });
 * 
 * // 取消订阅
 * off();
 * 
 * // 销毁发射器
 * emitter.destroy();
 * ```
 */
export class ScreenSpaceEmitter {
  /** Cesium 屏幕空间事件处理器实例 */
  private _handler: Cesium.ScreenSpaceEventHandler | null;
  
  /** Cesium 场景对象 */
  private _scene: Cesium.Scene;
  
  /** 事件监听器映射表，存储各事件类型的监听器集合 */
  private _listeners: Map<keyof TypedEvents, Set<Function>> = new Map();

  /**
   * 创建屏幕空间事件发射器实例
   * 
   * @param {NativeScene} scene - Cesium 场景对象
   * @param {HTMLCanvasElement} canvas - 用于事件监听的画布元素
   */
  constructor(scene: NativeScene, canvas: HTMLCanvasElement) {
    this._scene = scene as unknown as Cesium.Scene;
    this._handler = new Cesium.ScreenSpaceEventHandler(canvas);
    this._initProxy();
  }

  /**
   * 初始化事件代理
   * 
   * @description
   * 设置各种屏幕空间事件的监听器，将 Cesium 原生事件转换为标准化格式。
   * 支持的事件类型包括：
   * - LEFT_CLICK: 鼠标左键点击
   * - LEFT_DOUBLE_CLICK: 鼠标左键双击
   * - LEFT_DOWN: 鼠标左键按下
   * - LEFT_UP: 鼠标左键抬起
   * - RIGHT_CLICK: 鼠标右键点击
   * - MOUSE_MOVE: 鼠标移动
   */
  private _initProxy() {
    if (!this._handler) return;

    // 鼠标左键点击事件
    this._handler.setInputAction((e: Cesium.ScreenSpaceEventHandler.PositionedEvent) => {
      this._emit('click', e.position);
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

    // 鼠标左键双击事件
    this._handler.setInputAction((e: Cesium.ScreenSpaceEventHandler.PositionedEvent) => {
      this._emit('dblclick', e.position);
    }, Cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK);

    // 鼠标左键按下事件
    this._handler.setInputAction((e: Cesium.ScreenSpaceEventHandler.PositionedEvent) => {
      this._emit('mousedown', e.position);
    }, Cesium.ScreenSpaceEventType.LEFT_DOWN);

    // 鼠标左键抬起事件
    this._handler.setInputAction((e: Cesium.ScreenSpaceEventHandler.PositionedEvent) => {
      this._emit('mouseup', e.position);
    }, Cesium.ScreenSpaceEventType.LEFT_UP);

    // 鼠标右键点击事件
    this._handler.setInputAction((e: Cesium.ScreenSpaceEventHandler.PositionedEvent) => {
      this._emit('rightclick', e.position);
    }, Cesium.ScreenSpaceEventType.RIGHT_CLICK);

    // 鼠标移动事件 - 需要特殊处理，包含起始和结束位置
    this._handler.setInputAction((e: Cesium.ScreenSpaceEventHandler.MotionEvent) => {
      const handlers = this._listeners.get('mousemove');
      if (!handlers || handlers.size === 0) return;
      
      // 尝试获取移动起始和结束位置的地理坐标
      let cart3Start, cart3End;
      if (this._scene.pickPositionSupported) {
        // 优先使用 pickPosition 获取精确位置（包括地形和模型上的位置）
        cart3Start = this._scene.pickPosition(e.startPosition);
        cart3End = this._scene.pickPosition(e.endPosition);
      }
      if (!cart3Start && this._scene.camera) {
        // 如果 pickPosition 失败，使用 pickEllipsoid 获取椭球面上的位置
        cart3Start = this._scene.camera.pickEllipsoid(e.startPosition);
        cart3End = this._scene.camera.pickEllipsoid(e.endPosition);
      }
      
      // 转换为经纬度坐标
      const startPosition = cart3Start ? fromCartesian3(cart3Start as any) : { lng: 0, lat: 0, alt: 0 };
      const endPosition = cart3End ? fromCartesian3(cart3End as any) : { lng: 0, lat: 0, alt: 0 };
      
      // 构建事件负载对象
      const payload: TypedEvents['mousemove'] = {
        startPosition,
        endPosition,
        windowPosition: { x: e.endPosition.x, y: e.endPosition.y }
      };

      // 触发所有注册的监听器
      for (const h of handlers) {
        try { h(payload); } catch (err) { console.error(err); }
      }
    }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);
  }

  /**
   * 发射屏幕空间事件
   * 
   * @description
   * 将屏幕坐标转换为地理坐标，并触发所有注册的监听器。
   * 转换优先级：
   * 1. 使用 scene.pickPosition 获取精确位置（支持地形和模型）
   * 2. 使用 camera.pickEllipsoid 获取椭球面上的位置
   * 
   * @param {keyof TypedEvents} type - 事件类型
   * @param {Cesium.Cartesian2} windowPos - 屏幕窗口坐标
   */
  private _emit(type: keyof TypedEvents, windowPos: Cesium.Cartesian2) {
    const handlers = this._listeners.get(type);
    if (!handlers || handlers.size === 0) return;

    // 尝试获取屏幕坐标对应的地理坐标
    let cart3;
    if (this._scene.pickPositionSupported) {
       cart3 = this._scene.pickPosition(windowPos);
    }
    if (!cart3 && this._scene.camera) {
       cart3 = this._scene.camera.pickEllipsoid(windowPos);
    }
    
    // 转换为经纬度坐标，如果转换失败则返回默认值
    const position = cart3 ? fromCartesian3(cart3 as any) : { lng: 0, lat: 0, alt: 0 };

    // 构建事件负载对象
    const payload = {
      position,
      windowPosition: { x: windowPos.x, y: windowPos.y }
    };

    // 触发所有注册的监听器
    for (const h of handlers) {
      try { h(payload); } catch (err) { console.error(err); }
    }
  }

  /**
   * 订阅屏幕空间事件
   * 
   * @description
   * 注册一个事件监听器，当指定类型的事件发生时会被调用。
   * 返回一个取消订阅函数，调用它可以移除该监听器。
   * 
   * @typeParam K - 事件类型键名
   * @param {K} event - 事件类型名称
   * @param {(payload: TypedEvents[K]) => void} handler - 事件处理函数
   * @returns {Off} 取消订阅函数
   * 
   * @example
   * ```typescript
   * const off = emitter.on('click', (payload) => {
   *   console.log('点击位置:', payload.position);
   * });
   * 
   * // 取消订阅
   * off();
   * ```
   */
  on<K extends keyof TypedEvents>(event: K, handler: (payload: TypedEvents[K]) => void): Off {
    if (!this._listeners.has(event)) {
      this._listeners.set(event, new Set());
    }
    this._listeners.get(event)!.add(handler);

    // 返回取消订阅函数
    return () => {
      const set = this._listeners.get(event);
      if (set) {
        set.delete(handler);
      }
    };
  }

  /**
   * 销毁事件发射器
   * 
   * @description
   * 清理所有事件监听器并销毁 Cesium ScreenSpaceEventHandler 实例。
   * 调用此方法后，发射器将不再响应任何事件。
   */
  destroy() {
    this._listeners.clear();
    if (this._handler) {
      this._handler.destroy();
      this._handler = null;
    }
  }
}