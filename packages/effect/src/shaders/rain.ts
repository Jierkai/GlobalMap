/**
 * @fileoverview 雨天 GLSL Fragment Shader
 *
 * @module effect/shaders/rain
 */

/**
 * 雨天后处理 Fragment Shader
 *
 * @description
 * 通过屏幕空间噪声模拟雨滴下落效果。
 * 使用时间驱动的 UV 偏移和噪声函数生成动态雨丝纹理。
 *
 * **Uniform 参数：**
 * - `u_intensity` (float) — 雨量强度 0~1
 * - `u_speed` (float) — 雨滴下落速度倍率
 * - `u_opacity` (float) — 整体透明度 0~1
 * - `u_time` (float) — 动画时间（秒）
 * - `u_windSpeed` (float) — 风速（水平偏移）
 * - `u_dropColor` (vec3) — 雨滴颜色 RGB
 */
export const RAIN_FRAGMENT_SHADER = /* glsl */ `
uniform sampler2D colorTexture;
uniform float u_intensity;
uniform float u_speed;
uniform float u_opacity;
uniform float u_time;
uniform float u_windSpeed;
uniform vec3 u_dropColor;

varying vec2 v_textureCoordinates;

// 伪随机哈希函数
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

// 分形布朗运动（多层噪声叠加）
float fbm(vec2 p) {
  float value = 0.0;
  float amplitude = 0.5;
  for (int i = 0; i < 4; i++) {
    value += amplitude * noise(p);
    p *= 2.0;
    amplitude *= 0.5;
  }
  return value;
}

void main() {
  vec4 sceneColor = texture2D(colorTexture, v_textureCoordinates);
  vec2 uv = v_textureCoordinates;

  // 雨滴密度随强度增加
  float density = 80.0 + u_intensity * 200.0;

  // 时间驱动的 UV 偏移（模拟下落）
  float fallOffset = u_time * u_speed * 2.0;
  float windOffset = u_time * u_windSpeed * 0.3;

  // 拉伸 UV 产生雨丝形状（纵向拉长）
  vec2 rainUV = vec2(
    uv.x * density + windOffset,
    uv.y * density * 3.0 + fallOffset
  );

  // 多层噪声叠加产生随机雨丝
  float rain = fbm(rainUV);
  rain = smoothstep(0.4, 0.7, rain);

  // 边缘衰减（屏幕中心更明显，边缘减弱）
  float edgeFade = smoothstep(0.0, 0.15, uv.x) * smoothstep(1.0, 0.85, uv.x)
                 * smoothstep(0.0, 0.15, uv.y) * smoothstep(1.0, 0.85, uv.y);

  // 最终雨滴强度
  float dropAlpha = rain * u_intensity * u_opacity * edgeFade;

  // 混合雨滴颜色与场景颜色
  vec3 rainColor = mix(sceneColor.rgb, u_dropColor, dropAlpha * 0.6);

  // 添加高光（雨滴反射）
  float highlight = smoothstep(0.65, 0.75, rain) * u_intensity * 0.3;
  rainColor += vec3(highlight) * edgeFade;

  gl_FragColor = vec4(rainColor, sceneColor.a);
}
`;
