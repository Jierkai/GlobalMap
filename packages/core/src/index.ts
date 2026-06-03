export {
  CgxViewer,
  getViewerRuntime,
  type CgxViewerOptions,
  type ViewerStatus,
  type TypedEvents,
} from './viewer/CgxViewer.js';

export {
  type BasemapSpecBase,
  type GaodeBasemapSpec,
  type BaiduBasemapSpec,
  type TiandituBasemapSpec,
  type BingBasemapSpec,
  type PresetBasemapSpec,
  type BasemapSpec,
  type SceneCenter,
  type SkyboxSources,
  type SceneBgType,
  type SceneOptions,
  type TerrainOptions,
  type ViewerOptions,
} from './types.js';

export { type Capability, CameraOps, ClockOps, InputOps } from './capability/Capability.js';
export { createVitalsHud, type VitalsHud, type VitalsConfig } from './vitals/VitalsHud.js';
export { MetricsBus, metricsBus, type MetricsHandler } from './vitals/MetricsBus.js';
export { CgxError, ErrorCodes } from './errors/CgxError.js';
export { TypedEmitter, type Emitter, type Off } from './typed-events/Emitter.js';
export {
  defineFsm,
  type FsmInstance,
  type FsmDefinition,
  type FsmTransition,
  type FsmHooks,
} from './fsm/Fsm.js';

// Spec module (engine-neutral)
export * from './spec/index.js';

// Handle contracts
export * from './handle/index.js';

// EngineAdapter contract (defined locally in core)
export type { EngineAdapter, PickResult } from './adapter/EngineAdapter.js';

export {
  type Point2D,
  type Constraint,
  type ConstraintContext,
  type SnapConfig,
  type SnapTarget,
  snapToEndpoint,
  snapToMidpoint,
  orthoConstraint,
  lengthLockConstraint,
  angleLockConstraint,
  composeConstraints,
} from './constraint/Constraint.js';
