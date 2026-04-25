export { createCgxViewer, type CgxViewer, type CgxViewerOptions, type ViewerStatus, type TypedEvents } from './viewer/CgxViewer.js';
export { type Capability, CameraOps, ClockOps, InputOps } from './capability/Capability.js';
export { createVitalsHud, type VitalsHud, type VitalsConfig } from './vitals/VitalsHud.js';
export { CgxError, ErrorCodes } from './errors/CgxError.js';
export { TypedEmitter, type Emitter, type Off } from './typed-events/Emitter.js';
export { defineFsm, type FsmInstance, type FsmDefinition, type FsmTransition, type FsmHooks } from './fsm/Fsm.js';
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
