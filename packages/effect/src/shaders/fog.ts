/**
 * @fileoverview 雾天 GLSL Fragment Shader
 *
 * @module effect/shaders/fog
 */

/**
 * 雾天后处理 Fragment Shader
 *
 * @description
 * 基于深度纹理实现距离雾效果。
 * 读取场景深度缓冲，根据距离线性/指数混合雾色。
 *
 * **Uniform 参数：**
 * - `u_intensity` (float) — 雾强度 0~1
 * - `u_density` (float) — 雾密度（控制衰减速率）
 * - `u_opacity` (float) — 整体透明度 0~1
 * - `u_fogColor` (vec3) — 雾颜色 RGB
 * - `u_minHeight` (float) — 雾底部高度（米）
 * - `u_maxHeight` (float) — 雾顶部高度（米）
 * - `u_cameraHeight` (float) — 相机高度（米）
 */
export const FOG_FRAGMENT_SHADER = /* glsl */ `
uniform sampler2D colorTexture;
uniform sampler2D depthTexture;
uniform float u_intensity;
uniform float u_density;
uniform float u_opacity;
uniform vec3 u_fogColor;
uniform float u_minHeight;
uniform float u_maxHeight;
uniform float u_cameraHeight;

varying vec2 v_textureCoordinates;

// 从深度纹理重建视距
float getDepthDistance(vec2 uv) {
  float depth = czm_readDepth(depthTexture, uv);
  vec4 eyeCoord = czm_windowToEyeCoordinates(gl_FragCoord.xy, depth);
  return -eyeCoord.z; // 视空间距离（正值）
}

void main() {
  vec4 sceneColor = texture2D(colorTexture, v_textureCoordinates);
  float depth = czm_readDepth(depthTexture, v_textureCoordinates);

  // 天空区域（深度为 1.0）不做雾处理
  if (depth >= 1.0) {
    gl_FragColor = sceneColor;
    return;
  }

  // 重建眼空间坐标
  vec4 eyeCoord = czm_windowToEyeCoordinates(gl_FragCoord.xy, depth);
  float distance = -eyeCoord.z;

  // 高度衰减：在雾层范围内雾最浓，范围外衰减
  float heightFactor = 1.0;
  if (u_cameraHeight < u_minHeight) {
    heightFactor = smoothstep(u_minHeight - 200.0, u_minHeight, u_cameraHeight);
  } else if (u_cameraHeight > u_maxHeight) {
    heightFactor = smoothstep(u_maxHeight + 200.0, u_maxHeight, u_cameraHeight);
  }

  // 指数雾衰减
  float fogFactor = 1.0 - exp(-u_density * distance * u_intensity);
  fogFactor = clamp(fogFactor, 0.0, 1.0) * u_opacity * heightFactor;

  // 距离近处雾较淡，远处雾较浓
  fogFactor *= smoothstep(0.0, 500.0, distance);

  // 混合雾色与场景色
  vec3 finalColor = mix(sceneColor.rgb, u_fogColor, fogFactor);

  gl_FragColor = vec4(finalColor, sceneColor.a);
}
`;
