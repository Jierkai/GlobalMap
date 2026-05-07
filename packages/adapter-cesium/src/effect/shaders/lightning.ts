/**
 * @fileoverview 闪电 GLSL Fragment Shader
 *
 * @module effect/shaders/lightning
 */

/**
 * 闪电后处理 Fragment Shader
 *
 * @description
 * 在屏幕空间生成闪电闪烁效果。
 * 通过时间控制的亮度脉冲模拟闪电照亮整个场景。
 *
 * **Uniform 参数：**
 * - `u_intensity` (float) — 闪电强度 0~1
 * - `u_opacity` (float) — 整体透明度 0~1
 * - `u_time` (float) — 动画时间（秒）
 * - `u_flashProgress` (float) — 当前闪烁进度 0~1（0=未触发, 0~1=闪烁中）
 * - `u_flashColor` (vec3) — 闪电颜色 RGB
 * - `u_branchCount` (float) — 闪电分支数量（影响噪声复杂度）
 */
export const LIGHTNING_FRAGMENT_SHADER = /* glsl */ `
uniform sampler2D colorTexture;
uniform float u_intensity;
uniform float u_opacity;
uniform float u_time;
uniform float u_flashProgress;
uniform vec3 u_flashColor;
uniform float u_branchCount;

varying vec2 v_textureCoordinates;

// 伪随机哈希
float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

// 值噪声
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);

  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));

  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

// 闪电形状生成
float lightningShape(vec2 uv, float seed) {
  float shape = 0.0;
  float amplitude = 1.0;

  for (int i = 0; i < 4; i++) {
    float n = noise(vec2(uv.x * 10.0 + seed, uv.y * 3.0));
    shape += n * amplitude;
    amplitude *= 0.5;
    uv *= vec2(1.5, 0.8);
  }

  return shape;
}

void main() {
  vec4 sceneColor = texture2D(colorTexture, v_textureCoordinates);
  vec2 uv = v_textureCoordinates;

  // 未触发时直接输出场景颜色
  if (u_flashProgress <= 0.0) {
    gl_FragColor = sceneColor;
    return;
  }

  // 闪烁亮度曲线：快速亮起，缓慢衰减
  float flashBrightness = 0.0;
  if (u_flashProgress < 0.1) {
    // 快速亮起
    flashBrightness = smoothstep(0.0, 0.1, u_flashProgress);
  } else {
    // 指数衰减
    flashBrightness = exp(-(u_flashProgress - 0.1) * 5.0);
  }

  // 闪电分支形状
  float branchSeed = floor(u_time * 10.0);
  float shape = lightningShape(uv, branchSeed);

  // 分支数量影响噪声密度
  float branchDensity = 0.3 + u_branchCount * 0.1;
  float bolt = smoothstep(0.5 - branchDensity * 0.1, 0.5, shape);

  // 屏幕中心区域闪电更明显
  float centerGlow = 1.0 - length(uv - vec2(0.5, 0.3)) * 1.2;
  centerGlow = max(centerGlow, 0.0);

  // 组合：全局闪烁 + 局部闪电形状
  float globalFlash = flashBrightness * u_intensity * u_opacity * 0.6;
  float localBolt = bolt * flashBrightness * u_intensity * u_opacity * centerGlow;

  // 全局环境光变化（闪电照亮整个场景）
  vec3 ambientLight = u_flashColor * globalFlash;

  // 局部闪电高亮
  vec3 boltLight = u_flashColor * localBolt * 1.5;

  // 混合
  vec3 finalColor = sceneColor.rgb + ambientLight + boltLight;

  // 限制最大亮度
  finalColor = min(finalColor, vec3(1.0));

  gl_FragColor = vec4(finalColor, sceneColor.a);
}
`;
