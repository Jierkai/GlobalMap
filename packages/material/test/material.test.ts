/**
 * @cgx/material 单元测试
 *
 * 覆盖：
 * - defineMaterial 创建材质
 * - 内置材质工厂
 * - setUniform / resetUniforms
 * - dispose
 */

import { describe, it, expect } from 'vitest';
import { defineMaterial } from '../src/defineMaterial';
import {
  flowLineMaterial,
  pulseCircleMaterial,
  glowLineMaterial,
  gradientPolygonMaterial,
} from '../src/builtins';

// ---------------------------------------------------------------------------
// defineMaterial
// ---------------------------------------------------------------------------

describe('defineMaterial', () => {
  it('创建材质工厂', () => {
    const factory = defineMaterial({
      id: 'test',
      name: 'Test Material',
      uniforms: {
        intensity: { type: 'float', default: 1.0 },
      },
      vertex: 'void main() {}',
      fragment: 'void main() {}',
    });
    expect(typeof factory).toBe('function');
  });

  it('工厂创建材质实例', () => {
    const factory = defineMaterial({
      id: 'test',
      name: 'Test Material',
      uniforms: {
        intensity: { type: 'float', default: 1.0 },
        color: { type: 'vec4', default: [1, 0, 0, 1] },
      },
      vertex: 'void main() {}',
      fragment: 'void main() {}',
    });

    const mat = factory();
    expect(mat.id).toBe('test');
    expect(mat.uniforms['intensity']).toBe(1.0);
    expect(mat.uniforms['color']).toEqual([1, 0, 0, 1]);
    expect(mat.disposed).toBe(false);
  });

  it('setUniform 更新 uniform', () => {
    const factory = defineMaterial({
      id: 'test',
      name: 'Test',
      uniforms: { speed: { type: 'float', default: 1.0 } },
      vertex: '',
      fragment: '',
    });

    const mat = factory();
    mat.setUniform('speed', 2.5);
    expect(mat.uniforms['speed']).toBe(2.5);
  });

  it('setUniform 未知 uniform 抛异常', () => {
    const factory = defineMaterial({
      id: 'test',
      name: 'Test',
      uniforms: { speed: { type: 'float', default: 1.0 } },
      vertex: '',
      fragment: '',
    });

    const mat = factory();
    expect(() => mat.setUniform('unknown', 1)).toThrow('Unknown uniform');
  });

  it('resetUniforms 重置为默认值', () => {
    const factory = defineMaterial({
      id: 'test',
      name: 'Test',
      uniforms: { speed: { type: 'float', default: 1.0 } },
      vertex: '',
      fragment: '',
    });

    const mat = factory();
    mat.setUniform('speed', 5.0);
    mat.resetUniforms();
    expect(mat.uniforms['speed']).toBe(1.0);
  });

  it('dispose 销毁材质', () => {
    const factory = defineMaterial({
      id: 'test',
      name: 'Test',
      uniforms: { speed: { type: 'float', default: 1.0 } },
      vertex: '',
      fragment: '',
    });

    const mat = factory();
    mat.dispose();
    expect(mat.disposed).toBe(true);
  });

  it('dispose 后操作抛异常', () => {
    const factory = defineMaterial({
      id: 'test',
      name: 'Test',
      uniforms: { speed: { type: 'float', default: 1.0 } },
      vertex: '',
      fragment: '',
    });

    const mat = factory();
    mat.dispose();
    expect(() => mat.setUniform('speed', 1)).toThrow('disposed');
    expect(() => mat.resetUniforms()).toThrow('disposed');
  });

  it('重复 dispose 不抛异常', () => {
    const factory = defineMaterial({
      id: 'test',
      name: 'Test',
      uniforms: {},
      vertex: '',
      fragment: '',
    });

    const mat = factory();
    mat.dispose();
    mat.dispose();
  });
});

// ---------------------------------------------------------------------------
// 内置材质
// ---------------------------------------------------------------------------

describe('内置材质', () => {
  it('flowLineMaterial 创建实例', () => {
    const mat = flowLineMaterial();
    expect(mat.id).toBe('flowLine');
    expect(mat.uniforms['speed']).toBe(1.0);
    expect(mat.uniforms['color']).toEqual([0.0, 1.0, 0.5, 1.0]);
  });

  it('pulseCircleMaterial 创建实例', () => {
    const mat = pulseCircleMaterial();
    expect(mat.id).toBe('pulseCircle');
    expect(mat.uniforms['count']).toBe(3.0);
  });

  it('glowLineMaterial 创建实例', () => {
    const mat = glowLineMaterial();
    expect(mat.id).toBe('glowLine');
    expect(mat.uniforms['intensity']).toBe(2.0);
  });

  it('gradientPolygonMaterial 创建实例', () => {
    const mat = gradientPolygonMaterial();
    expect(mat.id).toBe('gradientPolygon');
    expect(mat.uniforms['innerColor']).toEqual([1.0, 0.5, 0.0, 0.8]);
  });

  it('每个工厂独立创建实例', () => {
    const mat1 = flowLineMaterial();
    const mat2 = flowLineMaterial();
    expect(mat1).not.toBe(mat2);
    mat1.setUniform('speed', 5.0);
    expect(mat2.uniforms['speed']).toBe(1.0);
  });
});
