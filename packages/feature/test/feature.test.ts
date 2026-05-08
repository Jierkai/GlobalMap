import { describe, it, expect } from 'vitest';
import { effect } from '@cgx/reactive';
import { createFeature } from '../src/kinds/Feature.js';
import { createModelFeature, createPointFeature, createTextFeature } from '../src/kinds/factories.js';
import { toGeoJSON, fromGeoJSON } from '../src/geojson/index.js';

describe('Feature Factories', () => {
  it('should create point feature with appropriate capabilities', () => {
    const feature = createFeature('point', { 
      position: [100, 20], 
      pickable: true 
    });

    expect(feature.kind).toBe('point');
    expect('position' in feature).toBe(true);
    expect('positions' in feature).toBe(false);
    expect(feature.pickable!()).toBe(true);
    expect((feature as any).position()).toEqual([100, 20]);
  });

  it('should create polygon feature with appropriate capabilities', () => {
    const feature = createFeature('polygon', { 
      positions: [[100, 20], [101, 20], [101, 21], [100, 20]],
      highlightable: true
    });

    expect(feature.kind).toBe('polygon');
    expect('positions' in feature).toBe(true);
    expect('position' in feature).toBe(false);
    
    expect(feature.highlighted!()).toBe(false);
    feature.highlight!();
    expect(feature.highlighted!()).toBe(true);
  });
});

describe('Feature Styling', () => {
  it('should allow style patching and reactively update', () => {
    const feature = createFeature('point', { style: { color: 'red' } });
    
    let colorVal;
    const dispose = effect(() => {
      const style = feature.style.evaluate({});
      colorVal = style.color;
    });

    expect(colorVal).toBe('red');
    
    feature.style.patch({ color: 'blue', size: 10 });
    expect(colorVal).toBe('blue');
    expect(feature.style.evaluate({}).size).toBe(10);
    
    dispose();
  });

  it('should evaluate conditional styles correctly', () => {
    const feature = createFeature('point', { style: { color: 'red' } });
    
    feature.style.rules([
      { when: (ctx) => ctx.hover === true, style: { color: 'yellow', scale: 2 } },
      { when: (ctx) => ctx.selected === true, style: { color: 'green' } }
    ]);

    expect(feature.style.evaluate({})).toEqual({ color: 'red' });
    expect(feature.style.evaluate({ hover: true })).toEqual({ color: 'yellow', scale: 2 });
    // Note: later rules overwrite earlier rules if multiple conditions met (simple merge)
    expect(feature.style.evaluate({ hover: true, selected: true })).toEqual({ color: 'green', scale: 2 });
  });
});

describe('Feature GeoJSON Serialization', () => {
  it('should serialize and deserialize a point feature', () => {
    const original = createFeature('point', { 
      position: [110, 30], 
      properties: { name: 'test-point', value: 42 } 
    });

    const gj = toGeoJSON(original);
    
    expect(gj.type).toBe('Feature');
    expect((gj.geometry as any).type).toBe('Point');
    expect((gj.geometry as any).coordinates).toEqual([110, 30]);
    expect((gj.properties as any).name).toBe('test-point');

    const restored = fromGeoJSON(gj);
    expect(restored.kind).toBe('point');
    expect((restored as any).position()).toEqual([110, 30]);
    expect(restored.properties.name).toBe('test-point');
    expect(restored.properties.value).toBe(42);
  });

  it('should serialize and deserialize a polygon feature', () => {
    const coords = [[100, 0], [101, 0], [101, 1], [100, 1], [100, 0]];
    const original = createFeature('polygon', { 
      positions: coords,
      properties: { area: 100 }
    });

    const gj = toGeoJSON(original);
    expect((gj.geometry as any).type).toBe('Polygon');
    expect((gj.geometry as any).coordinates).toEqual([coords]);
    
    const restored = fromGeoJSON(gj);
    expect(restored.kind).toBe('polygon');
    expect((restored as any).positions()).toEqual(coords);
  });
});

describe('Model Features', () => {
  it('should expose renderMode in model render specs', () => {
    const feature = createModelFeature({
      id: 'model-1',
      position: [110, 30, 100],
      uri: '/assets/model.glb',
      renderMode: 'primitive',
    });

    expect(feature.toRenderSpec()).toMatchObject({
      id: 'model-1',
      kind: 'model',
      model: {
        uri: '/assets/model.glb',
        scale: 1,
        renderMode: 'primitive',
      },
    });
  });
});

describe('Feature Labels and Text', () => {
  it('should expose attached labels on regular feature render specs', () => {
    const feature = createPointFeature({
      id: 'point-with-label',
      position: [110, 30],
      label: { text: 'Station A', pixelOffset: [0, -16] },
      renderMode: 'primitive',
    });

    expect(feature.toRenderSpec()).toMatchObject({
      id: 'point-with-label',
      kind: 'point',
      renderMode: 'primitive',
      label: { text: 'Station A', pixelOffset: [0, -16] },
    });
  });

  it('should create independent text-only features', () => {
    const feature = createTextFeature({
      id: 'text-1',
      position: [110, 30, 50],
      text: 'Only text',
      font: '16px sans-serif',
    });

    expect(feature.kind).toBe('text');
    expect(feature.toRenderSpec()).toMatchObject({
      id: 'text-1',
      kind: 'text',
      position: [110, 30, 50],
      label: {
        text: 'Only text',
        font: '16px sans-serif',
        scale: 1,
      },
    });
  });
});
