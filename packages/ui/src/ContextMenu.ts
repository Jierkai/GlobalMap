/**
 * @module @cgx/ui/ContextMenu
 *
 * ContextMenu 组件实现。
 */

import { signal, type Signal, type ReadonlySignal, type Off } from '@cgx/reactive';
import { TypedEmitter } from '@cgx/core';
import type { ContextMenu, ContextMenuOptions, ContextMenuEvents, MenuItem, Position } from './types';

class ContextMenuImpl implements ContextMenu {
  readonly element: HTMLElement;
  private readonly _visible: Signal<boolean>;
  private readonly emitter = new TypedEmitter<ContextMenuEvents>();
  private _items: ReadonlyArray<MenuItem>;
  private _destroyed = false;

  constructor(opts: ContextMenuOptions) {
    this.element = document.createElement('div');
    this.element.className = `cgx-context-menu ${opts.className ?? ''}`.trim();
    this.element.style.position = 'absolute';
    this.element.style.display = 'none';
    this.element.style.zIndex = '1002';

    this._visible = signal(false);
    this._items = opts.items;
    this.renderItems();
  }

  get visible(): ReadonlySignal<boolean> {
    return this._visible as unknown as ReadonlySignal<boolean>;
  }

  get destroyed(): boolean {
    return this._destroyed;
  }

  show(pos: Position): void {
    this.assertNotDestroyed();
    this.element.style.left = `${pos.x}px`;
    this.element.style.top = `${pos.y}px`;
    this.element.style.display = 'block';
    this._visible.set(true);
    this.emitter.emit('opened', { position: pos });
  }

  hide(): void {
    this.assertNotDestroyed();
    this.element.style.display = 'none';
    this._visible.set(false);
    this.emitter.emit('closed', {});
  }

  updateItems(items: ReadonlyArray<MenuItem>): void {
    this.assertNotDestroyed();
    this._items = items;
    this.renderItems();
  }

  on<K extends keyof ContextMenuEvents>(event: K, handler: (payload: ContextMenuEvents[K]) => void): Off {
    return this.emitter.on(event, handler);
  }

  off<K extends keyof ContextMenuEvents>(event: K, handler?: (payload: ContextMenuEvents[K]) => void): void {
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
      throw new Error('ContextMenu has been destroyed');
    }
  }

  private renderItems(): void {
    this.element.innerHTML = '';
    for (const item of this._items) {
      if (item.divider) {
        const divider = document.createElement('div');
        divider.className = 'cgx-context-menu-divider';
        divider.style.borderTop = '1px solid #e0e0e0';
        divider.style.margin = '4px 0';
        this.element.appendChild(divider);
        continue;
      }

      const el = document.createElement('div');
      el.className = 'cgx-context-menu-item';
      el.style.padding = '6px 12px';
      el.style.cursor = item.disabled ? 'not-allowed' : 'pointer';
      el.style.opacity = item.disabled ? '0.5' : '1';
      el.textContent = item.label;

      if (!item.disabled && item.action) {
        el.addEventListener('click', () => {
          item.action!();
          this.emitter.emit('item-clicked', { item });
          this.hide();
        });
      }

      this.element.appendChild(el);
    }
  }
}

/**
 * 创建一个 ContextMenu 实例。
 */
export function createContextMenu(opts: ContextMenuOptions): ContextMenu {
  return new ContextMenuImpl(opts);
}
