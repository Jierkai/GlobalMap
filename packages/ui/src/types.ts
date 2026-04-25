/**
 * @module @cgx/ui/types
 *
 * UI 组件类型定义。
 *
 * 设计原则：
 * - Vanilla TS 实现，不依赖任何框架
 * - 使用 floating-ui 做位置计算
 * - 禁止继承基类（组合优于继承）
 */

import type { ReadonlySignal, Off } from '@cgx/reactive';
import type { Point2D } from '@cgx/core';

// ---------------------------------------------------------------------------
// 通用类型
// ---------------------------------------------------------------------------

/** 内容类型：字符串 / HTMLElement / 渲染函数 */
export type ContentSource = string | HTMLElement | (() => HTMLElement);

/** 位置坐标（屏幕坐标或经纬度） */
export type Position = Point2D;

/** 放置方向 */
export type Placement = 'top' | 'bottom' | 'left' | 'right' | 'auto';

/** Popup 生命周期模式 */
export type PopupLifecycle = 'pinned' | 'follow' | 'once';

// ---------------------------------------------------------------------------
// Popup
// ---------------------------------------------------------------------------

/** Popup 选项 */
export interface PopupOptions {
  /** 内容 */
  readonly content: ContentSource;
  /** 初始位置 */
  readonly position?: Position;
  /** 放置方向 */
  readonly placement?: Placement;
  /** 偏移量 [x, y] */
  readonly offset?: readonly [number, number];
  /** 生命周期模式 */
  readonly lifecycle?: PopupLifecycle;
  /** CSS 类名 */
  readonly className?: string;
}

/** Popup 事件 */
export interface PopupEvents {
  'opened': Record<string, never>;
  'closed': Record<string, never>;
  'position-changed': { readonly position: Position };
}

/** Popup 接口 */
export interface Popup {
  /** DOM 元素 */
  readonly element: HTMLElement;
  /** 是否可见（响应式） */
  readonly visible: ReadonlySignal<boolean>;
  /** 当前位置（响应式） */
  readonly position: ReadonlySignal<Position>;
  /** 显示 */
  show(): void;
  /** 隐藏 */
  hide(): void;
  /** 更新位置 */
  updatePosition(pos: Position): void;
  /** 更新内容 */
  updateContent(content: ContentSource): void;
  /** 订阅事件 */
  on<K extends keyof PopupEvents>(event: K, handler: (payload: PopupEvents[K]) => void): Off;
  /** 取消订阅 */
  off<K extends keyof PopupEvents>(event: K, handler?: (payload: PopupEvents[K]) => void): void;
  /** 销毁 */
  destroy(): void;
  /** 是否已销毁 */
  readonly destroyed: boolean;
}

// ---------------------------------------------------------------------------
// Tooltip
// ---------------------------------------------------------------------------

/** Tooltip 选项 */
export interface TooltipOptions {
  /** 内容 */
  readonly content: ContentSource;
  /** 放置方向 */
  readonly placement?: Placement;
  /** 偏移量 */
  readonly offset?: readonly [number, number];
  /** 显示延迟（毫秒） */
  readonly showDelay?: number;
  /** 隐藏延迟（毫秒） */
  readonly hideDelay?: number;
  /** CSS 类名 */
  readonly className?: string;
}

/** Tooltip 事件 */
export interface TooltipEvents {
  'shown': Record<string, never>;
  'hidden': Record<string, never>;
}

/** Tooltip 接口 */
export interface Tooltip {
  /** DOM 元素 */
  readonly element: HTMLElement;
  /** 是否可见（响应式） */
  readonly visible: ReadonlySignal<boolean>;
  /** 显示（绑定到目标元素） */
  show(target: HTMLElement): void;
  /** 隐藏 */
  hide(): void;
  /** 更新内容 */
  updateContent(content: ContentSource): void;
  /** 订阅事件 */
  on<K extends keyof TooltipEvents>(event: K, handler: (payload: TooltipEvents[K]) => void): Off;
  /** 取消订阅 */
  off<K extends keyof TooltipEvents>(event: K, handler?: (payload: TooltipEvents[K]) => void): void;
  /** 销毁 */
  destroy(): void;
  /** 是否已销毁 */
  readonly destroyed: boolean;
}

// ---------------------------------------------------------------------------
// ContextMenu
// ---------------------------------------------------------------------------

/** 菜单项 */
export interface MenuItem {
  /** 标签 */
  readonly label: string;
  /** 图标（可选） */
  readonly icon?: string;
  /** 点击回调 */
  readonly action?: () => void;
  /** 是否禁用 */
  readonly disabled?: boolean;
  /** 子菜单 */
  readonly children?: ReadonlyArray<MenuItem>;
  /** 分割线 */
  readonly divider?: boolean;
}

/** ContextMenu 选项 */
export interface ContextMenuOptions {
  /** 菜单项列表 */
  readonly items: ReadonlyArray<MenuItem>;
  /** CSS 类名 */
  readonly className?: string;
}

/** ContextMenu 事件 */
export interface ContextMenuEvents {
  'opened': { readonly position: Position };
  'closed': Record<string, never>;
  'item-clicked': { readonly item: MenuItem };
}

/** ContextMenu 接口 */
export interface ContextMenu {
  /** DOM 元素 */
  readonly element: HTMLElement;
  /** 是否可见（响应式） */
  readonly visible: ReadonlySignal<boolean>;
  /** 在指定位置显示 */
  show(pos: Position): void;
  /** 隐藏 */
  hide(): void;
  /** 更新菜单项 */
  updateItems(items: ReadonlyArray<MenuItem>): void;
  /** 订阅事件 */
  on<K extends keyof ContextMenuEvents>(event: K, handler: (payload: ContextMenuEvents[K]) => void): Off;
  /** 取消订阅 */
  off<K extends keyof ContextMenuEvents>(event: K, handler?: (payload: ContextMenuEvents[K]) => void): void;
  /** 销毁 */
  destroy(): void;
  /** 是否已销毁 */
  readonly destroyed: boolean;
}
