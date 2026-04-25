/**
 * @module @cgx/ui/Popup
 *
 * Popup 组件实现。
 *
 * Vanilla TS 实现，不依赖任何框架。
 * 使用 floating-ui 做位置计算（首版简化实现）。
 */

import { signal, type Signal, type ReadonlySignal, type Off } from '@cgx/reactive';
import { TypedEmitter } from '@cgx/core';
import type { Popup, PopupOptions, PopupEvents, ContentSource, Position } from './types';

class PopupImpl implements Popup {
  readonly element: HTMLElement;
  private readonly _visible: Signal<boolean>;
  private readonly _position: Signal<Position>;
  private readonly emitter = new TypedEmitter<PopupEvents>();
  private _destroyed = false;

  constructor(opts: PopupOptions) {
    this.element = document.createElement('div');
    this.element.className = `cgx-popup ${opts.className ?? ''}`.trim();
    this.element.style.position = 'absolute';
    this.element.style.display = 'none';
    this.element.style.zIndex = '1000';

    this._visible = signal(false);
    this._position = signal(opts.position ?? { x: 0, y: 0 });

    this.setContent(opts.content);
    if (opts.position) {
      this.applyPosition(opts.position, opts.placement ?? 'top', opts.offset);
    }
  }

  get visible(): ReadonlySignal<boolean> {
    return this._visible as unknown as ReadonlySignal<boolean>;
  }

  get position(): ReadonlySignal<Position> {
    return this._position as unknown as ReadonlySignal<Position>;
  }

  get destroyed(): boolean {
    return this._destroyed;
  }

  show(): void {
    this.assertNotDestroyed();
    this.element.style.display = 'block';
    this._visible.set(true);
    this.emitter.emit('opened', {});
  }

  hide(): void {
    this.assertNotDestroyed();
    this.element.style.display = 'none';
    this._visible.set(false);
    this.emitter.emit('closed', {});
  }

  updatePosition(pos: Position): void {
    this.assertNotDestroyed();
    this._position.set(pos);
    this.element.style.left = `${pos.x}px`;
    this.element.style.top = `${pos.y}px`;
    this.emitter.emit('position-changed', { position: pos });
  }

  updateContent(content: ContentSource): void {
    this.assertNotDestroyed();
    this.setContent(content);
  }

  on<K extends keyof PopupEvents>(event: K, handler: (payload: PopupEvents[K]) => void): Off {
    return this.emitter.on(event, handler);
  }

  off<K extends keyof PopupEvents>(event: K, handler?: (payload: PopupEvents[K]) => void): void {
    this.emitter.off(event, handler);
  }

  destroy(): void {
    if (this._destroyed) return;
    this._destroyed = true;
    this.element.remove();
    this._visible.set(false);
  }

  private assertNotDestroyed(): void {
    if (this._destroyed) {
      throw new Error('Popup has been destroyed');
    }
  }

  private setContent(content: ContentSource): void {
    this.element.innerHTML = '';
    if (typeof content === 'string') {
      this.element.textContent = content;
    } else if (content instanceof HTMLElement) {
      this.element.appendChild(content);
    } else {
      this.element.appendChild(content());
    }
  }

  private applyPosition(pos: Position, placement: string, offset?: readonly [number, number]): void {
    const ox = offset?.[0] ?? 0;
    const oy = offset?.[1] ?? 0;

    switch (placement) {
      case 'top':
        this.element.style.left = `${pos.x + ox}px`;
        this.element.style.top = `${pos.y - oy}px`;
        this.element.style.transform = 'translate(-50%, -100%)';
        break;
      case 'bottom':
        this.element.style.left = `${pos.x + ox}px`;
        this.element.style.top = `${pos.y + oy}px`;
        this.element.style.transform = 'translate(-50%, 0)';
        break;
      case 'left':
        this.element.style.left = `${pos.x - ox}px`;
        this.element.style.top = `${pos.y + oy}px`;
        this.element.style.transform = 'translate(-100%, -50%)';
        break;
      case 'right':
        this.element.style.left = `${pos.x + ox}px`;
        this.element.style.top = `${pos.y + oy}px`;
        this.element.style.transform = 'translate(0, -50%)';
        break;
      default:
        this.element.style.left = `${pos.x + ox}px`;
        this.element.style.top = `${pos.y + oy}px`;
        break;
    }
  }
}

/**
 * 创建一个 Popup 实例。
 *
 * @param opts - Popup 配置
 * @returns Popup 实例
 */
export function createPopup(opts: PopupOptions): Popup {
  return new PopupImpl(opts);
}
