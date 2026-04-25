/**
 * @module @cgx/material
 *
 * Cgx 材质系统（L3 Feature API）
 *
 * 通过 defineMaterial 注册材质，禁止硬编码全局表。
 * 每种材质独立导出，Tree-shakable。
 *
 * @example
 * ```ts
 * import { defineMaterial, flowLineMaterial } from '@cgx/material';
 *
 * // 使用内置材质
 * const mat = flowLineMaterial();
 * mat.setUniform('speed', 2.0);
 *
 * // 自定义材质
 * const myMaterial = defineMaterial({
 *   id: 'myEffect',
 *   name: 'My Effect',
 *   uniforms: { intensity: { type: 'float', default: 1.0 } },
 *   vertex: '...',
 *   fragment: '...',
 * });
 * ```
 */

export { defineMaterial } from './defineMaterial.js';
export {
  flowLineMaterial,
  pulseCircleMaterial,
  glowLineMaterial,
  gradientPolygonMaterial,
} from './builtins.js';

export type {
  MaterialDef,
  Material,
  MaterialFactory,
  UniformDef,
} from './types.js';
