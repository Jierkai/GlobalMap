/**
 * @fileoverview 雪天 GLSL Fragment Shader
 *
 * @module effect/shaders/snow
 */

/**
 * 雪天后处理 Fragment Shader
 *
 * @description
 * 通过屏幕空间粒子模拟雪花飘落效果。
 * 使用多层噪声和旋转矩阵生成自然的雪花飘落动画。
 *
 * **Uniform 参数：**
 * - `u_intensity` (float) — 降雪强度 0~1
 * - `u_speed` (float) — 雪花下落速度倍率
 * - `u_opacity` (float) — 整体透明度 0~1
 * - `u_time` (float) — 动画时间（秒）
 * - `u_windSpeed` (float) — 风速（水平飘动）
 * - `u_flakeSize` (float) — 雪花尺寸缩放
 */
export const SNOW_FRAGMENT_SHADER = /* glsl */ `
uniform sampler2D colorTexture;
uniform float u_intensity;
uniform float u_speed;
uniform float u_opacity;
uniform float u_time;
uniform float u_windSpeed;
uniform float u_flakeSize;

varying vec2 v_textureCoordinates;

// 伪随机哈希
float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

// 2D 旋转矩阵
mat2 rotate2d(float angle) {
  float c = cos(angle);
  float s = sin(angle);
  return mat2(c, -s, s, c);
}

// 单层雪花粒子
float snowLayer(vec2 uv, float scale, float speed, float rotAngle) {
  uv = rotate2d(rotAngle) * uv;
  uv.y -= u_time * speed * u_speed;
  uv.x += sin(u_time * speed * 0.5 + uv.y * 3.0) * 0.05 * u_windSpeed;

  vec2 gridUV = uv * scale;
  vec2 cell = floor(gridUV);
  vec2 local = fract(gridUV) - 0.5;

  // 每个格子的随机偏移
  vec2 offset = vec2(
    hash(cell) - 0.5,
    hash(cell + vec2(31.0, 17.0)) - 0.5
  ) * 0.6;

  float dist = length(local - offset);
  float flakeSize = (0.02 + hash(cell + vec2(7.0, 13.0)) * 0.04) * u_flakeSize;

  // 雪花形状：圆形 + 微弱模糊
  float flake = smoothstep(flakeSize, flakeSize * 0.3, dist);

  // 闪烁效果
  float twinkle = 0.7 + 0.3 * sin(u_time * 2.0 + hash(cell) * 6.28);
  return flake * twinkle;
}

void main() {
  vec4 sceneColor = texture2D(colorTexture, v_textureCoordinates);
  vec2 uv = v_textureCoordinates;

  // 多层雪花叠加（不同大小、速度、旋转）
  float snow = 0.0;
  snow += snowLayer(uv, 15.0, 0.15, 0.1) * 0.5;
  snow += snowLayer(uv, 25.0, 0.25, -0.15) * 0.3;
  snow += snowLayer(uv, 40.0, 0.35, 0.05) * 0.2;

  // 边缘衰减
  float edgeFade = smoothstep(0.0, 0.1, uv.x) * smoothstep(1.0, 0.9, uv.x)
                 * smoothstep(0.0, 0.1, uv.y) * smoothstep(1.0, 0.9, uv.y);

  // 最终雪花强度
  float snowAlpha = snow * u_intensity * u_opacity * edgeFade;

  // 混合白色雪花与场景
  vec3 snowColor = mix(sceneColor.rgb, vec3(1.0), snowAlpha * 0.7);

  // 雪花高光
  float highlight = snowAlpha * 0.2;
  snowColor += vec3(highlight);

  gl_FragColor = vec4(snowColor, sceneColor.a);
}
`;
