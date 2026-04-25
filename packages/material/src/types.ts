/**
 * @module @cgx/material/types
 *
 * 材质系统类型定义。
 *
 * 设计原则：
 * - 通过 defineMaterial 注册，禁止硬编码全局表
 * - 每种材质独立导出，Tree-shakable
 * - 零 Cesium 依赖（材质定义为纯数据）
 */

// ---------------------------------------------------------------------------
// 材质定义
// ---------------------------------------------------------------------------

/** 材质 uniform 定义 */
export interface UniformDef {
  /** uniform 类型 */
  readonly type: 'float' | 'vec2' | 'vec3' | 'vec4' | 'sampler2D' | 'int' | 'bool';
  /** 默认值 */
  readonly default: number | number[] | string;
  /** 描述 */
  readonly description?: string;
}

/** 材质定义 */
export interface MaterialDef<K extends string = string, U extends Record<string, UniformDef> = Record<string, UniformDef>> {
  /** 材质唯一标识 */
  readonly id: K;
  /** 材质名称 */
  readonly name: string;
  /** 描述 */
  readonly description?: string;
  /** uniform 定义 */
  readonly uniforms: U;
  /** 顶点着色器源码 */
  readonly vertex: string;
  /** 片段着色器源码 */
  readonly fragment: string;
  /** 是否透明 */
  readonly transparent?: boolean;
  /** 渲染顺序（越小越先渲染） */
  readonly renderOrder?: number;
}

/** 材质运行时实例 */
export interface Material<K extends string = string> {
  /** 材质 ID */
  readonly id: K;
  /** 材质定义 */
  readonly def: MaterialDef<K>;
  /** 当前 uniform 值 */
  readonly uniforms: Record<string, number | number[] | string>;
  /** 更新 uniform 值 */
  setUniform(name: string, value: number | number[] | string): void;
  /** 重置为默认值 */
  resetUniforms(): void;
  /** 销毁 */
  dispose(): void;
  /** 是否已销毁 */
  readonly disposed: boolean;
}

/** 材质工厂函数 */
export type MaterialFactory<K extends string = string> = () => Material<K>;
