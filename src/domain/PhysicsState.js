import { MotionState } from './MotionState.js';
import { AngularState } from './AngularState.js';
import { MassProperties } from './MassProperties.js';

/**
 * 물리 상태 Value Object
 * 운동 상태, 각운동 상태, 질량 속성을 관리한다.
 */
export class PhysicsState {
  constructor(motionState, angularState, massProperties) {
    this.motionState = motionState;
    this.angularState = angularState;
    this.massProperties = massProperties;
  }

  copy() {
    return new PhysicsState(
      this.motionState.copy(),
      this.angularState.copy(),
      this.massProperties.copy()
    );
  }
}

