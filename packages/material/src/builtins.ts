/**
 * @module @cgx/material/builtins
 *
 * 内置材质定义。
 *
 * 每种材质独立导出，Tree-shakable。
 * 禁止硬编码全局表。
 */

import { defineMaterial } from './defineMaterial';

// ---------------------------------------------------------------------------
// flowLine — 流光线
// ---------------------------------------------------------------------------

/** 流光线材质 */
export const flowLineMaterial = defineMaterial({
  id: 'flowLine',
  name: 'Flow Line',
  description: '沿路径流动的发光线条',
  uniforms: {
    speed: { type: 'float', default: 1.0, description: '流动速度' },
    color: { type: 'vec4', default: [0.0, 1.0, 0.5, 1.0], description: '线条颜色' },
    width: { type: 'float', default: 2.0, description: '线条宽度' },
  },
  vertex: `
    attribute vec3 position3DHigh;
    attribute vec3 position3DLow;
    attribute float batchId;
    varying vec2 v_st;
    void main() {
      vec4 p = czm_computePosition();
      v_st = czm_texCoord;
      gl_Position = czm_modelViewProjectionRelativeToEye * p;
    }
  `,
  fragment: `
    uniform float speed;
    uniform vec4 color;
    uniform float width;
    varying vec2 v_st;
    void main() {
      float t = fract(v_st.x - czm_frameNumber * speed * 0.001);
      float alpha = smoothstep(0.0, 0.1, t) * smoothstep(1.0, 0.9, t);
      gl_FragColor = vec4(color.rgb, color.a * alpha);
    }
  `,
  transparent: true,
});

// ---------------------------------------------------------------------------
// pulseCircle — 脉冲圆
// ---------------------------------------------------------------------------

/** 脉冲圆材质 */
export const pulseCircleMaterial = defineMaterial({
  id: 'pulseCircle',
  name: 'Pulse Circle',
  description: '扩散脉冲的圆形效果',
  uniforms: {
    color: { type: 'vec4', default: [1.0, 0.3, 0.0, 1.0], description: '脉冲颜色' },
    speed: { type: 'float', default: 1.0, description: '脉冲速度' },
    count: { type: 'float', default: 3.0, description: '脉冲环数' },
  },
  vertex: `
    attribute vec3 position3DHigh;
    attribute vec3 position3DLow;
    attribute float batchId;
    varying vec2 v_st;
    void main() {
      vec4 p = czm_computePosition();
      v_st = czm_texCoord;
      gl_Position = czm_modelViewProjectionRelativeToEye * p;
    }
  `,
  fragment: `
    uniform vec4 color;
    uniform float speed;
    uniform float count;
    varying vec2 v_st;
    void main() {
      float dist = length(v_st - vec2(0.5)) * 2.0;
      float t = fract(dist * count - czm_frameNumber * speed * 0.001);
      float alpha = smoothstep(0.0, 0.1, t) * (1.0 - dist);
      gl_FragColor = vec4(color.rgb, color.a * max(alpha, 0.0));
    }
  `,
  transparent: true,
});

// ---------------------------------------------------------------------------
// glowLine — 发光线
// ---------------------------------------------------------------------------

/** 发光线材质 */
export const glowLineMaterial = defineMaterial({
  id: 'glowLine',
  name: 'Glow Line',
  description: '带辉光效果的线条',
  uniforms: {
    color: { type: 'vec4', default: [0.0, 0.8, 1.0, 1.0], description: '发光颜色' },
    intensity: { type: 'float', default: 2.0, description: '发光强度' },
  },
  vertex: `
    attribute vec3 position3DHigh;
    attribute vec3 position3DLow;
    attribute float batchId;
    varying vec2 v_st;
    void main() {
      vec4 p = czm_computePosition();
      v_st = czm_texCoord;
      gl_Position = czm_modelViewProjectionRelativeToEye * p;
    }
  `,
  fragment: `
    uniform vec4 color;
    uniform float intensity;
    varying vec2 v_st;
    void main() {
      float dist = abs(v_st.y - 0.5) * 2.0;
      float glow = exp(-dist * intensity);
      gl_FragColor = vec4(color.rgb, color.a * glow);
    }
  `,
  transparent: true,
});

// ---------------------------------------------------------------------------
// gradientPolygon — 渐变多边形
// ---------------------------------------------------------------------------

/** 渐变多边形材质 */
export const gradientPolygonMaterial = defineMaterial({
  id: 'gradientPolygon',
  name: 'Gradient Polygon',
  description: '从中心向外渐变的多边形填充',
  uniforms: {
    innerColor: { type: 'vec4', default: [1.0, 0.5, 0.0, 0.8], description: '中心颜色' },
    outerColor: { type: 'vec4', default: [1.0, 0.5, 0.0, 0.0], description: '边缘颜色' },
  },
  vertex: `
    attribute vec3 position3DHigh;
    attribute vec3 position3DLow;
    attribute float batchId;
    varying vec2 v_st;
    void main() {
      vec4 p = czm_computePosition();
      v_st = czm_texCoord;
      gl_Position = czm_modelViewProjectionRelativeToEye * p;
    }
  `,
  fragment: `
    uniform vec4 innerColor;
    uniform vec4 outerColor;
    varying vec2 v_st;
    void main() {
      float dist = length(v_st - vec2(0.5)) * 2.0;
      vec4 color = mix(innerColor, outerColor, smoothstep(0.0, 1.0, dist));
      gl_FragColor = color;
    }
  `,
  transparent: true,
});
