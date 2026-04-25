/**
 * @module @cgx/ui/Tooltip
 *
 * Tooltip 组件实现。
 */

import { signal, type Signal, type ReadonlySignal, type Off } from '@cgx/reactive';
import { TypedEmitter } from '@cgx/core';
import type { Tooltip, TooltipOptions, TooltipEvents, ContentSource } from './types';

class TooltipImpl implements Tooltip {
  readonly element: HTMLElement;
  private readonly _visible: Signal<boolean>;
  private readonly emitter = new TypedEmitter<TooltipEvents>();
  private readonly _showDelay: number;
  private readonly _hideDelay: number;
  private _showTimer: ReturnType<typeof setTimeout> | null = null;
  private _hideTimer: ReturnType<typeof setTimeout> | null = null;
  private _destroyed = false;

  constructor(opts: TooltipOptions) {
    this.element = document.createElement('div');
    this.element.className = `cgx-tooltip ${opts.className ?? ''}`.trim();
    this.element.style.position = 'absolute';
    this.element.style.display = 'none';
    this.element.style.zIndex = '1001';
    this.element.style.pointerEvents = 'none';

    this._visible = signal(false);
    this._showDelay = opts.showDelay ?? 200;
    this._hideDelay = opts.hideDelay ?? 100;

    this.setContent(opts.content);
  }

  get visible(): ReadonlySignal<boolean> {
    return this._visible as unknown as ReadonlySignal<boolean>;
  }

  get destroyed(): boolean {
    return this._destroyed;
  }

  show(target: HTMLElement): void {
    this.assertNotDestroyed();
    this.clearTimers();

    this._showTimer = setTimeout(() => {
      const rect = target.getBoundingClientRect();
      this.element.style.left = `${rect.left + rect.width / 2}px`;
      this.element.style.top = `${rect.top}px`;
      this.element.style.transform = 'translate(-50%, -100%)';
      this.element.style.display = 'block';
      this._visible.set(true);
      this.emitter.emit('shown', {});
    }, this._showDelay);
  }

  hide(): void {
    this.assertNotDestroyed();
    this.clearTimers();

    this._hideTimer = setTimeout(() => {
      this.element.style.display = 'none';
      this._visible.set(false);
      this.emitter.emit('hidden', {});
    }, this._hideDelay);
  }

  updateContent(content: ContentSource): void {
    this.assertNotDestroyed();
    this.setContent(content);
  }

  on<K extends keyof TooltipEvents>(event: K, handler: (payload: TooltipEvents[K]) => void): Off {
    return this.emitter.on(event, handler);
  }

  off<K extends keyof TooltipEvents>(event: K, handler?: (payload: TooltipEvents[K]) => void): void {
    this.emitter.off(event, handler);
  }

  destroy(): void {
    if (this._destroyed) return;
    this._destroyed = true;
    this.clearTimers();
    this.element.remove();
    this._visible.set(false);
  }

  private assertNotDestroyed(): void {
    if (this._destroyed) {
      throw new Error('Tooltip has been destroyed');
    }
  }

  private clearTimers(): void {
    if (this._showTimer !== null) {
      clearTimeout(this._showTimer);
      this._showTimer = null;
    }
    if (this._hideTimer !== null) {
      clearTimeout(this._hideTimer);
      this._hideTimer = null;
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
}

/**
 * 创建一个 Tooltip 实例。
 */
export function createTooltip(opts: TooltipOptions): Tooltip {
  return new TooltipImpl(opts);
}
