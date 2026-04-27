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

// ---------------------------------------------------------------------------
// dashedLine — 虚线
// ---------------------------------------------------------------------------

/** 虚线材质 */
export const dashedLineMaterial = defineMaterial({
  id: 'dashedLine',
  name: 'Dashed Line',
  description: '支持动画偏移的虚线',
  uniforms: {
    color: { type: 'vec4', default: [1.0, 1.0, 1.0, 1.0], description: '虚线颜色' },
    dashLength: { type: 'float', default: 16.0, description: '虚线长度' },
    dashPattern: { type: 'float', default: 255.0, description: '虚线模式' },
    speed: { type: 'float', default: 0.0, description: '偏移速度' }
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
    uniform float dashLength;
    uniform float dashPattern;
    uniform float speed;
    varying vec2 v_st;
    void main() {
      float t = fract(v_st.s * dashLength - czm_frameNumber * speed * 0.01);
      float alpha = step(0.5, t);
      gl_FragColor = vec4(color.rgb, color.a * alpha);
    }
  `,
  transparent: true,
});

// ---------------------------------------------------------------------------
// glowingWall — 泛光立体墙
// ---------------------------------------------------------------------------

/** 泛光立体墙材质 */
export const glowingWallMaterial = defineMaterial({
  id: 'glowingWall',
  name: 'Glowing Wall',
  description: '渐变发光的立体墙面',
  uniforms: {
    color: { type: 'vec4', default: [0.0, 1.0, 0.5, 1.0], description: '发光颜色' },
    speed: { type: 'float', default: 1.0, description: '发光流动速度' },
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
    varying vec2 v_st;
    void main() {
      float gradient = v_st.t; // vertical gradient
      float flow = fract(czm_frameNumber * speed * 0.01 - v_st.s);
      float intensity = mix(gradient, flow, 0.3);
      gl_FragColor = vec4(color.rgb, color.a * intensity);
    }
  `,
  transparent: true,
});

// ---------------------------------------------------------------------------
// waterSurface — 动态水面纹理
// ---------------------------------------------------------------------------

/** 动态水面材质 */
export const waterSurfaceMaterial = defineMaterial({
  id: 'waterSurface',
  name: 'Water Surface',
  description: '动态水波纹面',
  uniforms: {
    baseWaterColor: { type: 'vec4', default: [0.2, 0.3, 0.6, 1.0], description: '水面基色' },
    blendColor: { type: 'vec4', default: [0.0, 1.0, 0.699, 1.0], description: '水面高亮色' },
    frequency: { type: 'float', default: 10.0, description: '波纹频率' },
    animationSpeed: { type: 'float', default: 0.01, description: '动画速度' },
    amplitude: { type: 'float', default: 1.0, description: '波浪幅度' },
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
    uniform vec4 baseWaterColor;
    uniform vec4 blendColor;
    uniform float frequency;
    uniform float animationSpeed;
    uniform float amplitude;
    varying vec2 v_st;
    void main() {
      float time = czm_frameNumber * animationSpeed;
      float wave = sin(v_st.s * frequency + time) * cos(v_st.t * frequency + time) * amplitude;
      vec4 color = mix(baseWaterColor, blendColor, wave * 0.5 + 0.5);
      gl_FragColor = vec4(color.rgb, color.a);
    }
  `,
  transparent: true,
});

// ---------------------------------------------------------------------------
// radarScan — 雷达扫描
// ---------------------------------------------------------------------------

/** 雷达扫描波面材质 */
export const radarScanMaterial = defineMaterial({
  id: 'radarScan',
  name: 'Radar Scan',
  description: '面状区域的雷达扫描波面',
  uniforms: {
    color: { type: 'vec4', default: [1.0, 0.0, 0.0, 1.0], description: '扫描颜色' },
    speed: { type: 'float', default: 3.0, description: '扫描速度' },
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
    varying vec2 v_st;
    void main() {
      vec2 center = vec2(0.5);
      vec2 uv = v_st - center;
      float dist = length(uv);
      float angle = atan(uv.y, uv.x);
      
      float time = czm_frameNumber * speed * 0.01;
      float scan = fract((angle + time) / 6.2831853);
      float alpha = smoothstep(0.0, 0.2, scan) * smoothstep(1.0, 0.8, scan);
      
      gl_FragColor = vec4(color.rgb, color.a * alpha * smoothstep(0.5, 0.49, dist));
    }
  `,
  transparent: true,
});

