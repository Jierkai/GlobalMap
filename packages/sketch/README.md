# @cgx/sketch

## 功能
`sketch` 模块用于在地图场景中交互式地新建和绘制矢量图形。支持点、线、多边形、矩形、圆形等常用基础形状的标绘，以及自由绘制 (Freehand)。

## 架构
标绘工具被设计为有限状态机 (FSM)，经历 idle -> drawing -> finished 的状态。它们生成纯几何数据，并配合 `@cgx/history` 的 Command 实现记录。
- **Sketchers**: 提供 `createPolygonSketcher`, `createPolylineSketcher` 等工厂函数创建工具。
- **Commands**: 内置对增加顶点 `createAddVertexCommand`、移动顶点 `createMoveVertexCommand` 的处理指令。

## 示例
```typescript
import { createPolygonSketcher } from '@cgx/sketch';

// 实例化多边形绘制工具
const sketcher = createPolygonSketcher();

sketcher.start();

// 模拟用户的鼠标点击添加顶点
sketcher.addVertex({ x: 116.4, y: 39.9 });
sketcher.addVertex({ x: 116.5, y: 39.9 });
sketcher.addVertex({ x: 116.5, y: 40.0 });

// 结束标绘
const vertices = sketcher.complete();
console.log('最终坐标列表:', vertices);
```
