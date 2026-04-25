# @cgx/material

## 功能
`material` 模块为三维要素提供丰富的材质和视觉特效封装。支持动态效果（如流水线、雷达波纹等）。

## 架构
采用灵活的 `defineMaterial` 的方式注册自定义材质，摒弃了硬编码全局表的做法，从而实现更好的模块 Tree-shaking 优化。
- **defineMaterial**: 核心工具函数，用于自定义材质着色器 (Shader) 和 Uniform。
- **内置特效**: 导出开箱即用的预设，例如 `flowLineMaterial`, `pulseCircleMaterial`, `glowLineMaterial` 等。

## 示例
```typescript
import { defineMaterial, flowLineMaterial } from '@cgx/material';

// 1. 使用预置的流水线材质
const mat = flowLineMaterial();
mat.setUniform('speed', 2.0);

// 2. 自定义注册一个发光材质
const myMaterial = defineMaterial({
  id: 'myEffect',
  name: 'Custom Glow Effect',
  uniforms: { intensity: { type: 'float', default: 1.0 } },
  vertex: '...', // GLSL
  fragment: '...', // GLSL
});

// 应用材质通常会挂载在 Feature 实例的 style 中
```
