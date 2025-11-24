import { Vector } from './Vector.js';

/**
 * 힘 상태 Value Object
 * 힘과 토크를 관리한다.
 */
export class ForceState {
  constructor(force = new Vector(0, 0), torque = 0) {
    this.force = force;
    this.torque = torque;
  }

  copy() {
    return new ForceState(
      this.force.copy(),
      this.torque
    );
  }
}

