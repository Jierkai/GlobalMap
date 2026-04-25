/**
 * @module @cgx/material/defineMaterial
 *
 * 材质定义工厂。
 *
 * 通过 defineMaterial 注册材质，禁止硬编码全局表。
 * 每种材质独立导出，Tree-shakable。
 */

import type { MaterialDef, Material, MaterialFactory, UniformDef } from './types';

/**
 * 定义一种材质并返回工厂函数。
 *
 * @param def - 材质定义
 * @returns 材质工厂函数
 *
 * @example
 * ```ts
 * const flowLineMaterial = defineMaterial({
 *   id: 'flowLine',
 *   name: 'Flow Line',
 *   uniforms: {
 *     speed: { type: 'float', default: 1.0 },
 *     color: { type: 'vec4', default: [0.0, 1.0, 0.0, 1.0] },
 *   },
 *   vertex: '...',
 *   fragment: '...',
 *   transparent: true,
 * });
 *
 * const mat = flowLineMaterial();
 * mat.setUniform('speed', 2.0);
 * ```
 */
export function defineMaterial<K extends string>(
  def: MaterialDef<K>
): MaterialFactory<K> {
  return () => createMaterialInstance(def);
}

/** 创建材质运行时实例 */
function createMaterialInstance<K extends string>(def: MaterialDef<K>): Material<K> {
  // 初始化 uniform 值
  const uniformValues: Record<string, number | number[] | string> = {};
  for (const [name, uniformDef] of Object.entries(def.uniforms)) {
    uniformValues[name] = (uniformDef as UniformDef).default;
  }

  let _disposed = false;

  return {
    id: def.id,
    def,
    uniforms: uniformValues,

    setUniform(name: string, value: number | number[] | string): void {
      if (_disposed) throw new Error(`Material "${def.id}" has been disposed`);
      if (!(name in def.uniforms)) {
        throw new Error(`Unknown uniform "${name}" in material "${def.id}"`);
      }
      uniformValues[name] = value;
    },

    resetUniforms(): void {
      if (_disposed) throw new Error(`Material "${def.id}" has been disposed`);
      for (const [name, uniformDef] of Object.entries(def.uniforms)) {
        uniformValues[name] = (uniformDef as UniformDef).default;
      }
    },

    dispose(): void {
      if (_disposed) return;
      _disposed = true;
      for (const key of Object.keys(uniformValues)) {
        delete uniformValues[key];
      }
    },

    get disposed(): boolean {
      return _disposed;
    },
  };
}
