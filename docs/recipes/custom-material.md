# Custom Material

Define and use custom materials with `defineMaterial`.

```ts
import { defineMaterial, flowLineMaterial } from '@cgx/material';

// Use built-in material
const flowMat = flowLineMaterial();
flowMat.setUniform('speed', 2.0);
flowMat.setUniform('color', [1.0, 0.0, 0.0, 1.0]);

// Define custom material
const myMaterial = defineMaterial({
  id: 'myGradient',
  name: 'Custom Gradient',
  description: 'A custom gradient material',
  uniforms: {
    startColor: { type: 'vec4', default: [1.0, 0.0, 0.0, 1.0] },
    endColor: { type: 'vec4', default: [0.0, 0.0, 1.0, 1.0] },
    speed: { type: 'float', default: 1.0 },
  },
  vertex: `
    varying vec2 v_st;
    void main() {
      v_st = czm_texCoord;
      gl_Position = czm_modelViewProjectionRelativeToEye * czm_computePosition();
    }
  `,
  fragment: `
    uniform vec4 startColor;
    uniform vec4 endColor;
    uniform float speed;
    varying vec2 v_st;
    void main() {
      float t = fract(v_st.x - czm_frameNumber * speed * 0.001);
      gl_FragColor = mix(startColor, endColor, t);
    }
  `,
  transparent: true,
});

// Create instance
const mat = myMaterial();
mat.setUniform('speed', 0.5);
```

## Built-in Materials

| Factory | ID | Description |
|---------|----|-------------|
| `flowLineMaterial()` | `flowLine` | Animated flow along path |
| `pulseCircleMaterial()` | `pulseCircle` | Expanding pulse rings |
| `glowLineMaterial()` | `glowLine` | Glowing line effect |
| `gradientPolygonMaterial()` | `gradientPolygon` | Center-to-edge gradient |
