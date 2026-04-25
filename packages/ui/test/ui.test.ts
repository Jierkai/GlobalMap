/**
 * @cgx/ui 单元测试
 *
 * 覆盖：
 * - createPopup 创建/显示/隐藏/销毁
 * - createTooltip 创建/显示/隐藏/销毁
 * - createContextMenu 创建/显示/隐藏/销毁
 * - 事件派发
 */

import { describe, it, expect, vi } from 'vitest';
import { createPopup } from '../src/Popup';
import { createTooltip } from '../src/Tooltip';
import { createContextMenu } from '../src/ContextMenu';

// ---------------------------------------------------------------------------
// Popup
// ---------------------------------------------------------------------------

describe('createPopup', () => {
  it('创建 Popup 实例', () => {
    const popup = createPopup({ content: 'Hello' });
    expect(popup.element).toBeDefined();
    expect(popup.visible.get()).toBe(false);
    expect(popup.destroyed).toBe(false);
  });

  it('show 显示 Popup', () => {
    const popup = createPopup({ content: 'Hello' });
    popup.show();
    expect(popup.visible.get()).toBe(true);
  });

  it('hide 隐藏 Popup', () => {
    const popup = createPopup({ content: 'Hello' });
    popup.show();
    popup.hide();
    expect(popup.visible.get()).toBe(false);
  });

  it('updatePosition 更新位置', () => {
    const popup = createPopup({ content: 'Hello', position: { x: 0, y: 0 } });
    popup.updatePosition({ x: 100, y: 200 });
    expect(popup.position.get()).toEqual({ x: 100, y: 200 });
  });

  it('updateContent 更新内容', () => {
    const popup = createPopup({ content: 'Hello' });
    popup.updateContent('World');
    expect(popup.element.textContent).toBe('World');
  });

  it('destroy 销毁', () => {
    const popup = createPopup({ content: 'Hello' });
    popup.destroy();
    expect(popup.destroyed).toBe(true);
    expect(popup.visible.get()).toBe(false);
  });

  it('destroy 后操作抛异常', () => {
    const popup = createPopup({ content: 'Hello' });
    popup.destroy();
    expect(() => popup.show()).toThrow('destroyed');
  });

  it('opened 事件', () => {
    const popup = createPopup({ content: 'Hello' });
    const handler = vi.fn();
    popup.on('opened', handler);
    popup.show();
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('closed 事件', () => {
    const popup = createPopup({ content: 'Hello' });
    const handler = vi.fn();
    popup.on('closed', handler);
    popup.show();
    popup.hide();
    expect(handler).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// Tooltip
// ---------------------------------------------------------------------------

describe('createTooltip', () => {
  it('创建 Tooltip 实例', () => {
    const tooltip = createTooltip({ content: 'Tip' });
    expect(tooltip.element).toBeDefined();
    expect(tooltip.visible.get()).toBe(false);
    expect(tooltip.destroyed).toBe(false);
  });

  it('destroy 销毁', () => {
    const tooltip = createTooltip({ content: 'Tip' });
    tooltip.destroy();
    expect(tooltip.destroyed).toBe(true);
  });

  it('destroy 后操作抛异常', () => {
    const tooltip = createTooltip({ content: 'Tip' });
    tooltip.destroy();
    expect(() => tooltip.show(document.createElement('div'))).toThrow('destroyed');
  });

  it('updateContent 更新内容', () => {
    const tooltip = createTooltip({ content: 'Tip' });
    tooltip.updateContent('New Tip');
    expect(tooltip.element.textContent).toBe('New Tip');
  });
});

// ---------------------------------------------------------------------------
// ContextMenu
// ---------------------------------------------------------------------------

describe('createContextMenu', () => {
  it('创建 ContextMenu 实例', () => {
    const menu = createContextMenu({
      items: [
        { label: 'Copy', action: () => {} },
        { label: 'Paste', action: () => {} },
      ],
    });
    expect(menu.element).toBeDefined();
    expect(menu.visible.get()).toBe(false);
    expect(menu.destroyed).toBe(false);
  });

  it('show 显示菜单', () => {
    const menu = createContextMenu({ items: [{ label: 'Test' }] });
    menu.show({ x: 100, y: 200 });
    expect(menu.visible.get()).toBe(true);
  });

  it('hide 隐藏菜单', () => {
    const menu = createContextMenu({ items: [{ label: 'Test' }] });
    menu.show({ x: 100, y: 200 });
    menu.hide();
    expect(menu.visible.get()).toBe(false);
  });

  it('updateItems 更新菜单项', () => {
    const menu = createContextMenu({ items: [{ label: 'Old' }] });
    menu.updateItems([{ label: 'New' }]);
    expect(menu.element.children.length).toBe(1);
  });

  it('destroy 销毁', () => {
    const menu = createContextMenu({ items: [{ label: 'Test' }] });
    menu.destroy();
    expect(menu.destroyed).toBe(true);
  });

  it('destroy 后操作抛异常', () => {
    const menu = createContextMenu({ items: [{ label: 'Test' }] });
    menu.destroy();
    expect(() => menu.show({ x: 0, y: 0 })).toThrow('destroyed');
  });

  it('opened 事件', () => {
    const menu = createContextMenu({ items: [{ label: 'Test' }] });
    const handler = vi.fn();
    menu.on('opened', handler);
    menu.show({ x: 50, y: 50 });
    expect(handler).toHaveBeenCalledWith({ position: { x: 50, y: 50 } });
  });

  it('item-clicked 事件', () => {
    const action = vi.fn();
    const menu = createContextMenu({
      items: [{ label: 'Click Me', action }],
    });
    const handler = vi.fn();
    menu.on('item-clicked', handler);
    menu.show({ x: 0, y: 0 });
    // 模拟点击
    const item = menu.element.querySelector('.cgx-context-menu-item') as HTMLElement;
    item.click();
    expect(action).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('divider 渲染分割线', () => {
    const menu = createContextMenu({
      items: [
        { label: 'A' },
        { divider: true, label: '' },
        { label: 'B' },
      ],
    });
    const dividers = menu.element.querySelectorAll('.cgx-context-menu-divider');
    expect(dividers.length).toBe(1);
  });

  it('disabled 项不可点击', () => {
    const action = vi.fn();
    const menu = createContextMenu({
      items: [{ label: 'Disabled', disabled: true, action }],
    });
    menu.show({ x: 0, y: 0 });
    const item = menu.element.querySelector('.cgx-context-menu-item') as HTMLElement;
    item.click();
    expect(action).not.toHaveBeenCalled();
  });
});
