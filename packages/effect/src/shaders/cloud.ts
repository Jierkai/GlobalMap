/**
 * @fileoverview 云天 GLSL Fragment Shader
 *
 * @module effect/shaders/cloud
 */

/**
 * 云天后处理 Fragment Shader
 *
 * @description
 * 使用分形噪声在屏幕空间生成体积云效果。
 * 云层在指定高度范围内渲染，随时间缓慢漂移。
 *
 * **Uniform 参数：**
 * - `u_intensity` (float) — 云层强度 0~1
 * - `u_opacity` (float) — 整体透明度 0~1
 * - `u_time` (float) — 动画时间（秒）
 * - `u_coverage` (float) — 云层覆盖率 0~1
 * - `u_cloudColor` (vec3) — 云颜色 RGB
 * - `u_driftSpeed` (float) — 云层漂移速度
 */
export const CLOUD_FRAGMENT_SHADER = /* glsl */ `
uniform sampler2D colorTexture;
uniform sampler2D depthTexture;
uniform float u_intensity;
uniform float u_opacity;
uniform float u_time;
uniform float u_coverage;
uniform vec3 u_cloudColor;
uniform float u_driftSpeed;

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

// 分形布朗运动
float fbm(vec2 p) {
  float value = 0.0;
  float amplitude = 0.5;
  float frequency = 1.0;
  for (int i = 0; i < 5; i++) {
    value += amplitude * noise(p * frequency);
    frequency *= 2.0;
    amplitude *= 0.5;
  }
  return value;
}

void main() {
  vec4 sceneColor = texture2D(colorTexture, v_textureCoordinates);
  float depth = czm_readDepth(depthTexture, v_textureCoordinates);

  vec2 uv = v_textureCoordinates;

  // 时间驱动的漂移
  vec2 drift = vec2(u_time * u_driftSpeed * 0.01, u_time * u_driftSpeed * 0.005);

  // 多层云噪声
  vec2 cloudUV = uv * 3.0 + drift;
  float cloudNoise = fbm(cloudUV);

  // 覆盖率控制阈值
  float threshold = 1.0 - u_coverage;
  float cloud = smoothstep(threshold, threshold + 0.15, cloudNoise);

  // 云层细节（更高频率的噪声）
  float detail = fbm(uv * 8.0 + drift * 1.5);
  cloud *= smoothstep(0.3, 0.7, detail);

  // 边缘衰减
  float edgeFade = smoothstep(0.0, 0.2, uv.x) * smoothstep(1.0, 0.8, uv.x)
                 * smoothstep(0.0, 0.2, uv.y) * smoothstep(1.0, 0.8, uv.y);

  // 天空区域云更明显，地面区域云较淡
  float depthFade = depth >= 1.0 ? 1.0 : 0.3;

  // 最终云层强度
  float cloudAlpha = cloud * u_intensity * u_opacity * edgeFade * depthFade;

  // 云的颜色（带光照变化）
  float lightness = 0.8 + 0.2 * fbm(uv * 2.0 + drift * 0.5);
  vec3 litCloudColor = u_cloudColor * lightness;

  // 混合云层与场景
  vec3 finalColor = mix(sceneColor.rgb, litCloudColor, cloudAlpha);

  gl_FragColor = vec4(finalColor, sceneColor.a);
}
`;
