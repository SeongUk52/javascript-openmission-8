import { Vector } from './Vector.js';

/**
 * 운동 상태 Value Object
 * 위치, 속도, 가속도를 관리한다.
 */
export class MotionState {
  constructor(position = new Vector(0, 0), velocity = new Vector(0, 0), acceleration = new Vector(0, 0)) {
    this.position = position;
    this.velocity = velocity;
    this.acceleration = acceleration;
  }

  copy() {
    return new MotionState(
      this.position.copy(),
      this.velocity.copy(),
      this.acceleration.copy()
    );
  }
}

