/**
 * @fileoverview 天气特效模块入口
 * 导出所有天气效果类、管理器及组合组件
 *
 * @module effect
 */

// 天气效果类
export { RainWeatherEffect } from './rain';
export { SnowWeatherEffect } from './snow';
export { FogWeatherEffect } from './fog';
export { CloudWeatherEffect } from './cloud';
export type { CloudConfig } from './cloud';
export { LightningWeatherEffect } from './lightning';
export type { LightningConfig } from './lightning';

// 管理器
export { WeatherEffectManagerImpl } from './manager';

// 可组合组件
export { AnimationLoop } from './utils/animator';
export { CameraBinder } from './utils/camera-binder';
export { ScenePrimitiveManager } from './utils/scene-manager';
export { ParticleBatch } from './utils/particle-batch';
export type { ParticleBatchConfig } from './utils/particle-batch';
export { GLSLPostProcess } from './utils/glsl-post-process';
export type { GLSLPostProcessConfig } from './utils/glsl-post-process';

// GLSL 着色器源码
export { RAIN_FRAGMENT_SHADER } from './shaders/rain';
export { SNOW_FRAGMENT_SHADER } from './shaders/snow';
export { FOG_FRAGMENT_SHADER } from './shaders/fog';
export { CLOUD_FRAGMENT_SHADER } from './shaders/cloud';
export { LIGHTNING_FRAGMENT_SHADER } from './shaders/lightning';
