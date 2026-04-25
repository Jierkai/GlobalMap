# @cgx/ui

## 功能
`ui` 模块是一个轻量且不依赖特定框架（Vanilla TS）的地图组件集合。包含常见的数据展示载体，如气泡窗口（Popup）、工具提示（Tooltip）和上下文菜单（Context Menu）。

## 架构
内部借助了如 `floating-ui` 来进行定位的精确计算。
- 提供简单的工厂函数实例化组件：`createPopup`, `createTooltip`, `createContextMenu`。
- 与引擎相互解耦，渲染层为原生 DOM 操作或可被 Vue/React 适配层拦截后渲染。

## 示例
```typescript
import { createPopup } from '@cgx/ui';

// 创建一个地图信息弹窗
const popup = createPopup({
  content: '<div style="padding:10px"><h4>点位信息</h4><p>描述内容...</p></div>',
  position: { x: 100, y: 200 }, // 屏幕坐标 或 与地图关联的某种定位方式
  placement: 'top',
});

// 显示弹窗
popup.show();

// 隐藏弹窗
// popup.hide();
```
