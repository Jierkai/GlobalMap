/**
 * @module @cgx/ui
 *
 * Cgx UI 组件集（L3 Feature API）
 *
 * Vanilla TS 实现，不依赖任何框架。
 * 使用 floating-ui 做位置计算（首版简化实现）。
 *
 * @example
 * ```ts
 * import { createPopup, createTooltip, createContextMenu } from '@cgx/ui';
 *
 * const popup = createPopup({
 *   content: '<p>Hello World</p>',
 *   position: { x: 100, y: 200 },
 *   placement: 'top',
 * });
 * popup.show();
 * ```
 */

export { createPopup } from './Popup.js';
export { createTooltip } from './Tooltip.js';
export { createContextMenu } from './ContextMenu.js';

export type {
  Popup,
  PopupOptions,
  PopupEvents,
  PopupLifecycle,
  Tooltip,
  TooltipOptions,
  TooltipEvents,
  ContextMenu,
  ContextMenuOptions,
  ContextMenuEvents,
  MenuItem,
  ContentSource,
  Placement,
} from './types.js';
